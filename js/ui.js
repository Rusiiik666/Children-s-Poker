const game = new PokerGame();
const AI_DELAY = 1200;

function renderCard(card, faceDown) {
  if (card === undefined || card === null) {
    return '<div class="card empty"></div>';
  }
  if (faceDown) {
    return '<div class="card back"></div>';
  }
  const info = cardDisplay(card);
  return `<div class="card" style="color: ${info.color}">
    <div class="card-corner top-left">
      <span class="card-rank">${info.rank}</span>
      <span class="card-suit">${info.suit}</span>
    </div>
    <div class="card-center">${info.suit}</div>
    <div class="card-corner bottom-right">
      <span class="card-rank">${info.rank}</span>
      <span class="card-suit">${info.suit}</span>
    </div>
  </div>`;
}

function formatAiAction(action) {
  if (!action) return '';
  const act = action.action;
  if (act === 'fold') return 'folded';
  if (act === 'check') return 'checked';
  if (act === 'call') return 'called';
  if (act === 'all-in') return 'ALL-IN!';
  return `raised to $${action.amount}`;
}

function render() {
  const playerCardsEl = document.getElementById('player-cards');
  const aiCardsEl = document.getElementById('ai-cards');
  const communityEl = document.getElementById('community-cards');
  const potEl = document.getElementById('pot-value');
  const playerStackEl = document.getElementById('player-stack');
  const aiStackEl = document.getElementById('ai-stack');
  const statusEl = document.getElementById('game-status');
  const playerHandEl = document.getElementById('player-hand-name');
  const aiHandEl = document.getElementById('ai-hand-name');
  const aiThinkingEl = document.getElementById('ai-thinking');
  const controlsEl = document.getElementById('controls');
  const playerActionEl = document.getElementById('player-action');
  const aiActionEl = document.getElementById('ai-action');

  const showAiCards = game.state === GameState.SHOWDOWN || game.aiFolded;

  aiCardsEl.innerHTML = game.aiHand.map(c => renderCard(c, !showAiCards && game.state !== GameState.IDLE)).join('');
  playerCardsEl.innerHTML = game.playerHand.map(c => renderCard(c, game.state === GameState.IDLE)).join('');

  communityEl.innerHTML = '';
  for (let i = 0; i < 5; i++) {
    communityEl.innerHTML += i < game.communityCards.length
      ? renderCard(game.communityCards[i], false)
      : '<div class="card empty"></div>';
  }

  potEl.textContent = game.pot;
  playerStackEl.textContent = game.playerStack;
  aiStackEl.textContent = game.aiStack;

  playerActionEl.textContent = game.lastAction ? `You ${game.lastAction}` : '';
  aiActionEl.textContent = game.aiAction ? `AI ${formatAiAction(game.aiAction)}` : '';

  if (game.state === GameState.IDLE) {
    statusEl.textContent = 'Press "New Hand" to start';
    controlsEl.innerHTML = `<button class="ctrl-btn" onclick="uiStartHand()">New Hand</button>`;
    aiThinkingEl.textContent = '';
    playerHandEl.textContent = '';
    aiHandEl.textContent = '';
    aiCardsEl.innerHTML = '<div class="card empty"></div><div class="card empty"></div>';
    playerCardsEl.innerHTML = '<div class="card empty"></div><div class="card empty"></div>';
    communityEl.innerHTML = Array(5).fill('<div class="card empty"></div>').join('');
    playerActionEl.textContent = '';
    aiActionEl.textContent = '';
    return;
  }

  if (game.state === GameState.WAITING_BLIND) {
    statusEl.textContent = 'Post blinds to begin';
    controlsEl.innerHTML = `<button class="ctrl-btn" onclick="uiPostBlind()">Post Blinds ($${SMALL_BLIND}/$${BIG_BLIND})</button>`;
    aiThinkingEl.textContent = '';
    return;
  }

  playerHandEl.textContent = !game.handOver && game.communityCards.length >= 3
    ? evaluateHand(game.playerHand, game.communityCards).name
    : (game.playerHandName || '');
  if (showAiCards) {
    aiHandEl.textContent = game.aiHandName || evaluateHand(game.aiHand, game.communityCards).name;
  }

  if (game.handOver) {
    const isWin = game.winner === 'Player';
    const resultText = game.winner === 'Player' ? 'You Win!'
      : game.winner === 'AI' ? 'AI Wins!'
      : 'Split Pot!';
    statusEl.innerHTML = `<span class="showdown-result ${isWin ? 'win' : 'lose'}">${resultText}</span>`;
    controlsEl.innerHTML = `<button class="ctrl-btn" onclick="uiStartHand()">New Hand</button>`;
    aiThinkingEl.textContent = '';
    return;
  }

  if (game.isPlayerTurn()) {
    statusEl.textContent = `Your turn — Pot: $${game.pot}`;
    aiThinkingEl.textContent = '';

    const callAmount = game.currentBet - game.playerBet;
    const canCheck = callAmount === 0;
    const minRaise = game.currentBet === 0 ? BIG_BLIND * 2 : Math.max(game.currentBet * 2, BIG_BLIND * 2);
    const maxRaise = game.playerStack + game.playerBet;
    const canRaise = maxRaise >= minRaise && game.playerStack > 0;

    let html = '';
    html += `<button class="ctrl-btn fold" onclick="uiFold()">Fold</button>`;
    if (canCheck) {
      html += `<button class="ctrl-btn check" onclick="uiCheck()">Check</button>`;
    } else {
      html += `<button class="ctrl-btn call" onclick="uiCall()">Call $${callAmount}</button>`;
    }
    if (canRaise) {
      const defRaise = Math.min(Math.max(minRaise, 40), maxRaise);
      html += `<button class="ctrl-btn raise" onclick="uiRaise()">Raise</button>`;
      html += `<div class="raise-control">
        <input type="range" id="raise-slider" min="${minRaise}" max="${maxRaise}" value="${defRaise}" oninput="syncRaiseInput()">
        <input type="number" id="raise-input" max="${maxRaise}" value="${defRaise}" oninput="syncRaiseSlider()" onblur="validateRaiseInput()">
      </div>`;
    }

    controlsEl.innerHTML = html;
  } else {
    aiThinkingEl.textContent = 'The Shadow is contemplating...';
    controlsEl.innerHTML = '';
  }
}

