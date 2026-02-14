use dep::zk_teen_patti::shuffle::check_shuffle;

fn main(
    uids_in: [Field; 52],
    uids_out: [Field; 52],
) {
    check_shuffle(uids_in, uids_out);
}

#[test]
fn test_shuffle_small() {
    let original: [Field; 5] = [100, 200, 300, 400, 500];
    let shuffled: [Field; 5] = [300, 500, 100, 400, 200];
    dep::zk_teen_patti::shuffle::check_shuffle(original, shuffled);
}

#[test]
fn test_shuffle_identity() {
    let deck: [Field; 4] = [10, 20, 30, 40];
    dep::zk_teen_patti::shuffle::check_shuffle(deck, deck);
}
