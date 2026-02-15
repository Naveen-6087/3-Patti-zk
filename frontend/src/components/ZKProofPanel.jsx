import React, { useState, useEffect, useCallback, useRef } from 'react';
import gsap from 'gsap';
import { useZK } from '../lib/zk/ZKContext';
import { useWalletClient, useSwitchChain, useAccount } from 'wagmi';

const BASE_SEPOLIA_CHAIN_ID = 84532;
function ZKIcon({ status }) {
  const colorMap = {
    idle: 'text-gray-400',
    loading: 'text-yellow-400',
    ready: 'text-green-400',
    error: 'text-red-400',
  };

  const iconRef = useRef(null);

  useEffect(() => {
    if (status === 'loading' && iconRef.current) {
      gsap.to(iconRef.current, { rotation: 360, duration: 2, repeat: -1, ease: 'linear' });
    } else if (iconRef.current) {
      gsap.killTweensOf(iconRef.current);
      gsap.set(iconRef.current, { rotation: 0 });
    }
  }, [status]);

  return (
    <svg
      ref={iconRef}
      className={`w-5 h-5 ${colorMap[status] || 'text-gray-400'}`}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M12 2L2 7l10 5 10-5-10-5z" />
      <path d="M2 17l10 5 10-5" />
      <path d="M2 12l10 5 10-5" />
    </svg>
  );
}

