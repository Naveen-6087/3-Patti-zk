pub global MERKLE_DEPTH: u32 = 6;
pub global DECK_SIZE: u32 = 52;
pub global HAND_SIZE: u32 = 3;
pub global MAX_PLAYERS: u32 = 6;
pub global NUM_RANKS: u32 = 13;
pub global NUM_SUITS: u32 = 4;

pub struct MerkleProof {
    pub path: [Field; 6],
    pub indices: [u1; 6],
}

// Hand ranks: higher = better
pub global HAND_HIGH_CARD: u8 = 1;
pub global HAND_PAIR: u8 = 2;
pub global HAND_COLOR: u8 = 3;
pub global HAND_SEQUENCE: u8 = 4;
pub global HAND_PURE_SEQUENCE: u8 = 5;
pub global HAND_TRAIL: u8 = 6;
