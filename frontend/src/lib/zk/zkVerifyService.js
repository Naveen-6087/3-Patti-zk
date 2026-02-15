import { proofToHex } from './proofService.js';
import vkHashes from './vkHashes.json';

// ─── Config ──────────────────────────────────────────────────────────────────

const KURIER_API_BASE =
  import.meta.env.VITE_KURIER_API_URL || 'https://api-testnet.kurier.xyz/api/v1';

const KURIER_API_KEY = import.meta.env.VITE_KURIER_API_KEY || '';

/** Polling interval for job status checks (ms) */
const POLL_INTERVAL = 5000;

/** Maximum polling attempts (~5 minutes at 5s intervals) */
const MAX_POLL_ATTEMPTS = 60;

/** Target chain for aggregation (Base Sepolia) */
const TARGET_CHAIN_ID = 84532;

// ─── Logging ─────────────────────────────────────────────────────────────────

function zkLog(message, data) {
  const ts = new Date().toISOString().split('T')[1].slice(0, 12);
  console.log(`[${ts}] [zkVerify] ${message}`, data !== undefined ? data : '');
}

function zkError(message, error) {
  const ts = new Date().toISOString().split('T')[1].slice(0, 12);
  console.error(`[${ts}] [zkVerify] ERROR: ${message}`, error !== undefined ? error : '');
}

// ─── Types (JSDoc) ───────────────────────────────────────────────────────────

/**
 * @typedef {'Queued'|'Valid'|'Submitted'|'IncludedInBlock'|'Finalized'|'AggregationPending'|'Aggregated'|'AggregationPublished'|'Failed'} KurierJobStatus
 */

/**
 * @typedef {Object} KurierSubmitResponse
 * @property {string} jobId
 * @property {string} [optimisticVerify] - 'success' or 'failed'
 * @property {string} [error]
 */

/**
 * @typedef {Object} KurierVerificationStatus
 * @property {string} jobId
 * @property {KurierJobStatus} status
 * @property {string} [txHash]
 * @property {string} [txExplorerUrl]
 * @property {string} [attestationId]
 * @property {string} [aggregatorUrl]
 * @property {string} [error]
 */

// ─── Submit Proof ─────────────────────────────────────────────────────────────

/**
 * Submit a proof to zkVerify for on-chain verification.
 *
 * @param {Object} options
 * @param {string} options.circuitName - 'shuffle' | 'deal' | 'show'
 * @param {import('./types.js').ZKProof} options.proof
 * @param {boolean} [options.vkRegistered=false] - Whether VK is pre-registered
 * @param {string}  [options.vkHash]            - VK hash if registered
 * @returns {Promise<KurierSubmitResponse>}
 */
export async function submitProofToZkVerify({ circuitName, proof, vkRegistered, vkHash }) {
  if (!KURIER_API_KEY) {
    throw new Error('VITE_KURIER_API_KEY is not configured. Get one at https://kurier.xyz');
  }

  // Auto-use registered VK hash if available
  const registeredHash = vkHashes[circuitName];
  const useRegistered = vkRegistered !== undefined ? vkRegistered : !!registeredHash;
  const effectiveVkHash = vkHash || registeredHash;

  if (!proof.verificationKey && !useRegistered) {
    throw new Error('Verification key is required for zkVerify submission');
  }

  zkLog(`Submitting ${circuitName} proof to Kurier...`);
  zkLog(`  API URL: ${KURIER_API_BASE}/submit-proof/<key>`);
  zkLog(`  VK registered: ${useRegistered}, VK hash: ${effectiveVkHash || 'N/A'}`);

  // Format proof as hex
  const proofHex = proofToHex(proof.proof);

  // Public signals as hex strings
  const publicSignals = proof.publicInputs.map((input) => {
    const s = String(input);
    if (s.startsWith('0x')) return s;
    return '0x' + BigInt(s).toString(16).padStart(64, '0');
  });

  // Build payload — matches zkVerify Kurier docs
  const payload = {
    proofType: 'ultrahonk',
    proofOptions: { variant: 'ZK' },
    vkRegistered: useRegistered,
    chainId: TARGET_CHAIN_ID,
    proofData: {
      proof: proofHex,
      publicSignals,
      vk: useRegistered && effectiveVkHash
        ? effectiveVkHash
        : proofToHex(proof.verificationKey),
    },
  };

  zkLog(`  Proof: ${proofHex.length} hex chars, ${publicSignals.length} public signals`);
  zkLog(`  Payload: proofType=${payload.proofType}, chainId=${payload.chainId}, vkRegistered=${payload.vkRegistered}`);

  const url = `${KURIER_API_BASE}/submit-proof/${KURIER_API_KEY}`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      zkError(`API error (${response.status}):`, data);
      const details = data.details?.map((d) => `${d.path}: ${d.message}`).join('; ') || '';
      throw new Error([data.message, data.error, details, `HTTP ${response.status}`].filter(Boolean).join(' - '));
    }

    zkLog(`Proof submitted. Job ID: ${data.jobId}`);
    if (data.optimisticVerify) {
      zkLog(`  Optimistic: ${data.optimisticVerify}`);
    }

    return data;
  } catch (error) {
    zkError('Submit failed:', error);
    throw error;
  }
}

