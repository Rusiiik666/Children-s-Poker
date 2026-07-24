function preflopStrength(holeCards) {
  const r1 = cardRankValue(holeCards[0]);
  const r2 = cardRankValue(holeCards[1]);
  const suited = cardSuit(holeCards[0]) === cardSuit(holeCards[1]);
  const high = Math.max(r1, r2);
  const low = Math.min(r1, r2);
  const gap = high - low;
  const connected = gap <= 2;

  if (r1 === r2) {
    return 0.2 + (high / 12) * 0.7;
  }

  let strength = (high / 12) * 0.3 + (low / 12) * 0.15;
  if (suited) strength += 0.1;
  if (connected) strength += 0.1;
  if (gap === 0) strength += 0.05;
  if (high >= 10 && low >= 10) strength += 0.1;
  if (high === 12 && low >= 11) strength += 0.1;

  return Math.min(strength, 0.95);
}

function evaluateHandStrength(holeCards, communityCards) {
  if (communityCards.length < 3) {
    return preflopStrength(holeCards);
  }
  const hand = evaluateHand(holeCards, communityCards);
  const rankStrength = hand.rank / 9;
  const scoreStrength = hand.score / 12;
  return rankStrength * 0.7 + scoreStrength * 0.3;
}

function getHandCategory(handStrength) {
  if (handStrength >= 0.8) return 'very_strong';
  if (handStrength >= 0.6) return 'strong';
  if (handStrength >= 0.4) return 'medium';
  if (handStrength >= 0.2) return 'weak';
  return 'very_weak';
}

function aiDecide(hand, holeCards, communityCards, pot, needToCall, aiChips, playerBet) {
  const handStrength = evaluateHandStrength(holeCards, communityCards);
  const category = getHandCategory(handStrength);
  const potOdds = needToCall > 0 ? (pot / needToCall) : Infinity;
  const isRaised = needToCall > 0;
  const bluffFactor = Math.random();

  let action, amount;

  switch (category) {
    case 'very_strong':
      if (isRaised) {
        action = 'raise';
        amount = Math.min(needToCall * 3, aiChips);
      } else {
        action = 'raise';
        amount = Math.min(Math.floor(pot * 0.75), aiChips);
      }
      break;

    case 'strong':
      if (isRaised) {
        action = 'call';
      } else {
        action = 'raise';
        amount = Math.min(Math.floor(pot * 0.5), aiChips);
      }
      break;

    case 'medium':
      if (isRaised) {
        if (potOdds > 1.5 && aiChips > needToCall) {
          action = 'call';
        } else if (bluffFactor < 0.1 && aiChips > needToCall) {
          action = 'call';
        } else {
          action = 'fold';
        }
      } else {
        action = 'check';
      }
      break;

    case 'weak':
      if (!isRaised) {
        if (bluffFactor < 0.15) {
          action = 'raise';
          amount = Math.min(Math.floor(pot * 0.5), aiChips);
        } else {
          action = 'check';
        }
      } else {
        if (potOdds > 2.5 && bluffFactor < 0.3) {
          action = 'call';
        } else if (bluffFactor < 0.08 && aiChips > needToCall * 2) {
          action = 'raise';
          amount = Math.min(Math.floor(pot * 0.6), aiChips);
        } else {
          action = 'fold';
        }
      }
      break;

    case 'very_weak':
      if (!isRaised) {
        if (bluffFactor < 0.08) {
          action = 'raise';
          amount = Math.min(Math.floor(pot * 0.3), aiChips);
        } else {
          action = 'check';
        }
      } else {
        if (potOdds > 4 && bluffFactor < 0.05) {
          action = 'call';
        } else {
          action = 'fold';
        }
      }
      break;
  }

  if (action === 'raise') {
    const minRaise = Math.max(needToCall * 2 || 20, 20);
    amount = Math.max(minRaise, Math.min(amount || minRaise, aiChips));
    if (amount >= aiChips) {
      amount = aiChips;
      action = 'all-in';
    }
  }

  if (action === 'call' && needToCall > aiChips) {
    amount = aiChips;
    action = 'all-in';
  }

  return { action, amount: amount || 0, handStrength, handName: evaluateHand(holeCards, communityCards).name };
}
