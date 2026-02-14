// Suit codes (0-3)
pub global SUIT_HEARTS: u8 = 0;
pub global SUIT_DIAMONDS: u8 = 1;
pub global SUIT_CLUBS: u8 = 2;
pub global SUIT_SPADES: u8 = 3;

// Rank codes (2-14, Ace=14)
pub global RANK_TWO: u8 = 2;
pub global RANK_THREE: u8 = 3;
pub global RANK_FOUR: u8 = 4;
pub global RANK_FIVE: u8 = 5;
pub global RANK_SIX: u8 = 6;
pub global RANK_SEVEN: u8 = 7;
pub global RANK_EIGHT: u8 = 8;
pub global RANK_NINE: u8 = 9;
pub global RANK_TEN: u8 = 10;
pub global RANK_JACK: u8 = 11;
pub global RANK_QUEEN: u8 = 12;
pub global RANK_KING: u8 = 13;
pub global RANK_ACE: u8 = 14;

// Domain separation tags for pedersen hashing
pub global DOMAIN_CARD_UID: Field = 1;
pub global DOMAIN_CARD_COMMITMENT: Field = 2;
pub global DOMAIN_MOVE: Field = 3;
