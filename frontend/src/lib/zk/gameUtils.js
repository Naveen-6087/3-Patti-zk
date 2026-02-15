import {
  DECK_SIZE,
  HAND_SIZE,
  MERKLE_DEPTH,
  RANK,
  SUIT,
  HAND_RANK,
} from './types.js';

import {
  hashCardUID,
  hashCardCommitment,
  generateCanonicalDeck,
  generateNonce,
  commitDeck,
  buildMerkleTree,
  generateMerkleProof,
  getCardIndex,
} from './crypto.js';

// ─── Card Parsing ────────────────────────────────────────────────────────────

/** Backend rank strings → circuit rank numbers */
const RANK_MAP = {
  '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7,
  '8': 8, '9': 9, '10': 10, 'J': 11, 'Q': 12, 'K': 13, 'A': 14,
};

/** Backend suit strings → circuit suit numbers */
const SUIT_MAP = {
  hearts: 0,
  diamonds: 1,
  clubs: 2,
  spades: 3,
};

/** Reverse: circuit rank numbers → display strings */
const RANK_DISPLAY = {
  2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7',
  8: '8', 9: '9', 10: '10', 11: 'J', 12: 'Q', 13: 'K', 14: 'A',
};

/** Reverse: circuit suit numbers → display strings */
const SUIT_DISPLAY = {
  0: 'hearts', 1: 'diamonds', 2: 'clubs', 3: 'spades',
};

/**
 * Parse a backend card object to numeric format.
 * @param {{rank: string, suit: string}} card - Backend card
 * @returns {{rank: number, suit: number}} Circuit-compatible card
 */
export function parseCard(card) {
  const rank = RANK_MAP[card.rank];
  const suit = SUIT_MAP[card.suit];

  if (rank === undefined) throw new Error(`Unknown rank: ${card.rank}`);
  if (suit === undefined) throw new Error(`Unknown suit: ${card.suit}`);

  return { rank, suit };
}

/**
 * Convert a numeric card back to display format.
 * @param {number} rank
 * @param {number} suit
 * @returns {{rank: string, suit: string}}
 */
export function cardToDisplay(rank, suit) {
  return {
    rank: RANK_DISPLAY[rank] || String(rank),
    suit: SUIT_DISPLAY[suit] || String(suit),
  };
}

// ─── UID Generation ──────────────────────────────────────────────────────────

/**
 * Compute the UID for a backend card.
 * @param {{rank: string, suit: string}} card
 * @returns {Promise<bigint>}
 */
export async function cardToUID(card) {
  const { rank, suit } = parseCard(card);
  return hashCardUID(rank, suit);
}

/**
 * Convert backend card array to UIDs.
 * @param {Array<{rank: string, suit: string}>} cards
 * @returns {Promise<bigint[]>}
 */
export async function cardsToUIDs(cards) {
  return Promise.all(cards.map(cardToUID));
}

// ─── Deck Management ─────────────────────────────────────────────────────────

/**
 * Create a full shuffled deck state for ZK.
 *
 * 1. Generate canonical deck UIDs (deterministic)
 * 2. Apply a shuffle permutation
 * 3. Generate nonces for each card
 * 4. Build Merkle tree of commitments
 *
 * @param {Array<{rank: string, suit: string}>} shuffledCards - Backend deck in shuffled order
 * @returns {Promise<{
 *   canonicalUIDs: bigint[],
 *   shuffledUIDs: bigint[],
 *   nonces: bigint[],
 *   commitments: bigint[],
 *   merkleRoot: bigint,
 *   merkleLayers: bigint[][]
 * }>}
 */
