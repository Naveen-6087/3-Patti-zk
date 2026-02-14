unconstrained fn __get_shuffle_indices<let N: u32>(
    lhs: [Field; N],
    rhs: [Field; N],
) -> [u32; N] {
    let mut shuffle_indices: [u32; N] = [0; N];
    let mut shuffle_mask: [bool; N] = [false; N];
    for i in 0..N {
        let mut found = false;
        for j in 0..N {
            if ((shuffle_mask[j] == false) & (!found)) {
                if (lhs[i] == rhs[j]) {
                    found = true;
                    shuffle_indices[i] = j;
                    shuffle_mask[j] = true;
                }
            }
        }
        assert(found == true, "check_shuffle: arrays do not contain equivalent values");
    }
    shuffle_indices
}

unconstrained fn __get_index<let N: u32>(indices: [u32; N], idx: u32) -> u32 {
    let mut result = 0;
    for i in 0..N {
        if (indices[i] == idx) {
            result = i;
            break;
        }
    }
    result
}

// Verifies rhs is a valid permutation of lhs
pub fn check_shuffle<let N: u32>(lhs: [Field; N], rhs: [Field; N]) {
    // Safety: unconstrained hints verified by assertions below
    let shuffle_indices = unsafe { __get_shuffle_indices(lhs, rhs) };

    for i in 0..N {
        // Safety: unconstrained hint verified by assertion below
        let idx = unsafe { __get_index(shuffle_indices, i) };
        assert(shuffle_indices[idx] == i, "Invalid bijection in shuffle_indices");
    }

    for i in 0..N {
        let idx = shuffle_indices[i];
        let expected = rhs[idx];
        let result = lhs[i];
        assert(expected == result, "Element mismatch in shuffle");
    }
}

#[test]
fn test_check_shuffle_valid() {
    let lhs: [Field; 5] = [10, 20, 30, 40, 50];
    let rhs: [Field; 5] = [30, 10, 50, 20, 40];
    check_shuffle(lhs, rhs);
}

#[test]
fn test_check_shuffle_identity() {
    let arr: [Field; 4] = [1, 2, 3, 4];
    check_shuffle(arr, arr);
}

#[test(should_fail)]
fn test_check_shuffle_invalid() {
    let lhs: [Field; 3] = [1, 2, 3];
    let rhs: [Field; 3] = [1, 2, 4];
    check_shuffle(lhs, rhs);
}

#[test]
fn test_check_shuffle_full_reverse() {
    let lhs: [Field; 6] = [1, 2, 3, 4, 5, 6];
    let rhs: [Field; 6] = [6, 5, 4, 3, 2, 1];
    check_shuffle(lhs, rhs);
}
