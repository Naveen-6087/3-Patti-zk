use dep::zk_teen_patti::types::MerkleProof;
use dep::zk_teen_patti::card_uids::get_card_uid;
use dep::zk_teen_patti::encoding::commit_card;
use dep::zk_teen_patti::merkle::assert_merkle_proof;
use dep::zk_teen_patti::validation::{assert_unique_positions, assert_valid_position, assert_valid_card_inputs};
use dep::zk_teen_patti::hand_ranking::evaluate_hand;

fn main(
    game_id: pub Field,
    player_id: pub Field,
    merkle_root: pub Field,
    card_rank_0: pub u8,
    card_rank_1: pub u8,
    card_rank_2: pub u8,
    card_suit_0: pub u8,
    card_suit_1: pub u8,
    card_suit_2: pub u8,
    hand_rank: pub u8,
    hand_value: pub Field,
    card_uids: [Field; 3],
    nonces: [Field; 3],
    merkle_paths: [MerkleProof; 3],
    positions: [u32; 3],
) {
    let card_ranks: [u8; 3] = [card_rank_0, card_rank_1, card_rank_2];
    let card_suits: [u8; 3] = [card_suit_0, card_suit_1, card_suit_2];

    for i in 0..3 {
        assert_valid_card_inputs(card_ranks[i], card_suits[i]);
    }

    assert_unique_positions(positions);
    for i in 0..3 {
        assert_valid_position(positions[i]);
    }

    for i in 0..3 {
        let expected_uid = get_card_uid(card_ranks[i], card_suits[i]);
        assert(card_uids[i] == expected_uid, "Card UID does not match revealed rank/suit");
    }

    for i in 0..3 {
        let commitment = commit_card(card_uids[i], nonces[i]);
        assert_merkle_proof(commitment, merkle_paths[i], merkle_root);
    }

    let (computed_rank, computed_value) = evaluate_hand(card_ranks, card_suits);
    assert(computed_rank == hand_rank, "Hand rank mismatch");
    assert(computed_value == hand_value, "Hand value mismatch");

    let _ = game_id;
    let _ = player_id;
}
