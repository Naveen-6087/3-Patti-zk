import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { preloadCircuits, isZKReady, clearCircuitCache } from './proofService.js';
import { generateCanonicalDeck } from './crypto.js';
import { isKurierAvailable, checkKurierHealth } from './zkVerifyService.js';

// ─── Context ─────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} ProofRecord
 * @property {string}  id           - Unique identifier
 * @property {string}  circuitName  - 'shuffle' | 'deal' | 'show'
 * @property {Date}    timestamp    - When the proof was generated
 * @property {import('./types.js').ZKProof} proof - The proof object
 * @property {string}  [jobId]      - zkVerify job ID (if submitted)
 * @property {Object}  [zkVerifyStatus] - Kurier status (if tracked)
 */

/**
 * @typedef {Object} ZKContextValue
 * @property {boolean}     isReady              - Whether ZK modules are loaded
 * @property {boolean}     isLoading            - Whether ZK modules are loading
 * @property {boolean}     isZkVerifyAvailable  - Whether Kurier API is reachable
 * @property {string|null} error                - Initialization error
 * @property {bigint[]|null} canonicalDeck      - Canonical 52-card UIDs (cached)
 * @property {ProofRecord[]} recentProofs       - Recent proof history
 * @property {() => Promise<void>} initialize   - Manually trigger initialization
 * @property {() => void}  reset                - Clear cache and reset state
 * @property {(circuitName: string, proof: import('./types.js').ZKProof) => string} trackProof - Add proof to history
 * @property {(id: string, jobId: string, status?: Object) => void} updateProofTracking - Update job info
 * @property {() => void}  clearProofHistory    - Clear recent proofs
 */

const ZKContext = createContext(null);

/**
 * Hook to access ZK context.
 * @returns {ZKContextValue}
 */
export function useZK() {
  const ctx = useContext(ZKContext);
  if (!ctx) {
    throw new Error('useZK must be used within a ZKProvider');
  }
  return ctx;
}

// ─── Provider ────────────────────────────────────────────────────────────────

const MAX_PROOF_HISTORY = 50;

/**
 * ZK Provider — wraps the app to provide ZK state.
 *
 * Automatically preloads circuits and generates the canonical deck
 * on mount. All ZK operations depend on this provider being ready.
 *
 * @param {{ children: React.ReactNode, autoInit?: boolean }} props
 */
export function ZKProvider({ children, autoInit = true }) {
  const [isReady, setIsReady] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isZkVerifyAvailable, setIsZkVerifyAvailable] = useState(false);
  const [error, setError] = useState(null);
  const [canonicalDeck, setCanonicalDeck] = useState(null);
  const [recentProofs, setRecentProofs] = useState([]);
  const initRef = useRef(false);

  const initialize = useCallback(async () => {
    if (initRef.current || isReady) return;
    initRef.current = true;
    setIsLoading(true);
    setError(null);

    try {
      console.log('[ZKProvider] Initializing ZK modules...');
      const startTime = performance.now();

      // Preload all 3 circuits (shuffle, deal, show)
      await preloadCircuits();

      // Generate canonical deck UIDs (deterministic, cached for the session)
      const deck = await generateCanonicalDeck();
      setCanonicalDeck(deck);

      // Check zkVerify (Kurier) availability
      const zkAvailable = await isKurierAvailable();
      setIsZkVerifyAvailable(zkAvailable);

      const elapsed = (performance.now() - startTime).toFixed(0);
      console.log(`[ZKProvider] ZK ready in ${elapsed}ms, zkVerify: ${zkAvailable}`);

      setIsReady(true);
    } catch (err) {
      console.error('[ZKProvider] Initialization failed:', err);
      setError(err.message || 'ZK initialization failed');
      initRef.current = false; // Allow retry
    } finally {
      setIsLoading(false);
    }
  }, [isReady]);

  /** Track a new proof in the panel history */
  const trackProof = useCallback((circuitName, proof) => {
    const id = `${circuitName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const record = { id, circuitName, timestamp: new Date(), proof };
    setRecentProofs((prev) => [record, ...prev].slice(0, MAX_PROOF_HISTORY));
    return id;
  }, []);

  /** Update a tracked proof with zkVerify job info */
  const updateProofTracking = useCallback((id, jobId, status) => {
    setRecentProofs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, jobId, zkVerifyStatus: status } : p))
    );
  }, []);

  /** Clear proof history */
  const clearProofHistory = useCallback(() => {
    setRecentProofs([]);
  }, []);

  const reset = useCallback(() => {
    clearCircuitCache();
    setIsReady(false);
    setIsLoading(false);
    setIsZkVerifyAvailable(false);
    setError(null);
    setCanonicalDeck(null);
    setRecentProofs([]);
    initRef.current = false;
    console.log('[ZKProvider] ZK state reset');
  }, []);

  // Auto-initialize on mount
  useEffect(() => {
    if (autoInit) {
      initialize();
    }
  }, [autoInit, initialize]);

  // Periodically check zkVerify availability (every 2 min)
  useEffect(() => {
    const apiKey = import.meta.env.VITE_KURIER_API_KEY;
    if (!apiKey) return;

    const check = async () => {
      try {
        const health = await checkKurierHealth();
        setIsZkVerifyAvailable(health.status !== 'down');
      } catch {
        setIsZkVerifyAvailable(false);
      }
    };

    check();
    const interval = setInterval(check, 120_000);
    return () => clearInterval(interval);
  }, []);

  const value = {
    isReady,
    isLoading,
    isZkVerifyAvailable,
    error,
    canonicalDeck,
    recentProofs,
    initialize,
    reset,
    trackProof,
    updateProofTracking,
    clearProofHistory,
  };

  return (
    <ZKContext.Provider value={value}>
      {children}
    </ZKContext.Provider>
  );
}