export async function prepareDeckForZK(shuffledCards) {
  if (shuffledCards.length !== DECK_SIZE) {
    throw new Error(`Expected ${DECK_SIZE} cards, got ${shuffledCards.length}`);
  }

  // 1. Canonical deck UIDs
  const canonicalUIDs = await generateCanonicalDeck();

  // 2. Shuffled deck UIDs (in the order the backend shuffled them)
  const shuffledUIDs = await cardsToUIDs(shuffledCards);

  // 3. Random nonces for each card commitment
  const nonces = Array.from({ length: DECK_SIZE }, () => generateNonce());

  // 4. Commit: hash(DOMAIN_CARD_COMMITMENT, uid, nonce) for each card
  const { commitments, root, layers } = await commitDeck(shuffledUIDs, nonces);

  return {
    canonicalUIDs,
    shuffledUIDs,
    nonces,
    commitments,
    merkleRoot: root,
    merkleLayers: layers,
  };
}

// ─── Circuit Input Builders ──────────────────────────────────────────────────

/**
 * Build shuffle circuit input.
 *
 * @param {bigint[]} canonicalUIDs - Canonical 52-card deck UIDs
 * @param {bigint[]} shuffledUIDs  - Shuffled 52-card deck UIDs
 * @returns {import('./types.js').ShuffleCircuitInput}
 */
export function buildShuffleInput(canonicalUIDs, shuffledUIDs) {
  if (canonicalUIDs.length !== DECK_SIZE || shuffledUIDs.length !== DECK_SIZE) {
    throw new Error(`Both decks must have ${DECK_SIZE} cards`);
  }

  return {
    uids_in: canonicalUIDs,
    uids_out: shuffledUIDs,
  };
}

/**
 * Build deal circuit input.
 *
 * Proves that 3 specific cards were dealt from the committed deck.
 *
 * @param {bigint | string} playerId     - Player identifier (public)
 * @param {bigint}          merkleRoot   - Deck Merkle root (public)
 * @param {number[]}        positions    - Card positions in deck [3]
 * @param {bigint[]}        cardUIDs     - Card UIDs [3]
 * @param {bigint[]}        nonces       - Card nonces [3]
 * @param {bigint[][]}      merkleLayers - Tree layers from prepareDeckForZK
 * @returns {import('./types.js').DealCircuitInput}
 */
export function buildDealInput(playerId, merkleRoot, positions, cardUIDs, nonces, merkleLayers) {
  if (positions.length !== HAND_SIZE || cardUIDs.length !== HAND_SIZE || nonces.length !== HAND_SIZE) {
    throw new Error(`Deal input requires exactly ${HAND_SIZE} cards`);
  }

  const merkle_paths = positions.map((pos) => generateMerkleProof(merkleLayers, pos));

  return {
    player_id: playerId,
    merkle_root: merkleRoot,
    positions,
    card_uids: cardUIDs,
    nonces,
    merkle_paths,
  };
}

/**
 * Build show circuit input.
 *
 * Reveals a player's 3-card hand with verifiable ranking.
 *
 * @param {bigint | string}  gameId       - Game identifier (public)
 * @param {bigint | string}  playerId     - Player identifier (public)
 * @param {bigint}           merkleRoot   - Deck Merkle root (public)
 * @param {Array<{rank: number, suit: number}>} cards - Player's 3 cards (numeric)
 * @param {number}           handRank     - Hand ranking (1-6)
 * @param {bigint}           handValue    - Computed hand value
 * @param {bigint[]}         cardUIDs     - Card UIDs [3]
 * @param {bigint[]}         nonces       - Card nonces [3]
 * @param {number[]}         positions    - Card positions in deck [3]
 * @param {bigint[][]}       merkleLayers - Tree layers from prepareDeckForZK
 * @returns {import('./types.js').ShowCircuitInput}
 */
export function buildShowInput(
  gameId, playerId, merkleRoot,
  cards, handRank, handValue,
  cardUIDs, nonces, positions, merkleLayers
) {
  if (cards.length !== HAND_SIZE) {
    throw new Error(`Show input requires exactly ${HAND_SIZE} cards`);
  }

  const merkle_paths = positions.map((pos) => generateMerkleProof(merkleLayers, pos));

  return {
    game_id: gameId,
    player_id: playerId,
    merkle_root: merkleRoot,
    card_rank_0: cards[0].rank,
    card_rank_1: cards[1].rank,
    card_rank_2: cards[2].rank,
    card_suit_0: cards[0].suit,
    card_suit_1: cards[1].suit,
    card_suit_2: cards[2].suit,
    hand_rank: handRank,
    hand_value: handValue,
    card_uids: cardUIDs,
    nonces,
    merkle_paths,
    positions,
  };
}