function syncRaiseInput() {
  const slider = document.getElementById('raise-slider');
  const input = document.getElementById('raise-input');
  if (slider && input) {
    input.value = slider.value;
    input.classList.remove('error');
  }
}

function syncRaiseSlider() {
  const slider = document.getElementById('raise-slider');
  const input = document.getElementById('raise-input');
  if (slider && input) {
    let val = parseInt(input.value);
    const max = parseInt(slider.max);
    if (isNaN(val)) val = parseInt(slider.min);
    if (val > max) val = max;
    if (val < parseInt(slider.min)) {
      input.classList.add('error');
      return;
    }
    input.classList.remove('error');
    slider.value = val;
  }
}

function validateRaiseInput() {
  const slider = document.getElementById('raise-slider');
  const input = document.getElementById('raise-input');
  if (!slider || !input) return;
  let val = parseInt(input.value);
  const min = parseInt(slider.min);
  const max = parseInt(slider.max);
  if (isNaN(val) || val < min) val = min;
  if (val > max) val = max;
  input.value = val;
  slider.value = val;
  input.classList.remove('error');
}

function aiThinkAndAct() {
  game.processAI();
  render();
}

function uiStartHand() {
  game.startHand();
  render();
}

function uiPostBlind() {
  game.postBlinds();
  render();
}

function handlePlayerAction(action, amount) {
  if (!game.applyPlayerAction(action, amount)) { render(); return; }
  if (game.handOver) { render(); return; }
  render();
  setTimeout(aiThinkAndAct, AI_DELAY);
}

function uiFold() { handlePlayerAction('fold', 0); }
function uiCheck() { handlePlayerAction('check', 0); }
function uiCall() { handlePlayerAction('call', 0); }

function uiRaise() {
  const input = document.getElementById('raise-input');
  const slider = document.getElementById('raise-slider');
  if (!input || !slider) return;
  const amount = parseInt(input.value);
  const min = parseInt(slider.min);
  if (isNaN(amount) || amount < 0) return;
  if (amount < min) {
    input.classList.add('error');
    return;
  }
  const total = game.playerStack + game.playerBet;
  handlePlayerAction(amount >= total ? 'all-in' : 'raise', amount);
}

document.addEventListener('DOMContentLoaded', render);