// ─── Job Status ──────────────────────────────────────────────────────────────

/**
 * Check the verification status of a submitted proof.
 * @param {string} jobId
 * @returns {Promise<KurierVerificationStatus>}
 */
export async function getVerificationStatus(jobId) {
  if (!KURIER_API_KEY) throw new Error('VITE_KURIER_API_KEY not configured');

  const url = `${KURIER_API_BASE}/job-status/${KURIER_API_KEY}/${jobId}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const data = await response.json();

    if (!response.ok) {
      zkError(`Status check failed (${response.status}):`, data);
      throw new Error(data.message || data.error || `HTTP ${response.status}`);
    }

    zkLog(`Job ${jobId}: ${data.status}`);
    return data;
  } catch (error) {
    zkError('Status check failed:', error);
    throw error;
  }
}

// ─── Terminal Status Helpers ─────────────────────────────────────────────────

/** @param {KurierJobStatus} status */
function isTerminalStatus(status) {
  return ['Finalized', 'Aggregated', 'AggregationPublished', 'Failed'].includes(status);
}

/** @param {KurierJobStatus} status */
function isSuccessStatus(status) {
  return ['Finalized', 'Aggregated', 'AggregationPublished'].includes(status);
}

// ─── Wait for Verification ──────────────────────────────────────────────────

/**
 * Poll until a proof reaches a terminal status.
 *
 * @param {string} jobId
 * @param {(status: KurierVerificationStatus) => void} [onStatusUpdate]
 * @returns {Promise<KurierVerificationStatus>}
 */
export async function waitForVerification(jobId, onStatusUpdate) {
  zkLog(`Waiting for verification of job: ${jobId}`);

  let attempts = 0;

  while (attempts < MAX_POLL_ATTEMPTS) {
    const status = await getVerificationStatus(jobId);

    if (onStatusUpdate) onStatusUpdate(status);

    if (isSuccessStatus(status.status)) {
      zkLog(`Proof verified on-chain!`);
      if (status.txHash) zkLog(`  TX: ${status.txHash}`);
      if (status.txExplorerUrl) zkLog(`  Explorer: ${status.txExplorerUrl}`);
      return status;
    }

    if (status.status === 'Failed') {
      zkError(`Verification failed: ${status.error || 'Unknown'}`);
      throw new Error(`zkVerify verification failed: ${status.error || 'Unknown'}`);
    }

    await new Promise((r) => setTimeout(r, POLL_INTERVAL));
    attempts++;

    if (attempts % 10 === 0) {
      zkLog(`  Still waiting... (${attempts}/${MAX_POLL_ATTEMPTS})`);
    }
  }

  throw new Error('zkVerify verification timeout — max polling attempts exceeded');
}

// ─── Register Verification Key ──────────────────────────────────────────────

/**
 * Register a verification key with zkVerify.
 * Typically done once per circuit deployment.
 *
 * Uses proofOptions: { variant: "ZK" } for UltraHonk ZK proofs.
 *
 * @param {string} circuitName - 'shuffle' | 'deal' | 'show'
 * @param {Uint8Array} vk      - Verification key bytes
 * @returns {Promise<{ vkHash: string, registered: boolean }>}
 */
export async function registerVerificationKey(circuitName, vk) {
  if (!KURIER_API_KEY) throw new Error('VITE_KURIER_API_KEY not configured');

  zkLog(`Registering VK for ${circuitName}...`);

  const url = `${KURIER_API_BASE}/register-vk/${KURIER_API_KEY}`;

  const payload = {
    proofType: 'ultrahonk',
    vk: proofToHex(vk),
    proofOptions: {
      variant: 'ZK',
    },
  };

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      zkError(`VK registration failed (${response.status}):`, data);
      throw new Error(data.message || data.error || `HTTP ${response.status}`);
    }

    zkLog(`VK registered. Hash: ${data.vkHash}`);
    return data;
  } catch (error) {
    zkError('VK registration failed:', error);
    throw error;
  }
}

// ─── Batch Submission ────────────────────────────────────────────────────────

/**
 * Submit multiple proofs in parallel.
 *
 * @param {Array<{circuitName: string, proof: import('./types.js').ZKProof}>} proofs
 * @returns {Promise<{
 *   successful: Array<{circuitName: string, jobId: string}>,
 *   failed: Array<{circuitName: string, error: string}>
 * }>}
 */
export async function submitProofsBatch(proofs) {
  zkLog(`Submitting batch of ${proofs.length} proofs...`);

  const results = await Promise.allSettled(
    proofs.map((p) => submitProofToZkVerify(p))
  );

  const successful = [];
  const failed = [];

  results.forEach((result, i) => {
    const { circuitName } = proofs[i];
    if (result.status === 'fulfilled') {
      successful.push({ circuitName, jobId: result.value.jobId });
    } else {
      failed.push({ circuitName, error: result.reason?.message || 'Unknown error' });
    }
  });

  zkLog(`Batch: ${successful.length} ok, ${failed.length} failed`);
  return { successful, failed };
}

// ─── Health Check ────────────────────────────────────────────────────────────

/** @type {{ status: string, version: string, timestamp: string } | null} */
let cachedHealth = null;
let lastHealthCheck = 0;
const HEALTH_CACHE_MS = 60000;

/**
 * Check if zkVerify Kurier API is available.
 * @returns {Promise<{ status: 'healthy'|'degraded'|'down', version: string, timestamp: string }>}
 */
export async function checkKurierHealth() {
  const now = Date.now();
  if (cachedHealth && now - lastHealthCheck < HEALTH_CACHE_MS) {
    return cachedHealth;
  }

  if (!KURIER_API_KEY) {
    cachedHealth = { status: 'down', version: 'not-configured', timestamp: new Date().toISOString() };
    lastHealthCheck = now;
    return cachedHealth;
  }

  try {
    const response = await fetch(`${KURIER_API_BASE}/status`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (response.ok) {
      const data = await response.json();
      cachedHealth = { status: 'healthy', version: data.version || 'kurier-api', timestamp: new Date().toISOString() };
    } else {
      cachedHealth = { status: 'degraded', version: 'unknown', timestamp: new Date().toISOString() };
    }
  } catch {
    // If key is configured, assume available — actual submission will fail if not
    cachedHealth = { status: 'healthy', version: 'assumed-available', timestamp: new Date().toISOString() };
  }

  lastHealthCheck = now;
  return cachedHealth;
}

/**
 * Quick check: is Kurier configured and available?
 * @returns {Promise<boolean>}
 */
export async function isKurierAvailable() {
  if (!KURIER_API_KEY) return false;
  try {
    const health = await checkKurierHealth();
    return health.status !== 'down';
  } catch {
    return false;
  }
}
