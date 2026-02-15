import {
  DECK_SIZE,
  MERKLE_DEPTH,
  HAND_SIZE,
  RANK,
  SUIT,
  DOMAIN_CARD_UID,
  DOMAIN_CARD_COMMITMENT,
  DOMAIN_MOVE,
} from './types.js';

/** @type {typeof import('@aztec/bb.js').Fr | null} */
let FrClass = null;

/**
 * Lazily load Fr class from @aztec/bb.js.
 * @returns {Promise<typeof import('@aztec/bb.js').Fr>}
 */
async function getFrClass() {
  if (FrClass) return FrClass;
  const { Fr } = await import('@aztec/bb.js');
  FrClass = Fr;
  return FrClass;
}

// ─── Barretenberg Singleton ──────────────────────────────────────────────────

/** @type {import('@aztec/bb.js').Barretenberg | null} */
let bbApi = null;
/** @type {Promise<void> | null} */
let bbInitPromise = null;

/**
 * Get or initialize the shared Barretenberg API instance.
 * Must be called before any hash operations.
 * @returns {Promise<import('@aztec/bb.js').Barretenberg>}
 */
export async function getBarretenberg() {
  if (bbApi) return bbApi;

  if (bbInitPromise) {
    await bbInitPromise;
    return bbApi;
  }

  bbInitPromise = (async () => {
    console.log('[ZK/crypto] Initializing Barretenberg...');
    const { Barretenberg } = await import('@aztec/bb.js');
    bbApi = await Barretenberg.new();
    console.log('[ZK/crypto] Barretenberg initialized');
  })();

  await bbInitPromise;
  return bbApi;
}

/**
 * Set the Barretenberg API instance (shared with proofService).
 * @param {import('@aztec/bb.js').Barretenberg} api
 */
export function setBarretenberg(api) {
  bbApi = api;
}

// ─── Field Helpers ───────────────────────────────────────────────────────────

/**
 * Convert a value to a proper Fr (field element) for Barretenberg.
 * Barretenberg's pedersenHash expects Fr instances with toBuffer().
 * @param {bigint | number | string} value
 * @param {typeof import('@aztec/bb.js').Fr} Fr - The Fr class
 * @returns {import('@aztec/bb.js').Fr}
 */
function toFr(value, Fr) {
  if (typeof value === 'bigint') {
    return new Fr(value);
  }
  if (typeof value === 'number') {
    return new Fr(BigInt(value));
  }
  if (typeof value === 'string') {
    return new Fr(BigInt(value));
  }
  throw new Error(`Cannot convert ${typeof value} to Fr`);
}

/**
 * Convert a Field (hex/bigint/number) to a decimal string for Noir circuit inputs.
 * Noir expects field elements as decimal strings, not hex.
 * @param {string | bigint | number | null | undefined} field
 * @returns {string}
 */
export function fieldToDecimalString(field) {
  if (field === undefined || field === null) return '0';
  if (typeof field === 'bigint') return field.toString();
  if (typeof field === 'number') return field.toString();
  if (typeof field === 'string') {
    if (!field || field === '0x' || field === '') return '0';
    if (field.startsWith('0x') || field.startsWith('0X')) {
      try {
        return BigInt(field).toString();
      } catch {
        console.error('[ZK/crypto] Failed to convert hex to decimal:', field);
        return '0';
      }
    }
    return field;
  }
  return '0';
}

// ─── Pedersen Hash Wrappers ──────────────────────────────────────────────────

/**
 * Pedersen hash of an array of field elements.
 * Matches Noir's `std::hash::pedersen_hash(inputs)`.
 * @param {Array<bigint | number | string>} inputs
 * @returns {Promise<bigint>} Hash result as bigint
 */
export async function pedersenHash(inputs) {
  const api = await getBarretenberg();
  const Fr = await getFrClass();
  const frInputs = inputs.map((v) => toFr(v, Fr));
  const result = await api.pedersenHash(frInputs, 0);
  // Result is an Fr instance — convert to bigint via hex string
  if (typeof result === 'bigint') return result;
  if (result && typeof result.toString === 'function') {
    return BigInt(result.toString());
  }
  throw new Error('Unexpected pedersenHash return type');
}

// ─── Domain-Separated Hashes (mirror circuits/lib/src/hash.nr) ──────────────

/**
 * Hash a card UID from rank and suit.
 * card_uid = pedersen_hash([DOMAIN_CARD_UID, rank, suit])
 * @param {number} rank - Card rank (2-14, Ace=14)
 * @param {number} suit - Card suit (0-3)
 * @returns {Promise<bigint>}
 */
export async function hashCardUID(rank, suit) {
  return pedersenHash([DOMAIN_CARD_UID, BigInt(rank), BigInt(suit)]);
}

/**
 * Hash a card commitment.
 * commitment = pedersen_hash([DOMAIN_CARD_COMMITMENT, card_uid, nonce])
 * @param {bigint | string} cardUID - The card's UID
 * @param {bigint | string} nonce   - Random nonce
 * @returns {Promise<bigint>}
 */
export async function hashCardCommitment(cardUID, nonce) {
  return pedersenHash([DOMAIN_CARD_COMMITMENT, cardUID, nonce]);
}

