use std::hash::pedersen_hash;
use crate::constants::{DOMAIN_CARD_UID, DOMAIN_CARD_COMMITMENT, DOMAIN_MOVE};

pub fn hash_2(a: Field, b: Field) -> Field {
    pedersen_hash([a, b])
}

pub fn hash_3(a: Field, b: Field, c: Field) -> Field {
    pedersen_hash([a, b, c])
}

pub fn hash_4(a: Field, b: Field, c: Field, d: Field) -> Field {
    pedersen_hash([a, b, c, d])
}

pub fn hash_card_uid(rank: u8, suit: u8) -> Field {
    hash_3(DOMAIN_CARD_UID, rank as Field, suit as Field)
}

pub fn hash_card_commitment(card_uid: Field, nonce: Field) -> Field {
    hash_3(DOMAIN_CARD_COMMITMENT, card_uid, nonce)
}

pub fn hash_merkle_node(left: Field, right: Field) -> Field {
    hash_2(left, right)
}

pub fn hash_move_commitment(game_id: Field, player_id: Field, hand_hash: Field) -> Field {
    hash_4(DOMAIN_MOVE, game_id, player_id, hand_hash)
}

#[test]
fn test_hash_deterministic() {
    let h1 = hash_2(1, 2);
    let h2 = hash_2(1, 2);
    assert(h1 == h2, "Hash should be deterministic");
}

#[test]
fn test_hash_different_inputs() {
    let h1 = hash_2(1, 2);
    let h2 = hash_2(2, 1);
    assert(h1 != h2, "Different inputs should produce different hashes");
}

#[test]
fn test_domain_separation() {
    let uid = hash_card_uid(14, 0);
    let commitment = hash_card_commitment(14, 0);
    assert(uid != commitment, "Domain separation should produce different hashes");
}
