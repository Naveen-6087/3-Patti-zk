import { useState, useCallback, useRef } from 'react';
import { ProofStatus } from './types.js';
import {
  generateShuffleProof,
  generateDealProof,
  generateShowProof,
  verifyShuffleProof,
  verifyDealProof,
  verifyShowProof,
} from './proofService.js';

// ─── Shared Proof State ──────────────────────────────────────────────────────

/**
 * @typedef {Object} ProofState
 * @property {string}                         status       - Current proof status
 * @property {import('./types.js').ZKProof | null} proof   - Generated proof
 * @property {string | null}                  error        - Error message
 * @property {number | null}                  generationMs - Proof generation time
 */

/**
 * Create initial proof state.
 * @returns {ProofState}
 */
function initialState() {
  return {
    status: ProofStatus.IDLE,
    proof: null,
    error: null,
    generationMs: null,
  };
}

// ─── useShuffleProof ─────────────────────────────────────────────────────────

/**
 * Hook for generating and verifying shuffle proofs.
 *
 * @returns {{
 *   status: string,
 *   proof: import('./types.js').ZKProof | null,
 *   error: string | null,
 *   generationMs: number | null,
 *   generate: (input: import('./types.js').ShuffleCircuitInput) => Promise<import('./types.js').ZKProof>,
 *   verifyLocally: () => Promise<boolean>,
 *   reset: () => void,
 * }}
 */
export function useShuffleProof() {
  const [state, setState] = useState(initialState);
  const proofRef = useRef(null);

  const generate = useCallback(async (input) => {
    setState({ status: ProofStatus.GENERATING, proof: null, error: null, generationMs: null });

    try {
      const startTime = performance.now();
      const proof = await generateShuffleProof(input);
      const elapsed = performance.now() - startTime;

      proofRef.current = proof;
      setState({ status: ProofStatus.GENERATED, proof, error: null, generationMs: Math.round(elapsed) });
      return proof;
    } catch (error) {
      const msg = error.message || 'Shuffle proof generation failed';
      setState((s) => ({ ...s, status: ProofStatus.FAILED, error: msg }));
      throw error;
    }
  }, []);

  const verifyLocally = useCallback(async () => {
    if (!proofRef.current) throw new Error('No proof to verify');

    setState((s) => ({ ...s, status: ProofStatus.VERIFYING }));
    try {
      const result = await verifyShuffleProof(proofRef.current);
      setState((s) => ({
        ...s,
        status: result.valid ? ProofStatus.VERIFIED : ProofStatus.FAILED,
        error: result.valid ? null : (result.error || 'Verification failed'),
      }));
      return result.valid;
    } catch (error) {
      setState((s) => ({ ...s, status: ProofStatus.FAILED, error: error.message }));
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    proofRef.current = null;
    setState(initialState());
  }, []);

  return {
    status: state.status,
    proof: state.proof,
    error: state.error,
    generationMs: state.generationMs,
    generate,
    verifyLocally,
    reset,
  };
}

// ─── useDealProof ────────────────────────────────────────────────────────────

/**
 * Hook for generating and verifying deal proofs.
 *
 * @returns {{
 *   status: string,
 *   proof: import('./types.js').ZKProof | null,
 *   error: string | null,
 *   generationMs: number | null,
 *   generate: (input: import('./types.js').DealCircuitInput) => Promise<import('./types.js').ZKProof>,
 *   verifyLocally: () => Promise<boolean>,
 *   reset: () => void,
 * }}
 */
export function useDealProof() {
  const [state, setState] = useState(initialState);
  const proofRef = useRef(null);

  const generate = useCallback(async (input) => {
    setState({ status: ProofStatus.GENERATING, proof: null, error: null, generationMs: null });

    try {
      const startTime = performance.now();
      const proof = await generateDealProof(input);
      const elapsed = performance.now() - startTime;

      proofRef.current = proof;
      setState({ status: ProofStatus.GENERATED, proof, error: null, generationMs: Math.round(elapsed) });
      return proof;
    } catch (error) {
      const msg = error.message || 'Deal proof generation failed';
      setState((s) => ({ ...s, status: ProofStatus.FAILED, error: msg }));
      throw error;
    }
  }, []);

  const verifyLocally = useCallback(async () => {
    if (!proofRef.current) throw new Error('No proof to verify');

    setState((s) => ({ ...s, status: ProofStatus.VERIFYING }));
    try {
      const result = await verifyDealProof(proofRef.current);
      setState((s) => ({
        ...s,
        status: result.valid ? ProofStatus.VERIFIED : ProofStatus.FAILED,
        error: result.valid ? null : (result.error || 'Verification failed'),
      }));
      return result.valid;
    } catch (error) {
      setState((s) => ({ ...s, status: ProofStatus.FAILED, error: error.message }));
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    proofRef.current = null;
    setState(initialState());
  }, []);

  return {
    status: state.status,
    proof: state.proof,
    error: state.error,
    generationMs: state.generationMs,
    generate,
    verifyLocally,
    reset,
  };
}

// ─── useShowProof ────────────────────────────────────────────────────────────

/**
 * Hook for generating and verifying show proofs.
 *
 * @returns {{
 *   status: string,
 *   proof: import('./types.js').ZKProof | null,
 *   error: string | null,
 *   generationMs: number | null,
 *   generate: (input: import('./types.js').ShowCircuitInput) => Promise<import('./types.js').ZKProof>,
 *   verifyLocally: () => Promise<boolean>,
 *   reset: () => void,
 * }}
 */
export function useShowProof() {
  const [state, setState] = useState(initialState);
  const proofRef = useRef(null);

  const generate = useCallback(async (input) => {
    setState({ status: ProofStatus.GENERATING, proof: null, error: null, generationMs: null });

    try {
      const startTime = performance.now();
      const proof = await generateShowProof(input);
      const elapsed = performance.now() - startTime;

      proofRef.current = proof;
      setState({ status: ProofStatus.GENERATED, proof, error: null, generationMs: Math.round(elapsed) });
      return proof;
    } catch (error) {
      const msg = error.message || 'Show proof generation failed';
      setState((s) => ({ ...s, status: ProofStatus.FAILED, error: msg }));
      throw error;
    }
  }, []);

  const verifyLocally = useCallback(async () => {
    if (!proofRef.current) throw new Error('No proof to verify');

    setState((s) => ({ ...s, status: ProofStatus.VERIFYING }));
    try {
      const result = await verifyShowProof(proofRef.current);
      setState((s) => ({
        ...s,
        status: result.valid ? ProofStatus.VERIFIED : ProofStatus.FAILED,
        error: result.valid ? null : (result.error || 'Verification failed'),
      }));
      return result.valid;
    } catch (error) {
      setState((s) => ({ ...s, status: ProofStatus.FAILED, error: error.message }));
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    proofRef.current = null;
    setState(initialState());
  }, []);

  return {
    status: state.status,
    proof: state.proof,
    error: state.error,
    generationMs: state.generationMs,
    generate,
    verifyLocally,
    reset,
  };
}
