const SUITS = ['clubs', 'diamonds', 'hearts', 'spades'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

function createDeck() {
  const deck = [];
  for (let i = 0; i < 52; i++) {
    deck.push(i);
  }
  return deck;
}

function shuffle(deck) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

function cardSuit(card) {
  return SUITS[Math.floor(card / 13)];
}

function cardRank(card) {
  return RANKS[card % 13];
}

function cardRankValue(card) {
  return card % 13;
}

function cardString(card) {
  return cardRank(card) + cardSuit(card)[0].toUpperCase();
}

function cardDisplay(card) {
  const rank = cardRank(card);
  const suit = cardSuit(card);
  const suitSymbols = { clubs: '♣', diamonds: '♦', hearts: '♥', spades: '♠' };
  const suitColors = { clubs: '#1a1a1a', diamonds: '#8b0000', hearts: '#8b0000', spades: '#1a1a1a' };
  return { rank, suit: suitSymbols[suit], color: suitColors[suit] };
}
