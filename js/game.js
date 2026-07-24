const GameState = {
  IDLE: 'idle',
  WAITING_BLIND: 'waiting_blind',
  PREFLOP: 'preflop',
  FLOP: 'flop',
  TURN: 'turn',
  RIVER: 'river',
  SHOWDOWN: 'showdown'
};

const STARTING_STACK = 1000;
const SMALL_BLIND = 5;
const BIG_BLIND = 10;

class PokerGame {
  constructor() {
    this.reset();
  }

  reset() {
    this.deck = [];
    this.playerHand = [];
    this.aiHand = [];
    this.communityCards = [];
    this.playerStack = STARTING_STACK;
    this.aiStack = STARTING_STACK;
    this.pot = 0;
    this.currentBet = 0;
    this.playerBet = 0;
    this.aiBet = 0;
    this.state = GameState.IDLE;
    this.lastAction = '';
    this.lastRaiseAmount = 0;
    this.handOver = false;
    this.aiAction = null;
    this.playerFolded = false;
    this.aiFolded = false;
    this.playerHandName = '';
    this.aiHandName = '';
    this.winner = '';
  }

  startHand() {
    this.deck = shuffle(createDeck());
    this.playerHand = [this.deck.pop(), this.deck.pop()];
    this.aiHand = [this.deck.pop(), this.deck.pop()];
    this.communityCards = [];
    this.pot = 0;
    this.currentBet = 0;
    this.playerBet = 0;
    this.aiBet = 0;
    this.lastRaiseAmount = 0;
    this.handOver = false;
    this.aiAction = null;
    this.playerFolded = false;
    this.aiFolded = false;
    this.playerHandName = '';
    this.aiHandName = '';
    this.winner = '';
    this.lastAction = '';
    this.state = GameState.WAITING_BLIND;
  }

  postBlinds() {
    this.playerBet = SMALL_BLIND;
    this.aiBet = BIG_BLIND;
    this.pot = SMALL_BLIND + BIG_BLIND;
    this.currentBet = BIG_BLIND;
    this.playerStack -= SMALL_BLIND;
    this.aiStack -= BIG_BLIND;
    this.state = GameState.PREFLOP;
  }

  applyPlayerAction(action, amount) {
    if (this.handOver) return false;
    if (!this.isPlayerTurn()) return false;

    switch (action) {
      case 'fold':
        this.playerFolded = true;
        this.winner = 'AI';
        this.handOver = true;
        this.state = GameState.SHOWDOWN;
        this.aiStack += this.pot;
        break;
      case 'check':
        break;
      case 'call':
        const callAmount = this.currentBet - this.playerBet;
        this.playerBet += callAmount;
        this.playerStack -= callAmount;
        this.pot += callAmount;
        break;
      case 'raise':
      case 'all-in':
        const totalBet = Math.min(amount, this.playerStack + this.playerBet);
        const raiseAmount = totalBet - this.playerBet;
        this.playerBet = totalBet;
        this.playerStack -= raiseAmount;
        this.pot += raiseAmount;
        this.currentBet = totalBet;
        this.lastRaiseAmount = totalBet - Math.max(this.aiBet, 0);
        break;
    }

    this.lastAction = action;
    return !this.handOver;
  }

  processAI() {
    const needToCall = this.currentBet - this.aiBet;
    const aiTotal = this.aiStack + this.aiBet;

    if (this.playerFolded || this.handOver) return false;
    if (this.state === GameState.PREFLOP && this.playerBet === 0 && this.aiBet === 0) return false;

    const aiDecision = aiDecide(
      evaluateHand(this.aiHand, this.communityCards),
      this.aiHand, this.communityCards,
      this.pot, needToCall, this.aiStack, this.playerBet
    );

    this.aiAction = aiDecision;

    switch (aiDecision.action) {
      case 'fold':
        this.aiFolded = true;
        this.winner = 'Player';
        this.handOver = true;
        this.state = GameState.SHOWDOWN;
        this.playerStack += this.pot;
        break;
      case 'check':
        break;
      case 'call':
        const callAmt = Math.min(needToCall, this.aiStack);
        this.aiBet += callAmt;
        this.aiStack -= callAmt;
        this.pot += callAmt;
        break;
      case 'raise':
      case 'all-in':
        const totalBet = Math.min(aiDecision.amount, aiTotal);
        const raiseAmt = totalBet - this.aiBet;
        this.aiBet = totalBet;
        this.aiStack -= raiseAmt;
        this.pot += raiseAmt;
        this.currentBet = totalBet;
        this.lastRaiseAmount = totalBet - this.playerBet;
        this.lastAction = '';
        break;
    }

    if (!this.handOver && this.playerBet === this.aiBet) {
      this.advanceStage();
    } else if (!this.handOver && (this.playerStack === 0 || this.aiStack === 0)) {
      this.advanceStage();
    }

    return !this.handOver;
  }

  advanceStage() {
    switch (this.state) {
      case GameState.PREFLOP:
        this.deck.pop();
        this.communityCards.push(this.deck.pop(), this.deck.pop(), this.deck.pop());
        this.state = GameState.FLOP;
        break;
      case GameState.FLOP:
        this.deck.pop();
        this.communityCards.push(this.deck.pop());
        this.state = GameState.TURN;
        break;
      case GameState.TURN:
        this.deck.pop();
        this.communityCards.push(this.deck.pop());
        this.state = GameState.RIVER;
        break;
      case GameState.RIVER:
        this.showdown();
        return;
    }
    this.currentBet = 0;
    this.playerBet = 0;
    this.aiBet = 0;
    this.aiAction = null;
    this.lastRaiseAmount = 0;
    this.lastAction = '';
  }

  showdown() {
    this.state = GameState.SHOWDOWN;
    this.handOver = true;

    if (!this.playerFolded && !this.aiFolded) {
      const playerResult = evaluateHand(this.playerHand, this.communityCards);
      const aiResult = evaluateHand(this.aiHand, this.communityCards);
      this.playerHandName = playerResult.name;
      this.aiHandName = aiResult.name;

      const cmp = compareHands(playerResult, aiResult);
      this.winner = cmp > 0 ? 'Player' : cmp < 0 ? 'AI' : 'Split';
    }

    if (this.winner === 'Player') {
      this.playerStack += this.pot;
    } else if (this.winner === 'AI') {
      this.aiStack += this.pot;
    } else if (this.winner === 'Split') {
      const half = Math.floor(this.pot / 2);
      this.playerStack += half;
      this.aiStack += this.pot - half;
    }
  }

  isPlayerTurn() {
    if (this.handOver) return false;
    if (![GameState.PREFLOP, GameState.FLOP, GameState.TURN, GameState.RIVER].includes(this.state)) return false;
    // Player hasn't acted this sub-round (lastAction empty) OR AI raised (lastAction reset)
    if (this.lastAction) return false;
    return true;
  }


}