// ─── Hand Evaluation ─────────────────────────────────────────────────────────

/**
 * Evaluate a 3-card Teen Patti hand. Returns the hand ranking and value.
 * This must produce the same result as the circuit's hand_ranking module.
 *
 * @param {Array<{rank: number, suit: number}>} cards - 3 cards (numeric)
 * @returns {{handRank: number, handValue: bigint}}
 */
export function evaluateHand(cards) {
  if (cards.length !== 3) throw new Error('Hand must have exactly 3 cards');

  // Sort ranks descending for consistent evaluation
  const sorted = [...cards].sort((a, b) => b.rank - a.rank);
  const ranks = sorted.map((c) => c.rank);
  const suits = sorted.map((c) => c.suit);

  const isFlush = suits[0] === suits[1] && suits[1] === suits[2];
  const isTrail = ranks[0] === ranks[1] && ranks[1] === ranks[2];
  const isPair = !isTrail && (ranks[0] === ranks[1] || ranks[1] === ranks[2] || ranks[0] === ranks[2]);

  // Sequence check: cards form a consecutive run
  // Special case: A-2-3 is the lowest sequence
  let isSequence = false;
  if (ranks[0] - ranks[1] === 1 && ranks[1] - ranks[2] === 1) {
    isSequence = true;
  }
  // A-2-3: Ace(14), 3, 2 sorted → [14, 3, 2]
  if (ranks[0] === 14 && ranks[1] === 3 && ranks[2] === 2) {
    isSequence = true;
  }

  let handRank;
  if (isTrail) {
    handRank = HAND_RANK.TRAIL;
  } else if (isSequence && isFlush) {
    handRank = HAND_RANK.PURE_SEQUENCE;
  } else if (isSequence) {
    handRank = HAND_RANK.SEQUENCE;
  } else if (isFlush) {
    handRank = HAND_RANK.COLOR;
  } else if (isPair) {
    handRank = HAND_RANK.PAIR;
  } else {
    handRank = HAND_RANK.HIGH_CARD;
  }

  // Compute hand value: encode hand rank + individual card ranks for tiebreaking
  // hand_value = hand_rank * 10^6 + rank0 * 10^4 + rank1 * 10^2 + rank2
  const handValue = BigInt(handRank) * 1000000n
    + BigInt(ranks[0]) * 10000n
    + BigInt(ranks[1]) * 100n
    + BigInt(ranks[2]);

  return { handRank, handValue };
}

// ─── Full Build Helpers ──────────────────────────────────────────────────────

/**
 * Convenience: parse backend cards, evaluate hand, and build show input.
 *
 * @param {bigint | string}  gameId
 * @param {bigint | string}  playerId
 * @param {bigint}           merkleRoot
 * @param {Array<{rank: string, suit: string}>} backendCards - 3 cards from backend
 * @param {bigint[]}         cardUIDs
 * @param {bigint[]}         nonces
 * @param {number[]}         positions
 * @param {bigint[][]}       merkleLayers
 * @returns {Promise<{input: import('./types.js').ShowCircuitInput, handRank: number, handValue: bigint}>}
 */
export async function buildShowInputFromBackendCards(
  gameId, playerId, merkleRoot,
  backendCards, cardUIDs, nonces, positions, merkleLayers
) {
  const numericCards = backendCards.map(parseCard);
  const { handRank, handValue } = evaluateHand(numericCards);

  const input = buildShowInput(
    gameId, playerId, merkleRoot,
    numericCards, handRank, handValue,
    cardUIDs, nonces, positions, merkleLayers
  );

  return { input, handRank, handValue };
}
