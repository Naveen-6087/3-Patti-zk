use crate::types::DECK_SIZE;
use crate::constants::{RANK_TWO, RANK_ACE, SUIT_SPADES};

pub fn assert_unique_positions<let N: u32>(positions: [u32; N]) {
    for i in 0..N {
        for j in (i + 1)..N {
            assert(positions[i] != positions[j], "Duplicate position found");
        }
    }
}

pub fn assert_unique_fields<let N: u32>(values: [Field; N]) {
    for i in 0..N {
        for j in (i + 1)..N {
            assert(values[i] != values[j], "Duplicate field value found");
        }
    }
}

pub fn assert_valid_position(position: u32) {
    assert(position < DECK_SIZE, "Position out of range (must be < 52)");
}

pub fn assert_valid_rank(rank: u8) {
    assert(rank >= RANK_TWO, "Rank must be >= 2");
    assert(rank <= RANK_ACE, "Rank must be <= 14");
}

pub fn assert_valid_suit(suit: u8) {
    assert(suit <= SUIT_SPADES, "Suit must be <= 3");
}

pub fn assert_valid_card_inputs(rank: u8, suit: u8) {
    assert_valid_rank(rank);
    assert_valid_suit(suit);
}

#[test]
fn test_unique_positions() {
    let positions: [u32; 3] = [5, 10, 20];
    assert_unique_positions(positions);
}

#[test(should_fail)]
fn test_duplicate_positions_fail() {
    let positions: [u32; 3] = [5, 10, 5];
    assert_unique_positions(positions);
}

#[test]
fn test_unique_fields() {
    let values: [Field; 3] = [100, 200, 300];
    assert_unique_fields(values);
}

#[test]
fn test_valid_position() {
    assert_valid_position(0);
    assert_valid_position(51);
}

#[test(should_fail)]
fn test_invalid_position() {
    assert_valid_position(52);
}

#[test]
fn test_valid_card_inputs() {
    assert_valid_card_inputs(2, 0);
    assert_valid_card_inputs(14, 3);
}

#[test(should_fail)]
fn test_invalid_rank_low() {
    assert_valid_card_inputs(1, 0);
}

#[test(should_fail)]
fn test_invalid_rank_high() {
    assert_valid_card_inputs(15, 0);
}

#[test(should_fail)]
fn test_invalid_suit() {
    assert_valid_card_inputs(2, 4);
}