function ProofToast({ notification, onDismiss }) {
  const toastRef = useRef(null);

  const typeStyles = {
    generating: 'bg-yellow-500/20 border-yellow-500/40 text-yellow-200',
    success: 'bg-green-500/20 border-green-500/40 text-green-200',
    error: 'bg-red-500/20 border-red-500/40 text-red-200',
    submitting: 'bg-blue-500/20 border-blue-500/40 text-blue-200',
  };

  const typeIcons = {
    generating: '⏳',
    success: '✓',
    error: '✗',
    submitting: '📡',
  };

  useEffect(() => {
    if (toastRef.current) {
      gsap.fromTo(toastRef.current,
        { opacity: 0, y: -20, scale: 0.95 },
        { opacity: 1, y: 0, scale: 1, duration: 0.3, ease: 'power2.out' }
      );
    }

    const timer = setTimeout(() => {
      if (toastRef.current) {
        gsap.to(toastRef.current, {
          opacity: 0, y: -20, scale: 0.95, duration: 0.2,
          onComplete: onDismiss,
        });
      } else {
        onDismiss();
      }
    }, 4000);

    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div
      ref={toastRef}
      className={`${typeStyles[notification.type]} border backdrop-blur-md text-sm px-4 py-3 rounded-lg shadow-lg flex items-center gap-3 min-w-[280px]`}
    >
      <span className="text-lg">{typeIcons[notification.type]}</span>
      <div className="flex-1">
        <div className="font-medium">ZK Proof: {notification.circuit}</div>
        <div className="text-xs opacity-80">{notification.message}</div>
      </div>
      <button onClick={onDismiss} className="text-white/50 hover:text-white transition-colors">
        ✕
      </button>
    </div>
  );
}

function OnChainVerificationSection({ proofs }) {
  const [verifyingId, setVerifyingId] = useState(null);
  const [recordingId, setRecordingId] = useState(null);
  const [verificationResults, setVerificationResults] = useState({});
  const [showAll, setShowAll] = useState(false);

  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const { chain, isConnected } = useAccount();

  /** Read-only on-chain verify (no gas) */
  const handleVerifyOnChain = useCallback(async (proof) => {
    setVerifyingId(proof.id);

    try {
      const { verifyOnChain } = await import('../lib/zk/onChainVerifier.js');
      const circuitType = proof.circuitName;
      const result = await verifyOnChain(circuitType, proof.proof);

      setVerificationResults((prev) => ({
        ...prev,
        [proof.id]: { verified: result.verified, error: result.error },
      }));

      if (window.zkNotify) {
        if (result.verified) {
          window.zkNotify('success', circuitType, 'On-chain verification successful! ✓');
        } else {
          window.zkNotify('error', circuitType, `On-chain verification failed: ${result.error || 'Unknown'}`);
        }
      }
    } catch (error) {
      setVerificationResults((prev) => ({
        ...prev,
        [proof.id]: { verified: false, error: error.message || 'Verification failed' },
      }));
    } finally {
      setVerifyingId(null);
    }
  }, []);

  /** Record on-chain with transaction (MetaMask popup, costs gas) */
  const handleRecordOnChain = useCallback(async (proof) => {
    if (!isConnected || !walletClient) {
      if (window.zkNotify) {
        window.zkNotify('error', proof.circuitName, 'Connect your wallet first to record on-chain');
      }
      return;
    }

    // Switch to Base Sepolia if needed
    if (chain?.id !== BASE_SEPOLIA_CHAIN_ID) {
      try {
        await switchChain({ chainId: BASE_SEPOLIA_CHAIN_ID });
      } catch (err) {
        if (window.zkNotify) {
          window.zkNotify('error', proof.circuitName, 'Failed to switch to Base Sepolia');
        }
        return;
      }
    }

    setRecordingId(proof.id);

    try {
      const { verifyOnChainWithTransaction } = await import('../lib/zk/onChainVerifier.js');
      const circuitType = proof.circuitName;
      const result = await verifyOnChainWithTransaction(circuitType, proof.proof, walletClient);

      setVerificationResults((prev) => ({
        ...prev,
        [proof.id]: {
          verified: result.verified,
          error: result.error,
          txHash: result.txHash,
          gasUsed: result.gasUsed,
          recorded: true,
        },
      }));

      if (window.zkNotify) {
        if (result.verified) {
          window.zkNotify('success', circuitType, `Recorded on-chain! TX: ${result.txHash?.slice(0, 10)}...`);
        } else if (result.error === 'Transaction rejected by user') {
          window.zkNotify('error', circuitType, 'Transaction cancelled');
        } else {
          window.zkNotify('error', circuitType, `Recording failed: ${result.error || 'Unknown'}`);
        }
      }
    } catch (error) {
      setVerificationResults((prev) => ({
        ...prev,
        [proof.id]: { verified: false, error: error.message || 'Recording failed' },
      }));
    } finally {
      setRecordingId(null);
    }
  }, [walletClient, switchChain, chain, isConnected]);

  /** Verify all unverified proofs */
  const handleVerifyAll = useCallback(async () => {
    for (const proof of proofs.slice(0, 10)) {
      if (!verificationResults[proof.id]) {
        await handleVerifyOnChain(proof);
      }
    }
  }, [proofs, verificationResults, handleVerifyOnChain]);

  const displayProofs = showAll ? proofs : proofs.slice(-5).reverse();
  const unverifiedCount = proofs.filter((p) => !verificationResults[p.id]).length;

  return (
    <div className="bg-white/5 rounded-lg p-3 text-xs space-y-2">
      <div className="flex items-center justify-between mb-2">
        <div className="font-medium text-gray-300">On-Chain Verification ({proofs.length})</div>
        {unverifiedCount > 0 && (
          <button
            onClick={handleVerifyAll}
            disabled={verifyingId !== null}
            className="px-2 py-1 bg-blue-600/80 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white text-xs transition-colors"
          >
            Verify All ({unverifiedCount})
          </button>
        )}
      </div>

      <div className="text-green-400/60 text-xs mb-1">✓ Verifying on Base Sepolia</div>

      <div className="space-y-1.5 max-h-[200px] overflow-y-auto custom-scrollbar pr-1">
        {displayProofs.map((proof) => {
          const result = verificationResults[proof.id];
          const isVerifying = verifyingId === proof.id;
          const isRecording = recordingId === proof.id;

          return (
            <div
              key={proof.id}
              className="flex items-center justify-between bg-white/5 rounded-lg px-2.5 py-2 hover:bg-white/[0.07] transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-gray-300 capitalize text-xs font-medium">{proof.circuitName}</span>
                <span className="text-gray-600 text-[10px]">
                  {new Date(proof.timestamp).toLocaleTimeString()}
                </span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0">
                {result ? (
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] ${result.verified ? 'text-green-400' : 'text-red-400'}`}>
                      {result.verified ? '✓ Verified' : `✗ ${result.error || 'Failed'}`}
                    </span>
                    {result.txHash && (
                      <a
                        href={`https://sepolia.basescan.org/tx/${result.txHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-purple-400 hover:text-purple-300 text-[10px] font-medium"
                      >
                        📜 TX
                      </a>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    {/* Verify button (free, read-only) */}
                    <button
                      onClick={() => handleVerifyOnChain(proof)}
                      disabled={isVerifying || isRecording}
                      className="px-2 py-0.5 bg-blue-600/80 hover:bg-blue-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white transition-colors text-[11px]"
                      title="Verify proof on-chain (free, no gas)"
                    >
                      {isVerifying ? <span className="animate-spin inline-block">⟳</span> : 'Verify'}
                    </button>
                    {/* Record button (gas, MetaMask) */}
                    <button
                      onClick={() => handleRecordOnChain(proof)}
                      disabled={isVerifying || isRecording}
                      className="px-2 py-0.5 bg-purple-600/80 hover:bg-purple-600 disabled:bg-gray-600 disabled:cursor-not-allowed rounded text-white transition-colors text-[11px]"
                      title="Record proof on-chain (costs gas, triggers MetaMask)"
                    >
                      {isRecording ? <span className="animate-spin inline-block">⟳</span> : '📜 Record'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-gray-500 pt-1.5 border-t border-white/5">
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-blue-500" />
          Verify = Free (read-only)
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-purple-500" />
          📜 = Record on-chain (gas)
        </span>
      </div>

      {proofs.length > 5 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="w-full text-center text-gray-500 hover:text-gray-300 transition-colors py-1 text-[11px]"
        >
          {showAll ? '▲ Show Latest 5' : `▼ Load More (${proofs.length - 5} older)`}
        </button>
      )}
    </div>
  );
}

/**
 * @param {Object} props
 * @param {boolean} props.enabled  - Whether ZK proofs are enabled
 * @param {(enabled: boolean) => void} props.onToggle - Toggle callback
 * @param {{ proofsGenerated: number, proofsVerified: number, totalGenerationTime: number }} [props.stats]
 */
export default function ZKProofPanel({ enabled, onToggle, stats }) {
  const zkContext = useZK();
  const [isExpanded, setIsExpanded] = useState(false);
  const [notifications, setNotifications] = useState([]);

  const panelContentRef = useRef(null);
  const chevronRef = useRef(null);

  // ── Notification system ────────────────────────────────────────────────────

  const addNotification = useCallback((type, circuit, message) => {
    const notification = {
      id: `${Date.now()}-${Math.random()}`,
      type,
      circuit,
      message,
      timestamp: Date.now(),
    };
    setNotifications((prev) => [notification, ...prev].slice(0, 5));
  }, []);

  const dismissNotification = useCallback((id) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  // Expose globally so ZK services can push notifications
  useEffect(() => {
    window.zkNotify = addNotification;
    return () => { delete window.zkNotify; };
  }, [addNotification]);

  // ── Expand/Collapse animation ──────────────────────────────────────────────

  useEffect(() => {
    if (chevronRef.current) {
      gsap.to(chevronRef.current, { rotation: isExpanded ? 180 : 0, duration: 0.3 });
    }
  }, [isExpanded]);

  // ── Status helpers ─────────────────────────────────────────────────────────

  const getStatusText = () => {
    if (!enabled) return 'Disabled';
    if (zkContext.isLoading) return 'Loading circuits...';
    if (zkContext.error) return 'Error';
    if (zkContext.isReady) return 'Ready';
    return 'Initializing...';
  };

  const getStatusColor = () => {
    if (!enabled) return 'bg-gray-600';
    if (zkContext.isLoading) return 'bg-yellow-500';
    if (zkContext.error) return 'bg-red-500';
    if (zkContext.isReady) return 'bg-green-500';
    return 'bg-gray-500';
  };

  // ── Toggle Knob ────────────────────────────────────────────────────────────

  const toggleKnobRef = useRef(null);

  useEffect(() => {
    if (toggleKnobRef.current) {
      gsap.to(toggleKnobRef.current, { x: enabled ? 24 : 2, duration: 0.2, ease: 'power2.out' });
    }
  }, [enabled]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      {/* Toast Notifications (top-left) */}
      <div className="fixed top-20 left-4 z-[70] flex flex-col gap-2">
        {notifications.map((n) => (
          <ProofToast
            key={n.id}
            notification={n}
            onDismiss={() => dismissNotification(n.id)}
          />
        ))}
      </div>

      {/* Main Panel (bottom-left) */}
      <div className="fixed bottom-4 left-4 z-[70] max-h-[80vh]">
        <div className="bg-black/80 backdrop-blur-md rounded-xl border border-white/10 text-white overflow-hidden shadow-2xl max-w-sm">

          {/* ── Header (always visible) ────────────────────────────────── */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full px-4 py-3 flex items-center justify-between hover:bg-white/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              <ZKIcon
                status={
                  zkContext.isLoading ? 'loading' :
                  zkContext.isReady ? 'ready' :
                  zkContext.error ? 'error' : 'idle'
                }
              />
              <span className="font-medium">ZK Proofs</span>
              <span className={`${getStatusColor()} px-2 py-0.5 rounded-full text-xs`}>
                {getStatusText()}
              </span>
            </div>
            <span ref={chevronRef} className="text-gray-400 inline-block">▼</span>
          </button>

          {/* ── Expanded Content ────────────────────────────────────────── */}
          {isExpanded && (
            <div
              ref={panelContentRef}
              className="border-t border-white/10 max-h-[65vh] overflow-y-auto custom-scrollbar"
            >
              <div className="p-4 space-y-4">

                {/* Toggle */}
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-300">Enable ZK Proofs</span>
                  <button
                    onClick={() => onToggle(!enabled)}
                    className={`relative w-12 h-6 rounded-full transition-colors ${
                      enabled ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <div
                      ref={toggleKnobRef}
                      className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-md"
                      style={{ left: 0 }}
                    />
                  </button>
                </div>

                {/* Stats Grid */}
                {enabled && stats && (
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-gray-400 text-xs">Generated</div>
                      <div className="text-2xl font-bold">{stats.proofsGenerated}</div>
                    </div>
                    <div className="bg-white/5 rounded-lg p-3">
                      <div className="text-gray-400 text-xs">Verified</div>
                      <div className="text-2xl font-bold text-green-400">{stats.proofsVerified}</div>
                    </div>
                    {stats.proofsGenerated > 0 && (
                      <div className="col-span-2 bg-white/5 rounded-lg p-3">
                        <div className="text-gray-400 text-xs">Avg Generation Time</div>
                        <div className="text-lg font-medium">
                          {Math.round(stats.totalGenerationTime / stats.proofsGenerated)}ms
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* zkVerify Status */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">zkVerify (Kurier API)</span>
                  <span className={zkContext.isZkVerifyAvailable ? 'text-green-400' : 'text-gray-500'}>
                    {zkContext.isZkVerifyAvailable ? '● Connected' : '○ Not configured'}
                  </span>
                </div>

                {/* On-Chain Status */}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">On-Chain (Solidity)</span>
                  <span className="text-green-400">● Available</span>
                </div>

                {/* Recent Proofs & On-Chain Verification */}
                {enabled && zkContext.isReady && zkContext.recentProofs.length > 0 && (
                  <OnChainVerificationSection proofs={zkContext.recentProofs} />
                )}

                {/* Verification Methods Info */}
                {enabled && zkContext.isReady && (
                  <div className="bg-white/5 rounded-lg p-3 text-xs space-y-1.5">
                    <div className="font-medium text-gray-300 mb-2">Verification Methods:</div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 text-[10px]">●</span>
                      <span className="text-gray-400">Local (NoirJS WASM)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] ${zkContext.isZkVerifyAvailable ? 'text-green-400' : 'text-gray-600'}`}>
                        {zkContext.isZkVerifyAvailable ? '●' : '○'}
                      </span>
                      <span className="text-gray-400">zkVerify Network</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-green-400 text-[10px]">●</span>
                      <span className="text-gray-400">On-Chain (Base Sepolia)</span>
                    </div>
                  </div>
                )}

                {/* Error */}
                {zkContext.error && (
                  <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-3 text-sm text-red-300">
                    {zkContext.error}
                  </div>
                )}

                {/* Footer */}
                {enabled && zkContext.isReady && (
                  <div className="text-xs text-gray-500 text-center">
                    ZK proofs generated locally using NoirJS
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
/**
 * Trigger a ZK toast notification from anywhere.
 * @param {'generating'|'success'|'error'|'submitting'} type
 * @param {string} circuit
 * @param {string} message
 */
export function notifyZKProof(type, circuit, message) {
  if (window.zkNotify) {
    window.zkNotify(type, circuit, message);
  }
}
