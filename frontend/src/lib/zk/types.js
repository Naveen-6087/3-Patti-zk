/**
 * ZK Types & Constants for Teen Patti
 * Defines circuit input/output interfaces, artifact paths, and game constants.
 *
 * Circuits:
 *   shuffle — proves deck permutation (0 public inputs)
 *   deal   — proves cards dealt from committed deck (2 public inputs)
 *   show   — reveals hand with ranking proof (11 public inputs)
 *
 * Hash function: Pedersen (std::hash::pedersen_hash) via @aztec/bb.js
 */

// ─── Game Constants ──────────────────────────────────────────────────────────

/** Number of cards in a standard deck */
export const DECK_SIZE = 52;

/** Merkle tree depth — matches circuits/lib/src/types.nr MERKLE_DEPTH */
export const MERKLE_DEPTH = 6;

/** Number of cards dealt to each player */
export const HAND_SIZE = 3;

/** Maximum number of players in Teen Patti */
export const MAX_PLAYERS = 6;

// ─── Domain Separation Tags (match circuits/lib/src/constants.nr) ────────────

export const DOMAIN_CARD_UID = 1n;
export const DOMAIN_CARD_COMMITMENT = 2n;
export const DOMAIN_MOVE = 3n;

// ─── Card Constants (match circuits/lib/src/constants.nr) ────────────────────

/** Suits (0-3) — match circuits/lib/src/constants.nr */
export const SUIT = {
  HEARTS: 0,
  DIAMONDS: 1,
  CLUBS: 2,
  SPADES: 3,
};

/** Ranks (2-14, Ace=14) — match circuits/lib/src/constants.nr */
export const RANK = {
  TWO: 2,
  THREE: 3,
  FOUR: 4,
  FIVE: 5,
  SIX: 6,
  SEVEN: 7,
  EIGHT: 8,
  NINE: 9,
  TEN: 10,
  JACK: 11,
  QUEEN: 12,
  KING: 13,
  ACE: 14,
};

/** Hand rankings (match circuits/lib/src/types.nr) */
export const HAND_RANK = {
  HIGH_CARD: 1,
  PAIR: 2,
  COLOR: 3,          // aka Flush
  SEQUENCE: 4,       // aka Run / Straight
  PURE_SEQUENCE: 5,  // aka Pure Run / Straight Flush
  TRAIL: 6,          // Three of a Kind
};

// ─── Circuit Artifacts ───────────────────────────────────────────────────────

/**
 * Circuit artifact paths — served from /public/circuits/
 * @type {Record<string, {name: string, circuitPath: string, vkPath: string}>}
 */
export const CIRCUIT_ARTIFACTS = {
  shuffle: {
    name: 'shuffle',
    circuitPath: '/circuits/shuffle_circuit.json',
    vkPath: '/circuits/shuffle_vk',
  },
  deal: {
    name: 'deal',
    circuitPath: '/circuits/deal_circuit.json',
    vkPath: '/circuits/deal_vk',
  },
  show: {
    name: 'show',
    circuitPath: '/circuits/show_circuit.json',
    vkPath: '/circuits/show_vk',
  },
};

// ─── Proof Status State Machine ──────────────────────────────────────────────

/**
 * Proof lifecycle states
 * @enum {string}
 */
export const ProofStatus = {
  IDLE: 'idle',
  GENERATING: 'generating',
  GENERATED: 'generated',
  VERIFYING: 'verifying',
  VERIFIED: 'verified',
  SUBMITTING: 'submitting',
  SUBMITTED: 'submitted',
  FAILED: 'failed',
};

// ─── Contract Circuit Types (match TeenPattiGame.sol) ────────────────────────

/**
 * CircuitType enum matching Solidity contract
 * @enum {number}
 */
export const CircuitType = {
  Shuffle: 0,
  Deal: 1,
  Show: 2,
};

/**
 * @typedef {string | bigint} Field
 * A finite field element — hex string or bigint
 */

/**
 * @typedef {Object} MerkleProof
 * @property {Field[]} path   - Sibling hashes (length = MERKLE_DEPTH)
 * @property {number[]} indices - Left(0) / Right(1) indicators
 */

/**
 * @typedef {Object} ZKProof
 * @property {Uint8Array} proof        - The proof bytes
 * @property {Field[]}    publicInputs - Public inputs for verification
 * @property {Uint8Array} [verificationKey] - VK bytes (optional, for caching)
 */

/**
 * @typedef {Object} VerificationResult
 * @property {boolean} valid   - Whether the proof is valid
 * @property {string}  [error] - Error message if verification failed
 */

// ─── Circuit Input Shapes ────────────────────────────────────────────────────

/**
 * Shuffle circuit — proves deck is a valid permutation
 * 0 public inputs, all private
 *
 * @typedef {Object} ShuffleCircuitInput
 * @property {Field[]} uids_in  - Original 52-card UIDs
 * @property {Field[]} uids_out - Shuffled 52-card UIDs
 */

/**
 * Deal circuit — proves cards were dealt from committed deck
 * 2 public inputs: player_id, merkle_root
 *
 * @typedef {Object} DealCircuitInput
 * @property {Field}         player_id    - Player identifier (public)
 * @property {Field}         merkle_root  - Merkle root of the deck (public)
 * @property {number[]}      positions    - Card positions in deck [3]
 * @property {Field[]}       card_uids    - Card UIDs [3]
 * @property {Field[]}       nonces       - Commitment nonces [3]
 * @property {MerkleProof[]} merkle_paths - Merkle proofs [3]
 */

/**
 * Show circuit — reveals hand with ranking proof
 * 11 public inputs: game_id, player_id, merkle_root,
 *   card_rank_0..2, card_suit_0..2, hand_rank, hand_value
 *
 * @typedef {Object} ShowCircuitInput
 * @property {Field}         game_id      - Game identifier (public)
 * @property {Field}         player_id    - Player identifier (public)
 * @property {Field}         merkle_root  - Merkle root of the deck (public)
 * @property {number}        card_rank_0  - First card rank (public)
 * @property {number}        card_rank_1  - Second card rank (public)
 * @property {number}        card_rank_2  - Third card rank (public)
 * @property {number}        card_suit_0  - First card suit (public)
 * @property {number}        card_suit_1  - Second card suit (public)
 * @property {number}        card_suit_2  - Third card suit (public)
 * @property {number}        hand_rank    - Hand ranking (public)
 * @property {Field}         hand_value   - Computed hand value (public)
 * @property {Field[]}       card_uids    - Card UIDs [3]
 * @property {Field[]}       nonces       - Commitment nonces [3]
 * @property {MerkleProof[]} merkle_paths - Merkle proofs [3]
 * @property {number[]}      positions    - Card positions in deck [3]
 */
