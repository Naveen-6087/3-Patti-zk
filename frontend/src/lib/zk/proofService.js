import { CIRCUIT_ARTIFACTS } from './types.js';
import { setBarretenberg, fieldToDecimalString } from './crypto.js';

// ─── Module-level State ──────────────────────────────────────────────────────

/** @type {typeof import('@noir-lang/noir_js').Noir | null} */
let Noir = null;
/** @type {typeof import('@aztec/bb.js').UltraHonkBackend | null} */
let UltraHonkBackend = null;
/** @type {typeof import('@aztec/bb.js').Barretenberg | null} */
let Barretenberg = null;
/** @type {import('@aztec/bb.js').Barretenberg | null} */
let bbApi = null;

let modulesLoaded = false;
let wasmInitialized = false;
/** @type {Promise<void> | null} */
let initializationPromise = null;
let crsInterceptorInstalled = false;

// ─── WASM Initialization ────────────────────────────────────────────────────

/**
 * Initialize WASM modules for Noir (noirc_abi + acvm_js).
 * Must be called before any circuit operations.
 */
async function initializeWasm() {
  if (wasmInitialized) return;

  console.log('[ZK] Initializing WASM modules...');
  try {
    const [initNoirC, initACVM] = await Promise.all([
      import('@noir-lang/noirc_abi').then((m) => m.default),
      import('@noir-lang/acvm_js').then((m) => m.default),
    ]);

    await Promise.all([initACVM(), initNoirC()]);
    wasmInitialized = true;
    console.log('[ZK] WASM modules initialized');
  } catch (error) {
    console.error('[ZK] WASM initialization failed:', error);
    throw new Error(`WASM initialization failed: ${error}`);
  }
}

// ─── CRS Fetch Interceptor ──────────────────────────────────────────────────

/**
 * Install a fetch interceptor to proxy CRS (Common Reference String) requests.
 *
 * For Vite dev: routes through Vite's proxy (configured in vite.config.js).
 * For production: uses direct CORS fetch to crs.aztec.network.
 */
function installCrsInterceptor() {
  if (crsInterceptorInstalled || typeof window === 'undefined') return;

  const originalFetch = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    let url;
    if (input instanceof URL) {
      url = input.toString();
    } else if (input instanceof Request) {
      url = input.url;
    } else {
      url = input;
    }

    // Route CRS requests through Vite proxy in dev
    if (url.includes('crs.aztec.network')) {
      const crsUrl = new URL(url);
      const proxyUrl = `/api/crs${crsUrl.pathname}${crsUrl.search}`;
      console.log(`[ZK] CRS interceptor: ${url} -> ${proxyUrl}`);
      return originalFetch(proxyUrl, {
        ...init,
        mode: 'same-origin',
      });
    }

    return originalFetch(input, init);
  };

  crsInterceptorInstalled = true;
  console.log('[ZK] CRS fetch interceptor installed');
}

// ─── Module Loading ──────────────────────────────────────────────────────────

/**
 * Load Noir and Barretenberg modules (singleton).
 * Initializes WASM, loads dynamic imports, creates shared Barretenberg API.
 */
async function loadModules() {
  if (initializationPromise) return initializationPromise;
  if (modulesLoaded) return;

  if (typeof window === 'undefined') {
    throw new Error('ZK modules can only be loaded in the browser');
  }

  initializationPromise = (async () => {
    console.log('[ZK] Loading Noir and Barretenberg modules...');
    try {
      // Install CRS interceptor before bb.js makes requests
      installCrsInterceptor();

      // Initialize WASM
      await initializeWasm();

      // Dynamic import of runtime modules
      const [noirModule, bbModule] = await Promise.all([
        import('@noir-lang/noir_js'),
        import('@aztec/bb.js'),
      ]);

      Noir = noirModule.Noir;
      UltraHonkBackend = bbModule.UltraHonkBackend;
      Barretenberg = bbModule.Barretenberg;

      // Create shared Barretenberg API
      console.log('[ZK] Initializing Barretenberg API...');
      bbApi = await Barretenberg.new();
      console.log('[ZK] Barretenberg API initialized');

      // Share with crypto module
      setBarretenberg(bbApi);

      modulesLoaded = true;
      console.log('[ZK] All modules loaded successfully');
    } catch (error) {
      console.error('[ZK] Failed to load modules:', error);
      initializationPromise = null;
      throw error;
    }
  })();

  return initializationPromise;
}

// ─── Circuit Cache ───────────────────────────────────────────────────────────

/**
 * @typedef {Object} CachedCircuit
 * @property {object} compiled - CompiledCircuit JSON
 * @property {object} noir     - Noir instance
 * @property {object} backend  - UltraHonkBackend instance
 * @property {Uint8Array | null} vk - Verification key bytes
 */

/** @type {Map<string, CachedCircuit>} */
const circuitCache = new Map();

/**
 * Load a circuit from public assets and initialize Noir + backend.
 * Caches results for reuse.
 * @param {{name: string, circuitPath: string, vkPath: string}} artifact
 * @returns {Promise<CachedCircuit>}
 */
