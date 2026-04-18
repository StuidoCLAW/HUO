"""
Parity reference implementation.

This mirrors the TypeScript game.ts / evaluator.ts / payouts.ts exactly,
using the same xoshiro256** RNG seeded identically, so we can emit
a stream of hand results that must match the TS output byte-for-byte.

Strategy: parityStrategy (pre-flop check, flop check, river raise on pair+).
Qualifier: pair of 9s or better.
Paytables: Blind RF100/SF50/Q10/FH3/FL1; Trips RF100/SF50/Q20/FH7/FL3.
"""
from itertools import combinations
from typing import List, Tuple, Optional

# ---------- xoshiro256** RNG (must match TS rng.ts) ----------

MASK64 = (1 << 64) - 1

class SeededRng:
    def __init__(self, seed: int):
        z = seed & MASK64
        def splitmix():
            nonlocal z
            z = (z + 0x9e3779b97f4a7c15) & MASK64
            r = z
            r = ((r ^ (r >> 30)) * 0xbf58476d1ce4e5b9) & MASK64
            r = ((r ^ (r >> 27)) * 0x94d049bb133111eb) & MASK64
            r = r ^ (r >> 31)
            return r & MASK64
        self.s0 = splitmix()
        self.s1 = splitmix()
        self.s2 = splitmix()
        self.s3 = splitmix()

    @staticmethod
    def _rotl(x, k):
        return ((x << k) | (x >> (64 - k))) & MASK64

    def _next64(self):
        result = (self._rotl((self.s1 * 5) & MASK64, 7) * 9) & MASK64
        t = (self.s1 << 17) & MASK64
        self.s2 ^= self.s0
        self.s3 ^= self.s1
        self.s1 ^= self.s2
        self.s0 ^= self.s3
        self.s2 ^= t
        self.s3 = self._rotl(self.s3, 45)
        return result

    def next_int(self, n: int) -> int:
        if n <= 0:
            raise ValueError("n must be positive")
        if n == 1:
            return 0
        limit = (MASK64 // n) * n
        while True:
            x = self._next64()
            if x < limit:
                return x % n


def shuffle(arr: list, rng: SeededRng) -> list:
    for i in range(len(arr) - 1, 0, -1):
        j = rng.next_int(i + 1)
        arr[i], arr[j] = arr[j], arr[i]
    return arr


# ---------- Cards ----------

def rank_of(c: int) -> int: return c >> 2
def suit_of(c: int) -> int: return c & 3
def make_deck() -> List[int]: return list(range(52))


# ---------- 5-card evaluator (must match TS evaluate5) ----------

CLASS_OFFSET = {1:1_000_000, 2:2_000_000, 3:3_000_000, 4:4_000_000,
                5:5_000_000, 6:6_000_000, 7:7_000_000, 8:8_000_000, 9:9_000_000}

HAND_SF, HAND_Q, HAND_FH, HAND_FL, HAND_ST, HAND_T, HAND_2P, HAND_P, HAND_HC = 1,2,3,4,5,6,7,8,9


def pack_kickers(ranks: List[int]) -> int:
    out = 0
    for r in ranks:
        out = out * 16 + (r + 1)
    return out


def value_in_class(cls: int, kicker_pack: int) -> int:
    return CLASS_OFFSET[cls] - kicker_pack


def popcount(n: int) -> int:
    n = n - ((n >> 1) & 0x55555555)
    n = (n & 0x33333333) + ((n >> 2) & 0x33333333)
    return (((n + (n >> 4)) & 0x0f0f0f0f) * 0x01010101) >> 24 & 0xff


def evaluate5(a, b, c, d, e) -> Tuple[int, int]:
    """Returns (value, class). Lower value = stronger."""
    cards = [a, b, c, d, e]
    ranks = [rank_of(x) for x in cards]
    suits = [suit_of(x) for x in cards]

    rank_count = [0] * 13
    for r in ranks:
        rank_count[r] += 1

    is_flush = len(set(suits)) == 1

    mask = 0
    for i in range(13):
        if rank_count[i] > 0:
            mask |= 1 << i

    is_straight = False
    straight_high_rank = -1
    if popcount(mask) == 5:
        for hi in range(12, 3, -1):
            expected = 0b11111 << (hi - 4)
            if (mask & expected) == expected:
                is_straight = True
                straight_high_rank = hi
                break
        if not is_straight and mask == 0b1000000001111:
            is_straight = True
            straight_high_rank = 3

    if is_flush and is_straight:
        return value_in_class(HAND_SF, straight_high_rank + 1), HAND_SF

    grouped = []
    for i in range(12, -1, -1):
        if rank_count[i] > 0:
            grouped.append((rank_count[i], i))
    grouped.sort(key=lambda g: (-g[0], -g[1]))
    counts = [g[0] for g in grouped]
    group_ranks = [g[1] for g in grouped]

    if counts[0] == 4:
        return value_in_class(HAND_Q, pack_kickers([group_ranks[0], group_ranks[1]])), HAND_Q
    if counts[0] == 3 and counts[1] == 2:
        return value_in_class(HAND_FH, pack_kickers([group_ranks[0], group_ranks[1]])), HAND_FH
    if is_flush:
        sr = sorted(ranks, reverse=True)
        return value_in_class(HAND_FL, pack_kickers(sr)), HAND_FL
    if is_straight:
        return value_in_class(HAND_ST, straight_high_rank + 1), HAND_ST
    if counts[0] == 3:
        return value_in_class(HAND_T, pack_kickers([group_ranks[0], group_ranks[1], group_ranks[2]])), HAND_T
    if counts[0] == 2 and counts[1] == 2:
        return value_in_class(HAND_2P, pack_kickers([group_ranks[0], group_ranks[1], group_ranks[2]])), HAND_2P
    if counts[0] == 2:
        return value_in_class(HAND_P, pack_kickers([group_ranks[0], group_ranks[1], group_ranks[2], group_ranks[3]])), HAND_P
    sr = sorted(ranks, reverse=True)
    return value_in_class(HAND_HC, pack_kickers(sr)), HAND_HC


def best_omaha(hole: List[int], board: List[int]) -> Tuple[int, int]:
    best_val = None
    best_cls = None
    for h2 in combinations(hole, 2):
        for b3 in combinations(board, 3):
            v, c = evaluate5(h2[0], h2[1], b3[0], b3[1], b3[2])
            if best_val is None or v < best_val:
                best_val = v
                best_cls = c
    return best_val, best_cls


def is_royal_omaha(hole, board) -> bool:
    for h2 in combinations(hole, 2):
        for b3 in combinations(board, 3):
            five = list(h2) + list(b3)
            if len(set(suit_of(c) for c in five)) == 1:
                rs = set(rank_of(c) for c in five)
                if rs == {8, 9, 10, 11, 12}:
                    v, c = evaluate5(five[0], five[1], five[2], five[3], five[4])
                    if c == HAND_SF:
                        return True
    return False


def best_omaha_pair_rank(hole, board) -> Optional[int]:
    best_pair = -1
    found = False
    for h2 in combinations(hole, 2):
        for b3 in combinations(board, 3):
            five = list(h2) + list(b3)
            v, c = evaluate5(five[0], five[1], five[2], five[3], five[4])
            if c == HAND_P:
                counts = [0] * 13
                for card in five:
                    counts[rank_of(card)] += 1
                for i in range(13):
                    if counts[i] == 2 and i > best_pair:
                        best_pair = i
                        found = True
    return best_pair if found else None


# ---------- Qualifier + paytables ----------

QUALIFIER_MIN_PAIR_RANK = 7  # 9s

def dealer_qualifies(hole, board) -> bool:
    v, c = best_omaha(hole, board)
    if c < HAND_P:
        return True
    if c == HAND_P:
        pr = best_omaha_pair_rank(hole, board)
        return pr is not None and pr >= QUALIFIER_MIN_PAIR_RANK
    return False


def blind_payout_on_win(hole, board) -> int:
    v, c = best_omaha(hole, board)
    if c == HAND_SF:
        return 100 if is_royal_omaha(hole, board) else 50
    if c == HAND_Q: return 10
    if c == HAND_FH: return 3
    if c == HAND_FL: return 1
    return 0


def trips_payout(hole, board) -> int:
    v, c = best_omaha(hole, board)
    if c == HAND_SF:
        return 100 if is_royal_omaha(hole, board) else 50
    if c == HAND_Q: return 20
    if c == HAND_FH: return 7
    if c == HAND_FL: return 3
    return -1


# ---------- Game orchestration ----------

def play_hand(rng: SeededRng, trips_bet_placed: bool = False) -> dict:
    deck = shuffle(make_deck(), rng)
    player_hole = deck[0:4]
    dealer_hole = deck[4:8]
    flop = deck[8:11]
    turn = deck[11:12]
    river = deck[12:13]
    board = flop + turn + river

    play_mult = 0
    folded = False
    raised_street = None

    # parityStrategy: always check pre-flop and flop; river raise on pair+ else fold
    river_class = best_omaha(player_hole, board)[1]
    if river_class <= HAND_P:
        play_mult = 1
        raised_street = "river"
    else:
        folded = True

    trips_net = trips_payout(player_hole, board) if trips_bet_placed else 0

    if folded:
        return {
            "ante": -1, "blind": -1, "play": 0, "trips": trips_net,
            "folded": True, "playerWon": False, "tie": False, "dealerQual": False,
            "raisedStreet": None, "playMult": 0,
            "playerHole": player_hole, "dealerHole": dealer_hole, "board": board,
        }

    p_val, p_cls = best_omaha(player_hole, board)
    d_val, d_cls = best_omaha(dealer_hole, board)
    d_qual = dealer_qualifies(dealer_hole, board)

    tie = p_val == d_val
    player_won = (not tie) and p_val < d_val

    if not d_qual or tie:
        ante = 0
    else:
        ante = 1 if player_won else -1

    if tie:
        play = 0
    else:
        play = play_mult if player_won else -play_mult

    if tie:
        blind = 0
    elif player_won:
        blind = blind_payout_on_win(player_hole, board)
    else:
        blind = -1

    return {
        "ante": ante, "blind": blind, "play": play, "trips": trips_net,
        "folded": False, "playerWon": player_won, "tie": tie, "dealerQual": d_qual,
        "raisedStreet": raised_street, "playMult": play_mult,
        "playerHole": player_hole, "dealerHole": dealer_hole, "board": board,
    }


# ---------- Parity emission ----------

def emit_parity_stream(seed: int, n: int, trips: bool = False):
    """Print one line per hand: pipe-separated fields we'll compare in TS."""
    rng = SeededRng(seed)
    for i in range(n):
        r = play_hand(rng, trips)
        print(f"{i}|{r['ante']}|{r['blind']}|{r['play']}|{r['trips']}|"
              f"{int(r['folded'])}|{int(r['playerWon'])}|{int(r['tie'])}|"
              f"{int(r['dealerQual'])}|{r['raisedStreet'] or ''}|{r['playMult']}")


if __name__ == "__main__":
    import sys
    seed = int(sys.argv[1]) if len(sys.argv) > 1 else 42
    n = int(sys.argv[2]) if len(sys.argv) > 2 else 10_000
    trips = True if len(sys.argv) > 3 and sys.argv[3] == "trips" else False
    emit_parity_stream(seed, n, trips)
