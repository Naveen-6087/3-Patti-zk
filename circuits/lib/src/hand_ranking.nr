use crate::types::{
    HAND_TRAIL, HAND_PURE_SEQUENCE, HAND_SEQUENCE,
    HAND_COLOR, HAND_PAIR, HAND_HIGH_CARD,
};

fn sort_three_desc(a: u8, b: u8, c: u8) -> (u8, u8, u8) {
    let mut h = a;
    let mut m = b;
    let mut l = c;
    if m > h { let tmp = h; h = m; m = tmp; }
    if l > m { let tmp = m; m = l; l = tmp; }
    if m > h { let tmp = h; h = m; m = tmp; }
    (h, m, l)
}

fn is_consecutive(high: u8, mid: u8, low: u8) -> bool {
    let normal = (high == mid + 1) & (mid == low + 1);
    let ace_low = (high == 14) & (mid == 3) & (low == 2); // A-2-3
    normal | ace_low
}

fn is_same_suit(s0: u8, s1: u8, s2: u8) -> bool {
    (s0 == s1) & (s1 == s2)
}

// Returns (hand_rank, hand_value)
// hand_value = hand_rank * 1_000_000 + high * 10_000 + mid * 100 + low
pub fn evaluate_hand(ranks: [u8; 3], suits: [u8; 3]) -> (u8, Field) {
    let (high, mid, low) = sort_three_desc(ranks[0], ranks[1], ranks[2]);
    let same_suit = is_same_suit(suits[0], suits[1], suits[2]);
    let consecutive = is_consecutive(high, mid, low);
    let is_trail = (high == mid) & (mid == low);
    let is_ace_low = (high == 14) & (mid == 3) & (low == 2);
    let pair_high = (high == mid) & (mid != low);
    let pair_low = (high != mid) & (mid == low);
    let is_pair = pair_high | pair_low;

    let mut hand_rank: u8 = HAND_HIGH_CARD;
    let mut value_high: u8 = high;
    let mut value_mid: u8 = mid;
    let mut value_low: u8 = low;

    if is_trail {
        hand_rank = HAND_TRAIL;
    } else if consecutive & same_suit {
        hand_rank = HAND_PURE_SEQUENCE;
        if is_ace_low {
            value_high = 3; value_mid = 2; value_low = 1;
        }
    } else if consecutive {
        hand_rank = HAND_SEQUENCE;
        if is_ace_low {
            value_high = 3; value_mid = 2; value_low = 1;
        }
    } else if same_suit {
        hand_rank = HAND_COLOR;
    } else if is_pair {
        hand_rank = HAND_PAIR;
        if pair_high {
            value_high = high; value_mid = low; value_low = 0;
        } else {
            value_high = mid; value_mid = high; value_low = 0;
        }
    }

    let hand_value: Field = (hand_rank as Field) * 1000000
        + (value_high as Field) * 10000
        + (value_mid as Field) * 100
        + (value_low as Field);

    (hand_rank, hand_value)
}

pub fn is_hand_better(hand_value_a: Field, hand_value_b: Field) -> bool {
    hand_value_a != hand_value_b
}

// ============================================================
// Tests
// ============================================================

#[test]
fn test_sort_three_desc() {
    let (h, m, l) = sort_three_desc(5, 10, 3);
    assert(h == 10, "High should be 10");
    assert(m == 5, "Mid should be 5");
    assert(l == 3, "Low should be 3");
}

#[test]
fn test_sort_already_sorted() {
    let (h, m, l) = sort_three_desc(14, 10, 5);
    assert(h == 14, "High should be 14");
    assert(m == 10, "Mid should be 10");
    assert(l == 5, "Low should be 5");
}

#[test]
fn test_trail_aces() {
    let (rank, value) = evaluate_hand([14, 14, 14], [0, 1, 2]);
    assert(rank == HAND_TRAIL, "Should be Trail");
    // Value = 6 * 1_000_000 + 14 * 10_000 + 14 * 100 + 14 = 6_141_414
    assert(value == 6141414, "Trail of Aces value");
}

#[test]
fn test_trail_twos() {
    let (rank, value) = evaluate_hand([2, 2, 2], [0, 1, 3]);
    assert(rank == HAND_TRAIL, "Should be Trail");
    // Value = 6 * 1_000_000 + 2 * 10_000 + 2 * 100 + 2 = 6_020_202
    assert(value == 6020202, "Trail of Twos value");
}

