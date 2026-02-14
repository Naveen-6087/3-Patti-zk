use crate::hash::hash_card_commitment;
use crate::card_uids::get_card_uid;
use crate::constants::{RANK_TWO, RANK_ACE, SUIT_SPADES};

pub fn verify_card_uid(rank: u8, suit: u8, expected_uid: Field) {
    let computed_uid = get_card_uid(rank, suit);
    assert(computed_uid == expected_uid, "Card UID mismatch");
}

pub fn commit_card(card_uid: Field, nonce: Field) -> Field {
    hash_card_commitment(card_uid, nonce)
}

pub fn assert_valid_card(rank: u8, suit: u8) {
    assert(rank >= RANK_TWO, "Rank must be >= 2");
    assert(rank <= RANK_ACE, "Rank must be <= 14 (Ace)");
    assert(suit <= SUIT_SPADES, "Suit must be <= 3");
}

#[test]
fn test_commit_card() {
    let uid = get_card_uid(14, 0);
    let nonce: Field = 12345;
    let c1 = commit_card(uid, nonce);
    let c2 = commit_card(uid, nonce);
    assert(c1 == c2, "Same inputs should produce same commitment");
}

#[test]
fn test_commit_different_nonces() {
    let uid = get_card_uid(14, 0);
    let c1 = commit_card(uid, 111);
    let c2 = commit_card(uid, 222);
    assert(c1 != c2, "Different nonces should produce different commitments");
}

#[test]
fn test_verify_card_uid() {
    let uid = get_card_uid(10, 2);
    verify_card_uid(10, 2, uid);
}

#[test]
fn test_assert_valid_card() {
    assert_valid_card(2, 0);
    assert_valid_card(14, 3);
    assert_valid_card(10, 2);
}
