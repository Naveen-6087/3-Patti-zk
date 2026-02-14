use crate::types::{MERKLE_DEPTH, MerkleProof};
use crate::hash::hash_merkle_node;

pub fn compute_merkle_root(leaf: Field, proof: MerkleProof) -> Field {
    let mut current = leaf;
    for i in 0..MERKLE_DEPTH {
        let sibling = proof.path[i];
        let is_right = proof.indices[i];
        if is_right == 1 {
            current = hash_merkle_node(sibling, current);
        } else {
            current = hash_merkle_node(current, sibling);
        }
    }
    current
}

pub fn assert_merkle_proof(leaf: Field, proof: MerkleProof, expected_root: Field) {
    let computed_root = compute_merkle_root(leaf, proof);
    assert(computed_root == expected_root, "Invalid Merkle proof: root mismatch");
}

pub fn verify_merkle_proof(leaf: Field, proof: MerkleProof, expected_root: Field) -> bool {
    let computed_root = compute_merkle_root(leaf, proof);
    computed_root == expected_root
}

#[test]
fn test_merkle_proof_simple() {
    let leaf_a: Field = 100;
    let leaf_b: Field = 200;
    let root = hash_merkle_node(leaf_a, leaf_b);

    let mut path: [Field; 6] = [0; 6];
    let mut indices: [u1; 6] = [0; 6];
    path[0] = leaf_b;

    let mut expected_root = root;
    for _i in 1..6 {
        expected_root = hash_merkle_node(expected_root, 0);
    }

    let proof = MerkleProof { path, indices };
    assert_merkle_proof(leaf_a, proof, expected_root);
}