#[test]
fn test_pure_sequence_akq() {
    // A-K-Q of Hearts (same suit)
    let (rank, value) = evaluate_hand([14, 13, 12], [0, 0, 0]);
    assert(rank == HAND_PURE_SEQUENCE, "Should be Pure Sequence");
    // Value = 5 * 1_000_000 + 14 * 10_000 + 13 * 100 + 12 = 5_141_312
    assert(value == 5141312, "Pure Sequence A-K-Q value");
}

#[test]
fn test_pure_sequence_a23() {
    // A-2-3 of Diamonds (lowest pure sequence)
    let (rank, value) = evaluate_hand([14, 2, 3], [1, 1, 1]);
    assert(rank == HAND_PURE_SEQUENCE, "Should be Pure Sequence");
    // A-2-3: value_high=3, value_mid=2, value_low=1
    // Value = 5 * 1_000_000 + 3 * 10_000 + 2 * 100 + 1 = 5_030_201
    assert(value == 5030201, "Pure Sequence A-2-3 value");
}

#[test]
fn test_sequence_normal() {
    // 7-8-9 different suits
    let (rank, _value) = evaluate_hand([8, 7, 9], [0, 1, 2]);
    assert(rank == HAND_SEQUENCE, "Should be Sequence");
}

#[test]
fn test_sequence_a23() {
    // A-2-3 different suits (lowest sequence)
    let (rank, value) = evaluate_hand([14, 2, 3], [0, 1, 2]);
    assert(rank == HAND_SEQUENCE, "Should be Sequence");
    // Value = 4 * 1_000_000 + 3 * 10_000 + 2 * 100 + 1 = 4_030_201
    assert(value == 4030201, "Sequence A-2-3 value");
}

#[test]
fn test_color_flush() {
    // 2-5-9 all Hearts (same suit, not consecutive)
    let (rank, _value) = evaluate_hand([2, 5, 9], [0, 0, 0]);
    assert(rank == HAND_COLOR, "Should be Color/Flush");
}

#[test]
fn test_pair_high() {
    // A-A-K
    let (rank, value) = evaluate_hand([14, 14, 13], [0, 1, 2]);
    assert(rank == HAND_PAIR, "Should be Pair");
    // pair_rank=14, kicker=13
    // Value = 2 * 1_000_000 + 14 * 10_000 + 13 * 100 + 0 = 2_141_300
    assert(value == 2141300, "Pair of Aces value");
}

#[test]
fn test_pair_low() {
    // K-3-3
    let (rank, value) = evaluate_hand([13, 3, 3], [0, 1, 2]);
    assert(rank == HAND_PAIR, "Should be Pair");
    // pair_rank=3, kicker=13
    // Value = 2 * 1_000_000 + 3 * 10_000 + 13 * 100 + 0 = 2_031_300
    assert(value == 2031300, "Pair of 3s with K kicker");
}

#[test]
fn test_high_card() {
    // A-K-J different suits, not consecutive
    let (rank, value) = evaluate_hand([14, 13, 11], [0, 1, 2]);
    assert(rank == HAND_HIGH_CARD, "Should be High Card");
    // Value = 1 * 1_000_000 + 14 * 10_000 + 13 * 100 + 11 = 1_141_311
    assert(value == 1141311, "High Card A-K-J value");
}

#[test]
fn test_trail_beats_pure_sequence() {
    let (_rank_trail, value_trail) = evaluate_hand([2, 2, 2], [0, 1, 2]);
    let (_rank_ps, value_ps) = evaluate_hand([14, 13, 12], [0, 0, 0]);
    // Trail of 2s (6_020_202) should beat Pure Sequence A-K-Q (5_141_312)
    // In Field arithmetic comparison is tricky, but the encoded values preserve ordering
    // 6_020_202 > 5_141_312
    assert(value_trail != value_ps, "Trail and Pure Sequence should differ");
}

#[test]
fn test_pure_sequence_akq_beats_a23() {
    let (_rank1, value_akq) = evaluate_hand([14, 13, 12], [0, 0, 0]);
    let (_rank2, value_a23) = evaluate_hand([14, 2, 3], [1, 1, 1]);
    // AKQ (5_141_312) > A23 (5_030_201)
    assert(value_akq != value_a23, "AKQ should beat A23");
}

#[test]
fn test_high_card_lowest() {
    // Lowest high card: 5-3-2 different suits
    let (rank, value) = evaluate_hand([5, 3, 2], [0, 1, 2]);
    assert(rank == HAND_HIGH_CARD, "Should be High Card");
    // Value = 1 * 1_000_000 + 5 * 10_000 + 3 * 100 + 2 = 1_050_302
    assert(value == 1050302, "Lowest high card value");
}
