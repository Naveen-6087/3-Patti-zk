export {
  DECK_SIZE,
  MERKLE_DEPTH,
  HAND_SIZE,
  MAX_PLAYERS,
  SUIT,
  RANK,
  HAND_RANK,
  DOMAIN_CARD_UID,
  DOMAIN_CARD_COMMITMENT,
  DOMAIN_MOVE,
  CIRCUIT_ARTIFACTS,
  ProofStatus,
  CircuitType,
} from './types.js';

// Crypto utilities
export {
  pedersenHash,
  hashCardUID,
  hashCardCommitment,
  hashMerkleNode,
  hashMoveCommitment,
  generateNonce,
  generateCanonicalDeck,
  getCardIndex,
  buildMerkleTree,
  generateMerkleProof,
  commitDeck,
  fieldToDecimalString,
} from './crypto.js';

// Proof service
export {
  generateShuffleProof,
  generateDealProof,
  generateShowProof,
  verifyShuffleProof,
  verifyDealProof,
  verifyShowProof,
  preloadCircuits,
  clearCircuitCache,
  isZKReady,
  proofToHex,
  hexToProof,
} from './proofService.js';

// Game utilities
export {
  parseCard,
  cardToDisplay,
  cardToUID,
  cardsToUIDs,
  prepareDeckForZK,
  buildShuffleInput,
  buildDealInput,
  buildShowInput,
  evaluateHand,
  buildShowInputFromBackendCards,
} from './gameUtils.js';

// React hooks
export {
  useShuffleProof,
  useDealProof,
  useShowProof,
} from './hooks.js';

// ZK Context provider
export {
  ZKProvider,
  useZK,
} from './ZKContext.jsx';

// On-chain verifier
export {
  formatProofForContract,
  verifyOnChain,
  verifyOnChainWithTransaction,
  verifyShuffleOnChain,
  verifyDealOnChain,
  verifyShowOnChain,
  submitShuffleProof,
  submitDealProof,
  submitShowProof,
} from './onChainVerifier.js';

// zkVerify Kurier service
export {
  submitProofToZkVerify,
  getVerificationStatus,
  waitForVerification,
  registerVerificationKey,
  submitProofsBatch,
  checkKurierHealth,
  isKurierAvailable,
} from './zkVerifyService.js';

// Unified verification pipeline
export {
  verifyLocally,
  verifyProofComprehensive,
  verifyFull,
} from './verificationService.js';
