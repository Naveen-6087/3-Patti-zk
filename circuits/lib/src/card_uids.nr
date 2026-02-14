use crate::hash::hash_card_uid;
use crate::constants::{RANK_TWO, RANK_ACE, SUIT_SPADES};

// card_uid = pedersen_hash([DOMAIN_CARD_UID, rank, suit])
pub fn get_card_uid(rank: u8, suit: u8) -> Field {
    assert(rank >= RANK_TWO, "Rank must be >= 2");
    assert(rank <= RANK_ACE, "Rank must be <= 14");
    assert(suit <= SUIT_SPADES, "Suit must be <= 3");
    hash_card_uid(rank, suit)
}

// index = (rank - 2) * 4 + suit
pub fn get_card_index(rank: u8, suit: u8) -> u32 {
    ((rank - RANK_TWO) as u32) * 4 + (suit as u32)
}

// Generate all 52 UIDs in canonical order: 2H,2D,2C,2S,...,AH,AD,AC,AS
pub fn generate_canonical_deck() -> [Field; 52] {
    let mut deck: [Field; 52] = [0; 52];
    for rank_offset in 0..13 {
        let rank = (rank_offset + 2) as u8;
        for suit in 0..4 {
            let idx = rank_offset * 4 + suit;
            deck[idx] = get_card_uid(rank, suit as u8);
        }
    }
    deck
}

#[test]
fn test_card_uid_deterministic() {
    let uid1 = get_card_uid(14, 0);
    let uid2 = get_card_uid(14, 0);
    assert(uid1 == uid2, "Same card should produce same UID");
}

#[test]
fn test_card_uid_unique() {
    let ace_hearts = get_card_uid(14, 0);
    let ace_diamonds = get_card_uid(14, 1);
    let king_hearts = get_card_uid(13, 0);
    assert(ace_hearts != ace_diamonds, "Different suits should have different UIDs");
    assert(ace_hearts != king_hearts, "Different ranks should have different UIDs");
}

#[test]
fn test_card_index() {
    assert(get_card_index(2, 0) == 0, "2H should be index 0");
    assert(get_card_index(2, 3) == 3, "2S should be index 3");
    assert(get_card_index(3, 0) == 4, "3H should be index 4");
    assert(get_card_index(14, 3) == 51, "AS should be index 51");
}

#[test]
fn test_canonical_deck_size() {
    let deck = generate_canonical_deck();
    for i in 0..52 {
        assert(deck[i] != 0, "Deck UID should not be zero");
    }
}

#[test]
fn test_canonical_deck_unique() {
    let deck = generate_canonical_deck();
    for i in 0..52 {
        for j in (i + 1)..52 {
            assert(deck[i] != deck[j], "All deck UIDs should be unique");
        }
    }
}