async function loadCircuit(artifact) {
  await loadModules();
  if (!Noir || !UltraHonkBackend) throw new Error('Modules not loaded');

  const cached = circuitCache.get(artifact.name);
  if (cached) return cached;

  console.log(`[ZK] Loading circuit: ${artifact.name}`);

  // Fetch compiled circuit JSON from /public/circuits/
  const response = await fetch(artifact.circuitPath);
  if (!response.ok) {
    throw new Error(`Failed to load circuit ${artifact.name}: ${response.statusText}`);
  }
  const compiled = await response.json();

  // Initialize Noir and UltraHonkBackend
  const noir = new Noir(compiled);
  const backend = new UltraHonkBackend(compiled.bytecode, bbApi);

  // Try to load precomputed verification key
  let vk = null;
  try {
    const vkResponse = await fetch(artifact.vkPath);
    if (vkResponse.ok) {
      const vkBuffer = await vkResponse.arrayBuffer();
      vk = new Uint8Array(vkBuffer);
    }
  } catch {
    console.log(`[ZK] No precomputed VK for ${artifact.name}, will generate on first use`);
  }

  const circuitData = { compiled, noir, backend, vk };
  circuitCache.set(artifact.name, circuitData);

  console.log(`[ZK] Circuit ${artifact.name} loaded`);
  return circuitData;
}

// ─── Verification Key ────────────────────────────────────────────────────────

/**
 * Get or generate verification key for a circuit.
 * Uses keccak: true to match on-chain UltraKeccakHonk verifiers.
 * @param {CachedCircuit} circuit
 * @returns {Promise<Uint8Array>}
 */
async function getVerificationKey(circuit) {
  if (circuit.vk) return circuit.vk;

  console.log('[ZK] Generating verification key (keccak: true)...');
  const vk = await circuit.backend.getVerificationKey({ keccak: true });
  circuit.vk = vk;
  return vk;
}

// ─── Core Proof Generation ───────────────────────────────────────────────────

/**
 * Validate circuit inputs — check for empty/invalid values.
 * @param {object} obj
 * @param {string} path
 */
function validateInputs(obj, path = '') {
  for (const [key, value] of Object.entries(obj)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (value === '0x' || value === '' || value === undefined || value === null) {
      throw new Error(`Invalid circuit input at ${currentPath}: ${value}`);
    }
    if (typeof value === 'object' && value !== null) {
      if (Array.isArray(value)) {
        value.forEach((item, i) => {
          if (typeof item === 'object' && item !== null) {
            validateInputs(item, `${currentPath}[${i}]`);
          } else if (item === '0x' || item === '' || item === undefined || item === null) {
            throw new Error(`Invalid circuit input at ${currentPath}[${i}]: ${item}`);
          }
        });
      } else {
        validateInputs(value, currentPath);
      }
    }
  }
}

/**
 * Generate a ZK proof for a named circuit.
 * @param {string} circuitName - 'shuffle' | 'deal' | 'show'
 * @param {object} inputs      - Circuit input map (all values as strings)
 * @returns {Promise<import('./types.js').ZKProof>}
 */
async function generateProof(circuitName, inputs) {
  const artifact = CIRCUIT_ARTIFACTS[circuitName];
  if (!artifact) throw new Error(`Unknown circuit: ${circuitName}`);

  console.log(`[ZK] Generating proof for ${circuitName}...`);
  validateInputs(inputs);

  const startTime = performance.now();
  const circuit = await loadCircuit(artifact);

  // Execute circuit → witness
  console.log(`[ZK] Executing circuit ${circuitName}...`);
  const { witness } = await circuit.noir.execute(inputs);

  // Generate proof with keccak: true (keccak256 transcript for EVM Solidity verifier)
  console.log(`[ZK] Generating proof (keccak: true)...`);
  const proof = await circuit.backend.generateProof(witness, { keccak: true });

  // Get verification key
  const vk = await getVerificationKey(circuit);

  const elapsed = (performance.now() - startTime).toFixed(0);
  console.log(`[ZK] Proof generated for ${circuitName} in ${elapsed}ms`);

  return {
    proof: proof.proof,
    publicInputs: proof.publicInputs,
    verificationKey: vk,
  };
}

/**
 * Verify a proof locally.
 * @param {string} circuitName
 * @param {import('./types.js').ZKProof} proof
 * @returns {Promise<import('./types.js').VerificationResult>}
 */
async function verifyProofLocally(circuitName, proof) {
  const artifact = CIRCUIT_ARTIFACTS[circuitName];
  if (!artifact) return { valid: false, error: `Unknown circuit: ${circuitName}` };

  try {
    console.log(`[ZK] Verifying proof for ${circuitName}...`);
    const circuit = await loadCircuit(artifact);

    const isValid = await circuit.backend.verifyProof(
      { proof: proof.proof, publicInputs: proof.publicInputs },
      { keccak: true }
    );

    console.log(`[ZK] Verification for ${circuitName}: ${isValid}`);
    return { valid: isValid };
  } catch (error) {
    return { valid: false, error: error.message || 'Unknown verification error' };
  }
}

