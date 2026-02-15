import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import addresses from '../../contracts/addresses.json';
import { proofToHex } from './proofService.js';

// ─── Config ──────────────────────────────────────────────────────────────────

/** Get verifier contract addresses from deployment */
function getVerifierAddresses() {
  // Try baseSepolia first, then hardhat
  const network = addresses.baseSepolia || addresses.hardhat || {};
  return {
    shuffle: network.ShuffleVerifier,
    deal: network.DealVerifier,
    show: network.ShowVerifier,
  };
}

/** Create a viem client for Base Sepolia */
function getClient() {
  return createPublicClient({
    chain: baseSepolia,
    transport: http('https://sepolia.base.org'),
  });
}

// ─── Verifier ABI ────────────────────────────────────────────────────────────

/**
 * Minimal ABI for UltraHonk verifier contracts.
 * All 3 verifiers (Shuffle, Deal, Show) share this interface.
 */
const VERIFIER_ABI = [
  {
    name: 'verify',
    type: 'function',
    stateMutability: 'view',
    inputs: [
      { name: '_proof', type: 'bytes' },
      { name: '_publicInputs', type: 'bytes32[]' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
];

// ─── Proof Formatting ────────────────────────────────────────────────────────

/**
 * Format a ZKProof for on-chain verification.
 * Converts proof bytes to hex and public inputs to bytes32 array.
 *
 * @param {import('./types.js').ZKProof} proof
 * @returns {{ proofBytes: string, publicInputs: string[] }}
 */
export function formatProofForContract(proof) {
  // Proof bytes → hex
  const proofBytes = proofToHex(proof.proof);

  // Public inputs → bytes32 (64 hex chars, 0x-prefixed)
  const publicInputs = proof.publicInputs.map((input) => {
    const inputStr = String(input);
    let hex;
    if (inputStr.startsWith('0x')) {
      hex = inputStr.slice(2);
    } else {
      // Decimal → hex
      hex = BigInt(inputStr).toString(16);
    }
    return '0x' + hex.padStart(64, '0');
  });

  return { proofBytes, publicInputs };
}

// ─── On-Chain Verification ───────────────────────────────────────────────────

/**
 * Verify a proof on-chain (read-only call, no gas).
 *
 * @param {'shuffle' | 'deal' | 'show'} circuitType
 * @param {import('./types.js').ZKProof} proof
 * @returns {Promise<{ verified: boolean, error?: string }>}
 */
export async function verifyOnChain(circuitType, proof) {
  const addrs = getVerifierAddresses();
  const address = addrs[circuitType];

  if (!address) {
    return { verified: false, error: `No ${circuitType} verifier address deployed` };
  }

  try {
    console.log(`[OnChain] Verifying ${circuitType} proof at ${address}...`);
    const client = getClient();
    const { proofBytes, publicInputs } = formatProofForContract(proof);

    console.log(`[OnChain] Proof: ${proofBytes.length / 2 - 1} bytes, ${publicInputs.length} public inputs`);

    const result = await client.readContract({
      address,
      abi: VERIFIER_ABI,
      functionName: 'verify',
      args: [proofBytes, publicInputs],
    });

    console.log(`[OnChain] ${circuitType} verification: ${result}`);
    return { verified: result };
  } catch (error) {
    console.error(`[OnChain] ${circuitType} verification failed:`, error);
    return {
      verified: false,
      error: error.shortMessage || error.message || 'On-chain verification failed',
    };
  }
}

/**
 * Verify a shuffle proof on-chain.
 * @param {import('./types.js').ZKProof} proof
 */
export async function verifyShuffleOnChain(proof) {
  return verifyOnChain('shuffle', proof);
}

/**
 * Verify a deal proof on-chain.
 * @param {import('./types.js').ZKProof} proof
 */
export async function verifyDealOnChain(proof) {
  return verifyOnChain('deal', proof);
}

/**
 * Verify a show proof on-chain.
 * @param {import('./types.js').ZKProof} proof
 */
export async function verifyShowOnChain(proof) {
  return verifyOnChain('show', proof);
}

// ─── On-Chain Verification with Transaction (MetaMask) ───────────────────────

/**
 * Verify a proof on-chain by submitting a real transaction (costs gas).
 * Triggers MetaMask for user approval.
 *
 * Flow: simulate → walletClient.writeContract (MetaMask popup) → wait receipt
 *
 * @param {'shuffle' | 'deal' | 'show'} circuitType
 * @param {import('./types.js').ZKProof} proof
 * @param {*} walletClient - Wagmi/viem walletClient (from useWalletClient)
 * @returns {Promise<{ verified: boolean, txHash?: string, gasUsed?: bigint, error?: string }>}
 */
export async function verifyOnChainWithTransaction(circuitType, proof, walletClient) {
  const addrs = getVerifierAddresses();
  const address = addrs[circuitType];

  if (!address) {
    return { verified: false, error: `No ${circuitType} verifier address deployed` };
  }

  if (!walletClient) {
    return { verified: false, error: 'No wallet connected. Please connect MetaMask.' };
  }

  try {
    console.log(`[OnChain] Recording ${circuitType} proof on-chain (with transaction)...`);

    // Use a dedicated Base Sepolia public client for simulation & receipt
    const baseSepoliaClient = getClient();
    const { proofBytes, publicInputs } = formatProofForContract(proof);

    console.log(`[OnChain] Proof: ${proofBytes.length / 2 - 1} bytes, ${publicInputs.length} public inputs`);
    console.log(`[OnChain] Verifier: ${address}`);

    // 1. Simulate first to check it will succeed
    console.log('[OnChain] Simulating transaction...');
    const { request } = await baseSepoliaClient.simulateContract({
      address,
      abi: VERIFIER_ABI,
      functionName: 'verify',
      args: [proofBytes, publicInputs],
    });

    console.log('[OnChain] Simulation successful, submitting transaction...');

    // 2. Submit the transaction — triggers MetaMask popup
    const txHash = await walletClient.writeContract(request);
    console.log(`[OnChain] Transaction submitted: ${txHash}`);

    // 3. Wait for confirmation
    const receipt = await baseSepoliaClient.waitForTransactionReceipt({
      hash: txHash,
      confirmations: 1,
    });

    const verified = receipt.status === 'success';
    console.log(`[OnChain] Transaction ${verified ? 'confirmed' : 'reverted'}: ${txHash}`);
    console.log(`[OnChain] Gas used: ${receipt.gasUsed?.toString()}`);

    return {
      verified,
      txHash,
      gasUsed: receipt.gasUsed,
    };
  } catch (error) {
    const message = error?.shortMessage || error?.message || 'Unknown error';

    // Handle user rejection gracefully
    if (message.includes('User rejected') || message.includes('user rejected')) {
      console.log('[OnChain] User rejected the transaction');
      return { verified: false, error: 'Transaction rejected by user' };
    }

    console.error(`[OnChain] ${circuitType} transaction verification failed:`, error);
    return { verified: false, error: message };
  }
}

/**
 * Submit a shuffle proof to the TeenPattiGame contract via startGameWithProof().
 *
 * @param {import('ethers').Contract} gameContract - Ethers.js game contract instance
 * @param {string} roomId       - Blockchain room ID (bytes32)
 * @param {string} deckCommitment - Merkle root of committed deck (bytes32)
 * @param {import('./types.js').ZKProof} proof
 * @returns {Promise<{ success: boolean, txHash?: string, error?: string }>}
 */
export async function submitShuffleProof(gameContract, roomId, deckCommitment, proof) {
  try {
    const { proofBytes, publicInputs } = formatProofForContract(proof);

    console.log('[OnChain] Submitting shuffle proof to startGameWithProof...');
    const tx = await gameContract.startGameWithProof(
      roomId,
      deckCommitment,
      proofBytes,
      publicInputs
    );

    console.log('[OnChain] TX sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('[OnChain] Shuffle proof confirmed');

    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error('[OnChain] Shuffle proof submission failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Submit a deal proof to the TeenPattiGame contract via verifyDeal().
 *
 * @param {import('ethers').Contract} gameContract
 * @param {string} roomId
 * @param {import('./types.js').ZKProof} proof
 * @returns {Promise<{ success: boolean, txHash?: string, error?: string }>}
 */
export async function submitDealProof(gameContract, roomId, proof) {
  try {
    const { proofBytes, publicInputs } = formatProofForContract(proof);

    console.log('[OnChain] Submitting deal proof to verifyDeal...');
    const tx = await gameContract.verifyDeal(roomId, proofBytes, publicInputs);

    console.log('[OnChain] TX sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('[OnChain] Deal proof confirmed');

    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error('[OnChain] Deal proof submission failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Submit a show proof to the TeenPattiGame contract via showHand().
 *
 * @param {import('ethers').Contract} gameContract
 * @param {string} roomId
 * @param {import('./types.js').ZKProof} proof
 * @returns {Promise<{ success: boolean, txHash?: string, error?: string }>}
 */
export async function submitShowProof(gameContract, roomId, proof) {
  try {
    const { proofBytes, publicInputs } = formatProofForContract(proof);

    console.log('[OnChain] Submitting show proof to showHand...');
    const tx = await gameContract.showHand(roomId, proofBytes, publicInputs);

    console.log('[OnChain] TX sent:', tx.hash);
    const receipt = await tx.wait();
    console.log('[OnChain] Show proof confirmed');

    return { success: true, txHash: tx.hash };
  } catch (error) {
    console.error('[OnChain] Show proof submission failed:', error);
    return { success: false, error: error.message };
  }
}
