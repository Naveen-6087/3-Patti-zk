import {
  verifyShuffleProof,
  verifyDealProof,
  verifyShowProof,
} from './proofService.js';

import {
  verifyOnChain,
} from './onChainVerifier.js';

import {
  submitProofToZkVerify,
  isKurierAvailable,
} from './zkVerifyService.js';

// ─── Logging ─────────────────────────────────────────────────────────────────

function vLog(message, data) {
  const ts = new Date().toISOString().split('T')[1].slice(0, 12);
  console.log(`[${ts}] [Verify] ${message}`, data !== undefined ? data : '');
}

function vError(message, error) {
  const ts = new Date().toISOString().split('T')[1].slice(0, 12);
  console.error(`[${ts}] [Verify] ERROR: ${message}`, error !== undefined ? error : '');
}

// ─── Types ───────────────────────────────────────────────────────────────────

/**
 * @typedef {'shuffle' | 'deal' | 'show'} CircuitType
 */

/**
 * @typedef {Object} VerificationOptions
 * @property {boolean} [localVerify=true]  — Verify locally via WASM
 * @property {boolean} [zkVerify=false]    — Submit to zkVerify Kurier
 * @property {boolean} [onChain=false]     — Verify on-chain (read-only call)
 */

/**
 * @typedef {Object} ComprehensiveVerificationResult
 * @property {CircuitType} circuitType
 * @property {{ verified: boolean, timeMs: number, error?: string }} [local]
 * @property {{ submitted: boolean, jobId?: string, status?: string, error?: string }} [zkVerify]
 * @property {{ verified: boolean, error?: string }} [onChain]
 */

// ─── Local Verification ─────────────────────────────────────────────────────

/**
 * Verify a proof locally using the WASM circuit backend.
 *
 * @param {CircuitType} circuitType
 * @param {import('./types.js').ZKProof} proof
 * @returns {Promise<import('./types.js').VerificationResult>}
 */
export async function verifyLocally(circuitType, proof) {
  const startTime = performance.now();
  vLog(`Verifying ${circuitType} locally...`);

  try {
    let result;
    switch (circuitType) {
      case 'shuffle':
        result = await verifyShuffleProof(proof);
        break;
      case 'deal':
        result = await verifyDealProof(proof);
        break;
      case 'show':
        result = await verifyShowProof(proof);
        break;
      default:
        return { valid: false, error: `Unknown circuit: ${circuitType}` };
    }

    const elapsed = (performance.now() - startTime).toFixed(0);
    vLog(`${circuitType} local: ${result.valid ? 'PASS' : 'FAIL'} (${elapsed}ms)`);
    return result;
  } catch (error) {
    vError(`Local verification error:`, error);
    return { valid: false, error: error.message || 'Local verification error' };
  }
}

// ─── Comprehensive Verification ──────────────────────────────────────────────

/**
 * Run multi-layer verification pipeline.
 *
 * @param {CircuitType} circuitType
 * @param {import('./types.js').ZKProof} proof
 * @param {VerificationOptions} [options]
 * @returns {Promise<ComprehensiveVerificationResult>}
 */
export async function verifyProofComprehensive(
  circuitType,
  proof,
  options = {}
) {
  const {
    localVerify = true,
    zkVerify = false,
    onChain = false,
  } = options;

  /** @type {ComprehensiveVerificationResult} */
  const result = { circuitType };

  // ── Layer 1: Local verification ──
  if (localVerify) {
    const startTime = performance.now();
    const localResult = await verifyLocally(circuitType, proof);
    result.local = {
      verified: localResult.valid,
      timeMs: Math.round(performance.now() - startTime),
      error: localResult.error,
    };

    // If local fails, skip other layers
    if (!localResult.valid) {
      vError(`${circuitType} failed local verification, skipping other layers`);
      return result;
    }
  }

  // ── Layer 2: zkVerify (Kurier) ──
  if (zkVerify) {
    try {
      const available = await isKurierAvailable();
      if (!available) {
        result.zkVerify = {
          submitted: false,
          error: 'zkVerify not configured or unavailable',
        };
      } else {
        const submitResult = await submitProofToZkVerify({
          circuitName: circuitType,
          proof,
        });

        result.zkVerify = {
          submitted: true,
          jobId: submitResult.jobId,
          status: submitResult.optimisticVerify || 'Queued',
        };
      }
    } catch (error) {
      result.zkVerify = {
        submitted: false,
        error: error.message || 'zkVerify submission failed',
      };
    }
  }

  // ── Layer 3: On-chain verification ──
  if (onChain) {
    try {
      const onChainResult = await verifyOnChain(circuitType, proof);
      result.onChain = {
        verified: onChainResult.verified,
        error: onChainResult.error,
      };
    } catch (error) {
      result.onChain = {
        verified: false,
        error: error.message || 'On-chain verification failed',
      };
    }
  }

  vLog(`${circuitType} comprehensive result:`, {
    local: result.local?.verified,
    zkVerify: result.zkVerify?.submitted,
    onChain: result.onChain?.verified,
  });

  return result;
}

// ─── Convenience: Verify All Layers ──────────────────────────────────────────

/**
 * Full pipeline: local + zkVerify + on-chain.
 *
 * @param {CircuitType} circuitType
 * @param {import('./types.js').ZKProof} proof
 * @returns {Promise<ComprehensiveVerificationResult>}
 */
export async function verifyFull(circuitType, proof) {
  return verifyProofComprehensive(circuitType, proof, {
    localVerify: true,
    zkVerify: true,
    onChain: true,
  });
}
