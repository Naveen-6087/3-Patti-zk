use dep::zk_teen_patti::types::MerkleProof;
use dep::zk_teen_patti::encoding::commit_card;
use dep::zk_teen_patti::merkle::assert_merkle_proof;
use dep::zk_teen_patti::validation::{assert_unique_positions, assert_valid_position};

fn main(
    player_id: pub Field,
    merkle_root: pub Field,
    positions: [u32; 3],
    card_uids: [Field; 3],
    nonces: [Field; 3],
    merkle_paths: [MerkleProof; 3],
) {
    assert_unique_positions(positions);

    for i in 0..3 {
        assert_valid_position(positions[i]);
    }

    for i in 0..3 {
        let commitment = commit_card(card_uids[i], nonces[i]);
        assert_merkle_proof(commitment, merkle_paths[i], merkle_root);
    }

    let _ = player_id;
}
