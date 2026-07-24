const HAND_NAMES = [
  'High Card', 'One Pair', 'Two Pair', 'Three of a Kind',
  'Straight', 'Flush', 'Full House', 'Four of a Kind',
  'Straight Flush', 'Royal Flush'
];

function combinations(arr, k) {
  if (k === 0) return [[]];
  if (arr.length === 0) return [];
  const [first, ...rest] = arr;
  const withFirst = combinations(rest, k - 1).map(c => [first, ...c]);
  const withoutFirst = combinations(rest, k);
  return [...withFirst, ...withoutFirst];
}

function evaluate5(cards) {
  const ranks = cards.map(c => cardRankValue(c)).sort((a, b) => a - b);
  const suits = cards.map(c => cardSuit(c));
  const isFlush = suits.every(s => s === suits[0]);

  const isStraight = (() => {
    const unique = [...new Set(ranks)].sort((a, b) => a - b);
    if (unique.length < 5) return false;
    if (unique[4] - unique[0] === 4) return true;
    if (unique[0] === 0 && unique[1] === 1 && unique[2] === 2 && unique[3] === 3 && unique[4] === 12) return true;
    return false;
  })();

  const rankCounts = {};
  ranks.forEach(r => { rankCounts[r] = (rankCounts[r] || 0) + 1; });
  const counts = Object.values(rankCounts).sort((a, b) => b - a);
  const hasFour = counts[0] === 4;
  const hasThree = counts[0] === 3;
  const pairs = counts.filter(c => c === 2).length;

  if (isFlush && isStraight) {
    const high = ranks[4] === 12 && ranks[0] === 0 ? 3 : ranks[4];
    if (high === 12) return { rank: 9, score: high, name: 'Royal Flush' };
    return { rank: 8, score: straightHigh(ranks), name: 'Straight Flush' };
  }
  if (hasFour) {
    const quadRank = +Object.keys(rankCounts).find(k => rankCounts[k] === 4);
    return { rank: 7, score: quadRank, name: 'Four of a Kind' };
  }
  if (hasThree && pairs === 1) {
    const tripleRank = +Object.keys(rankCounts).find(k => rankCounts[k] === 3);
    return { rank: 6, score: tripleRank, name: 'Full House' };
  }
  if (isFlush) {
    return { rank: 5, score: ranks[4], name: 'Flush' };
  }
  if (isStraight) {
    return { rank: 4, score: straightHigh(ranks), name: 'Straight' };
  }
  if (hasThree) {
    const tripleRank = +Object.keys(rankCounts).find(k => rankCounts[k] === 3);
    return { rank: 3, score: tripleRank, name: 'Three of a Kind' };
  }
  if (pairs === 2) {
    const pairRanks = Object.keys(rankCounts).filter(k => rankCounts[k] === 2).map(Number).sort((a, b) => b - a);
    return { rank: 2, score: pairRanks[0] * 13 + pairRanks[1], name: 'Two Pair' };
  }
  if (pairs === 1) {
    const pairRank = +Object.keys(rankCounts).find(k => rankCounts[k] === 2);
    return { rank: 1, score: pairRank, name: 'One Pair' };
  }
  return { rank: 0, score: ranks[4], name: 'High Card' };
}

function straightHigh(ranks) {
  const unique = [...new Set(ranks)].sort((a, b) => a - b);
  if (unique[0] === 0 && unique[1] === 1 && unique[2] === 2 && unique[3] === 3 && unique[4] === 12) return 3;
  return unique[4];
}

function evaluateHand(holeCards, communityCards) {
  const allCards = [...holeCards, ...communityCards];
  if (allCards.length < 5) {
    return { rank: -1, score: 0, name: 'Waiting...', kickers: [] };
  }
  const combos = combinations(allCards, 5);
  let best = null;
  for (const combo of combos) {
    const result = evaluate5(combo);
    if (!best || result.rank > best.rank || (result.rank === best.rank && result.score > best.score)) {
      best = result;
    }
  }
  return best;
}

function compareHands(h1, h2) {
  if (h1.rank !== h2.rank) return h1.rank - h2.rank;
  return h1.score - h2.score;
}