/**
 * Hash a Merkle tree node.
 * node = pedersen_hash([left, right])
 * @param {bigint | string} left
 * @param {bigint | string} right
 * @returns {Promise<bigint>}
 */
export async function hashMerkleNode(left, right) {
  return pedersenHash([left, right]);
}

/**
 * Hash a move commitment.
 * commitment = pedersen_hash([DOMAIN_MOVE, game_id, player_id, hand_hash])
 * @param {bigint | string} gameId
 * @param {bigint | string} playerId
 * @param {bigint | string} handHash
 * @returns {Promise<bigint>}
 */
export async function hashMoveCommitment(gameId, playerId, handHash) {
  return pedersenHash([DOMAIN_MOVE, gameId, playerId, handHash]);
}

// ─── Nonce Generation ────────────────────────────────────────────────────────

/**
 * Generate a cryptographically secure random nonce as a field element.
 * @returns {bigint} Random 252-bit value (fits in BN254 field)
 */
export function generateNonce() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  // Clear top 4 bits to ensure value < BN254 field modulus
  bytes[0] &= 0x0f;
  let value = 0n;
  for (const b of bytes) {
    value = (value << 8n) | BigInt(b);
  }
  return value;
}

// ─── Canonical Deck ──────────────────────────────────────────────────────────

/**
 * Generate all 52 card UIDs in canonical order.
 * Order: rank 2..14, suit 0..3 → index = (rank-2)*4 + suit
 * Matches circuits/lib/src/card_uids.nr generate_canonical_deck()
 * @returns {Promise<bigint[]>} Array of 52 card UIDs
 */
export async function generateCanonicalDeck() {
  const deck = new Array(DECK_SIZE);
  for (let rankOffset = 0; rankOffset < 13; rankOffset++) {
    const rank = rankOffset + 2; // 2..14
    for (let suit = 0; suit < 4; suit++) {
      const idx = rankOffset * 4 + suit;
      deck[idx] = await hashCardUID(rank, suit);
    }
  }
  return deck;
}

/**
 * Get the canonical deck index for a card.
 * index = (rank - 2) * 4 + suit
 * @param {number} rank - Card rank (2-14)
 * @param {number} suit - Card suit (0-3)
 * @returns {number}
 */
export function getCardIndex(rank, suit) {
  return (rank - RANK.TWO) * 4 + suit;
}

// ─── Merkle Tree ─────────────────────────────────────────────────────────────

/**
 * Build a Merkle tree from an array of leaf commitments.
 * Pads to next power of 2 with zeros.
 * @param {Array<bigint | string>} leaves - Leaf commitments
 * @returns {Promise<{root: bigint, layers: bigint[][]}>}
 */
export async function buildMerkleTree(leaves) {
  // Pad to 2^MERKLE_DEPTH = 64 leaves
  const treeSize = 1 << MERKLE_DEPTH; // 2^6 = 64
  const paddedLeaves = new Array(treeSize).fill(0n);
  for (let i = 0; i < leaves.length; i++) {
    paddedLeaves[i] = typeof leaves[i] === 'string' ? BigInt(leaves[i]) : leaves[i];
  }

  const layers = [paddedLeaves];
  let currentLayer = paddedLeaves;

  for (let depth = 0; depth < MERKLE_DEPTH; depth++) {
    const nextLayer = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = currentLayer[i + 1];
      nextLayer.push(await hashMerkleNode(left, right));
    }
    layers.push(nextLayer);
    currentLayer = nextLayer;
  }

  return {
    root: currentLayer[0],
    layers,
  };
}

/**
 * Generate a Merkle proof for a leaf at the given index.
 * @param {bigint[][]} layers - Tree layers from buildMerkleTree
 * @param {number} leafIndex  - Index of the leaf (0-based)
 * @returns {{path: bigint[], indices: number[]}}
 */
export function generateMerkleProof(layers, leafIndex) {
  const path = [];
  const indices = [];
  let idx = leafIndex;

  for (let depth = 0; depth < MERKLE_DEPTH; depth++) {
    const isRight = idx & 1;
    const siblingIdx = isRight ? idx - 1 : idx + 1;

    path.push(layers[depth][siblingIdx] || 0n);
    indices.push(isRight ? 1 : 0);
    idx = Math.floor(idx / 2);
  }

  return { path, indices };
}

/**
 * Commit to a deck: hash each card UID with a nonce, build Merkle tree.
 * @param {bigint[]} cardUIDs - Array of card UIDs (shuffled order)
 * @param {bigint[]} nonces   - Random nonces for each card
 * @returns {Promise<{commitments: bigint[], root: bigint, layers: bigint[][]}>}
 */
export async function commitDeck(cardUIDs, nonces) {
  if (cardUIDs.length !== nonces.length) {
    throw new Error('cardUIDs and nonces must have same length');
  }

  const commitments = [];
  for (let i = 0; i < cardUIDs.length; i++) {
    commitments.push(await hashCardCommitment(cardUIDs[i], nonces[i]));
  }

  const { root, layers } = await buildMerkleTree(commitments);
  return { commitments, root, layers };
}