// ─── Per-Circuit Proof Generators ────────────────────────────────────────────

/**
 * Generate a shuffle proof.
 * Proves that uids_out is a valid permutation of uids_in.
 * @param {import('./types.js').ShuffleCircuitInput} input
 * @returns {Promise<import('./types.js').ZKProof>}
 */
export async function generateShuffleProof(input) {
  return generateProof('shuffle', {
    uids_in: input.uids_in.map(fieldToDecimalString),
    uids_out: input.uids_out.map(fieldToDecimalString),
  });
}

/**
 * Generate a deal proof.
 * Proves that 3 cards were correctly dealt from the committed deck.
 * @param {import('./types.js').DealCircuitInput} input
 * @returns {Promise<import('./types.js').ZKProof>}
 */
export async function generateDealProof(input) {
  return generateProof('deal', {
    player_id: fieldToDecimalString(input.player_id),
    merkle_root: fieldToDecimalString(input.merkle_root),
    positions: input.positions.map(String),
    card_uids: input.card_uids.map(fieldToDecimalString),
    nonces: input.nonces.map(fieldToDecimalString),
    merkle_paths: input.merkle_paths.map((mp) => ({
      path: mp.path.map(fieldToDecimalString),
      indices: mp.indices.map(String),
    })),
  });
}

/**
 * Generate a show proof.
 * Reveals a player's 3-card hand with verifiable ranking.
 * @param {import('./types.js').ShowCircuitInput} input
 * @returns {Promise<import('./types.js').ZKProof>}
 */
export async function generateShowProof(input) {
  return generateProof('show', {
    game_id: fieldToDecimalString(input.game_id),
    player_id: fieldToDecimalString(input.player_id),
    merkle_root: fieldToDecimalString(input.merkle_root),
    card_rank_0: String(input.card_rank_0),
    card_rank_1: String(input.card_rank_1),
    card_rank_2: String(input.card_rank_2),
    card_suit_0: String(input.card_suit_0),
    card_suit_1: String(input.card_suit_1),
    card_suit_2: String(input.card_suit_2),
    hand_rank: String(input.hand_rank),
    hand_value: fieldToDecimalString(input.hand_value),
    card_uids: input.card_uids.map(fieldToDecimalString),
    nonces: input.nonces.map(fieldToDecimalString),
    merkle_paths: input.merkle_paths.map((mp) => ({
      path: mp.path.map(fieldToDecimalString),
      indices: mp.indices.map(String),
    })),
    positions: input.positions.map(String),
  });
}

// ─── Per-Circuit Verifiers ───────────────────────────────────────────────────

/** @param {import('./types.js').ZKProof} proof */
export async function verifyShuffleProof(proof) {
  return verifyProofLocally('shuffle', proof);
}

/** @param {import('./types.js').ZKProof} proof */
export async function verifyDealProof(proof) {
  return verifyProofLocally('deal', proof);
}

/** @param {import('./types.js').ZKProof} proof */
export async function verifyShowProof(proof) {
  return verifyProofLocally('show', proof);
}

// ─── Utilities ───────────────────────────────────────────────────────────────

/**
 * Convert proof bytes to hex string for on-chain submission.
 * @param {Uint8Array} proof
 * @returns {string}
 */
export function proofToHex(proof) {
  return '0x' + Array.from(proof).map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Convert hex string back to proof bytes.
 * @param {string} hex
 * @returns {Uint8Array}
 */
export function hexToProof(hex) {
  const cleanHex = hex.startsWith('0x') ? hex.slice(2) : hex;
  const bytes = new Uint8Array(cleanHex.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(cleanHex.substr(i * 2, 2), 16);
  }
  return bytes;
}

/**
 * Preload all Teen Patti circuits for faster proof generation.
 */
export async function preloadCircuits() {
  console.log('[ZK] Preloading all circuits...');
  const startTime = performance.now();

  await Promise.all([
    loadCircuit(CIRCUIT_ARTIFACTS.shuffle),
    loadCircuit(CIRCUIT_ARTIFACTS.deal),
    loadCircuit(CIRCUIT_ARTIFACTS.show),
  ]);

  const elapsed = (performance.now() - startTime).toFixed(0);
  console.log(`[ZK] All circuits preloaded in ${elapsed}ms`);
}

/**
 * Clear circuit cache and reset module state.
 */
export function clearCircuitCache() {
  circuitCache.clear();
  modulesLoaded = false;
  wasmInitialized = false;
  initializationPromise = null;
  crsInterceptorInstalled = false;
  Noir = null;
  UltraHonkBackend = null;
  Barretenberg = null;
  bbApi = null;
  console.log('[ZK] Circuit cache and module state cleared');
}

/**
 * Check if ZK modules are loaded and ready.
 * @returns {boolean}
 */
export function isZKReady() {
  return modulesLoaded && wasmInitialized;
}
