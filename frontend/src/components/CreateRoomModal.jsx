import { useState } from 'react';
import { ethers } from 'ethers';
import { X, Loader2, Users, Coins, AlertCircle, Trophy, Settings2, ShieldCheck, ArrowRight, Copy, Check } from 'lucide-react';
import Button from './Button';
import Input from './Input';
import { useContracts } from '@/hooks/useContracts';
import { useWallet } from '@/hooks/useWallet';
import { useAccount, useReadContract } from 'wagmi';
import TokenABI from '@/contracts/TeenPattiToken.json';
import addresses from '@/contracts/addresses.json';
import { cn } from '@/lib/utils';

export default function CreateRoomModal({ isOpen, onClose, onSuccess, socket }) {
  const { account } = useWallet();
  const { address: walletAddress } = useAccount();
  const { createRoom, approveTokens, gameContract, tokenContract, contractAddresses } = useContracts();

  // Get token balance
  const { data: balance } = useReadContract({
    address: addresses.baseSepolia?.TeenPattiToken,
    abi: TokenABI.abi,
    functionName: 'balanceOf',
    args: walletAddress ? [walletAddress] : undefined,
    query: {
      enabled: !!walletAddress,
    },
  });

  const [buyIn, setBuyIn] = useState('1000');
  const [maxPlayers, setMaxPlayers] = useState('4');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [step, setStep] = useState('input'); // input, approving, creating
  const [createdRoomCode, setCreatedRoomCode] = useState(''); // Short code for created room
  const [copiedCode, setCopiedCode] = useState(false);

  if (!isOpen) return null;

  async function handleCreate() {
    if (!account) {
      setError('Please connect your wallet');
      return;
    }

    if (!gameContract || !tokenContract || !contractAddresses) {
      setError('Contracts not initialized. Please wait a moment and try again.');
      return;
    }

    if (!buyIn || parseFloat(buyIn) <= 0) {
      setError('Please enter a valid buy-in amount');
      return;
    }

    if (!maxPlayers || parseInt(maxPlayers) < 2 || parseInt(maxPlayers) > 6) {
      setError('Max players must be between 2 and 6');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const buyInAmount = ethers.parseEther(buyIn);
      const players = parseInt(maxPlayers);

      // Step 1: Approve tokens
      setStep('approving');
      console.log('Approving tokens...');

      const approveResult = await approveTokens(
        contractAddresses.TeenPattiGame,
        buyInAmount
      );

      if (!approveResult.success) {
        throw new Error(approveResult.error || 'Failed to approve tokens');
      }

      console.log('Tokens approved:', approveResult.txHash);

      // Step 2: Create room on blockchain
      setStep('creating');
      setMessage('Tokens approved! Creating room...');
      console.log('Creating room on blockchain...');

      const createResult = await createRoom(buyInAmount, players);

      if (!createResult.success) {
        throw new Error(createResult.error || 'Failed to create room');
      }

      console.log('Room created on blockchain:', createResult);

      // Extract roomId from blockchain event
      const blockchainRoomId = createResult.roomId;

      // Step 3: Notify backend via Socket.IO
      if (socket) {
        // Convert balance to number (in tokens, not wei)
        const tokenBalance = balance ? parseFloat(ethers.formatEther(balance)) : 0;

        // Set up listeners BEFORE emitting to avoid race condition
        const roomCreatedPromise = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => {
            socket.off('roomCreated', onRoomCreated);
            socket.off('error', onError);
            // Fallback: navigate directly with blockchain room ID
            resolve({ roomId: blockchainRoomId, shortCode: null, fallback: true });
          }, 10000);

          const onRoomCreated = ({ roomId, shortCode }) => {
            clearTimeout(timeout);
            socket.off('error', onError);
            resolve({ roomId, shortCode });
          };

          const onError = ({ message: errMsg }) => {
            clearTimeout(timeout);
            socket.off('roomCreated', onRoomCreated);
            reject(new Error(errMsg));
          };

          socket.once('roomCreated', onRoomCreated);
          socket.once('error', onError);
        });

        socket.emit('createRoomWithBlockchain', {
          blockchainRoomId: blockchainRoomId.toString(),
          buyIn: buyIn,
          maxPlayers: players,
          creator: account,
          txHash: createResult.txHash,
          tokenBalance: tokenBalance,
          buyInTokens: Number(buyIn)
        });

        try {
          const { roomId, shortCode, fallback } = await roomCreatedPromise;
          setLoading(false);
          setStep('input');

          if (shortCode) {
            setCreatedRoomCode(shortCode);
            setMessage(`Room created! Share code: ${shortCode}`);
          }

          setTimeout(() => {
            onSuccess(roomId, blockchainRoomId);
          }, shortCode ? 1500 : 0);
        } catch (promiseErr) {
          setLoading(false);
          setStep('input');
          setError(promiseErr.message);
        }
      } else {
        // No socket, just return success
        setLoading(false);
        setStep('input');
        onSuccess(null, blockchainRoomId);
      }

    } catch (err) {
      console.error('Error creating room:', err);
      setLoading(false);
      setStep('input');

      let errorMessage = err.message;
      if (err.message.includes('user rejected')) {
        errorMessage = 'Transaction rejected by user';
      } else if (err.message.includes('insufficient funds')) {
        errorMessage = 'Insufficient token balance';
      }

      setError(errorMessage);
    }
  }

  function handleClose() {
    if (!loading) {
      setStep('input');
      setError('');
      setCreatedRoomCode('');
      setCopiedCode(false);
      onClose();
    }
  }

  function handleCopyCode() {
    if (createdRoomCode) {
      navigator.clipboard.writeText(createdRoomCode);
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-fade-in duration-300">
      <div className="glass-panel w-full max-w-lg rounded-3xl p-[1px] relative overflow-hidden shadow-2xl animate-zoom-in duration-300">

        {/* Animated Border */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/10 to-transparent pointer-events-none"></div>

        <div className="bg-[#050505]/95 backdrop-blur-2xl rounded-[23px] relative z-10 overflow-hidden flex flex-col max-h-[90vh]">

          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/5 bg-gradient-to-b from-white/5 to-transparent">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-gray-800 to-black border border-white/10 flex items-center justify-center shadow-inner">
                <Settings2 className="w-5 h-5 text-gray-300" />
              </div>
              <div>
                <h2 className="text-xl font-black text-white tracking-wide uppercase font-display">Create Table</h2>
                <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Configure Game Settings</p>
              </div>
            </div>

            <Button
              onClick={handleClose}
              disabled={loading}
              variant="ghost"
              size="icon"
              className="text-gray-500 hover:text-white transition-colors hover:bg-white/5 rounded-full"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>

          {/* Content */}
          <div className="p-8 space-y-8 overflow-y-auto custom-scrollbar">

            {/* Buy-in Section */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Coins className="w-3 h-3 text-yellow-500" />
                Entry Fee (TPT)
              </label>

              <div className="grid grid-cols-4 gap-2">
                {[100, 500, 1000, 5000].map(amount => (
                  <button
                    key={amount}
                    onClick={() => setBuyIn(amount.toString())}
                    disabled={loading}
                    className={cn(
                      "h-10 rounded-lg text-xs font-bold transition-all duration-200 border relative overflow-hidden group",
                      buyIn === amount.toString()
                        ? "bg-white text-black border-white shadow-[0_0_15px_rgba(255,255,255,0.2)] scale-105 z-10"
                        : "bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:border-white/20 hover:text-white"
                    )}
                  >
                    <span className="relative z-10 font-mono tracking-wider">{amount >= 1000 ? `${amount / 1000}K` : amount}</span>
                  </button>
                ))}
              </div>

              <div className="relative group">
                <Input
                  type="number"
                  value={buyIn}
                  onChange={(e) => setBuyIn(e.target.value)}
                  placeholder="Custom Amount"
                  min="1"
                  disabled={loading}
                  className="bg-black/50 border-white/10 text-white placeholder:text-gray-700 h-12 rounded-xl focus:border-white/20 transition-all focus:ring-1 focus:ring-white/10 pr-12 text-sm font-mono pl-4 shadow-inner w-full"
                />
                <div className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-bold text-gray-600 uppercase tracking-wider bg-white/5 px-1.5 py-0.5 rounded">
                  TPT
                </div>
              </div>
            </div>

            {/* Players Section */}
            <div className="space-y-4">
              <label className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em] flex items-center gap-2">
                <Users className="w-3 h-3 text-blue-400" />
                Table Capacity
              </label>
              <div className="flex bg-black/40 p-1 rounded-xl border border-white/10 relative">
                {[2, 3, 4, 5, 6].map(num => (
                  <button
                    key={num}
                    onClick={() => setMaxPlayers(num.toString())}
                    disabled={loading}
                    className={cn(
                      "flex-1 h-9 rounded-lg text-xs font-bold transition-all duration-300 relative z-10 font-mono",
                      maxPlayers === num.toString()
                        ? "bg-white/10 text-white shadow-lg text-shadow-sm border border-white/10"
                        : "text-gray-600 hover:text-gray-300 hover:bg-white/5"
                    )}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            {/* Status Messages */}
            <div className="space-y-4 min-h-[60px]">
              {loading && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-2xl p-4 flex items-center gap-4 animate-pulse">
                  <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center shrink-0">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  </div>
                  <div>
                    <p className="text-[10px] font-bold text-blue-300 uppercase tracking-widest mb-0.5">
                      {step === 'approving' ? 'Step 1/2: Approving' : 'Step 2/2: Creation'}
                    </p>
                    <p className="text-xs text-blue-100/70 font-medium">Check your wallet to confirm transaction</p>
                  </div>
                </div>
              )}

              {createdRoomCode && !loading && (
                <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/30 rounded-2xl p-5 space-y-3 animate-zoom-in">
                  <div className="flex items-center gap-2">
                    <Trophy className="w-5 h-5 text-green-400" />
                    <p className="text-[10px] font-bold text-green-300 uppercase tracking-widest">Room Created!</p>
                  </div>
                  <div className="bg-black/40 rounded-xl p-4 border border-white/10">
                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">Share this code:</p>
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-2xl font-black font-mono text-white tracking-wider">{createdRoomCode}</p>
                      <button
                        onClick={handleCopyCode}
                        className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg transition-all flex items-center gap-2 text-xs font-bold text-white hover:scale-105 active:scale-95"
                      >
                        {copiedCode ? (
                          <>
                            <Check className="w-4 h-4 text-green-400" />
                            <span className="text-green-400">Copied!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-4 h-4" />
                            <span>Copy</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400">Players can join using this 6-character code</p>
                </div>
              )}

              {message && !error && !loading && !createdRoomCode && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 flex items-center gap-3">
                  <ShieldCheck className="w-4 h-4 text-green-400" />
                  <p className="text-xs text-green-200 font-medium">{message}</p>
                </div>
              )}

              {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-200/90 leading-relaxed font-medium">{error}</p>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="pt-2 flex gap-4 border-t border-white/5 mt-auto">
              <Button
                onClick={handleClose}
                disabled={loading}
                variant="outline"
                className="flex-1 h-12 bg-transparent border-white/10 hover:bg-white/5 text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreate}
                disabled={loading || !gameContract || !tokenContract}
                className="flex-[2] h-12 bg-gradient-to-r from-amber-600 via-yellow-500 to-slate-300 hover:from-amber-500 hover:via-yellow-400 hover:to-slate-200 text-gray-900 font-black tracking-wide shadow-[0_0_20px_rgba(234,179,8,0.4)] border border-white/40"
              >
                {loading ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    Create Table <ArrowRight className="w-4 h-4" />
                  </span>
                )}
              </Button>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
