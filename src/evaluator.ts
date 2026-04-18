/**
 * 5-card poker hand evaluator + Omaha 2+3 wrapper.
 *
 * Returns a "rank value" where LOWER = STRONGER (convention matches
 * Python treys library). We also return a hand_class enum.
 *
 * The evaluator is designed for correctness and clarity over raw speed.
 * For the demo load (a few hands/sec peak), this is more than fast enough.
 * When we need to push to 100M-hand sims, we port this to Rust.
 *
 * Hand class ordering (1=strongest, 9=weakest) matches treys:
 *   1 = Straight Flush
 *   2 = Four of a Kind
 *   3 = Full House
 *   4 = Flush
 *   5 = Straight
 *   6 = Three of a Kind
 *   7 = Two Pair
 *   8 = Pair
 *   9 = High Card
 *
 * Rank value within a class: we pack a kicker-ordered uint, then invert
 * so that stronger hands produce smaller rank values, matching treys.
 */

import type { Card } from './cards.js';
import { rankOf, suitOf } from './cards.js';

export const HAND_CLASS = {
  STRAIGHT_FLUSH: 1,
  QUADS: 2,
  FULL_HOUSE: 3,
  FLUSH: 4,
  STRAIGHT: 5,
  TRIPS: 6,
  TWO_PAIR: 7,
  PAIR: 8,
  HIGH_CARD: 9,
} as const;

export type HandClass = typeof HAND_CLASS[keyof typeof HAND_CLASS];

export const HAND_CLASS_NAMES: Record<HandClass, string> = {
  1: 'Straight Flush',
  2: 'Four of a Kind',
  3: 'Full House',
  4: 'Flush',
  5: 'Straight',
  6: 'Three of a Kind',
  7: 'Two Pair',
  8: 'Pair',
  9: 'High Card',
};

export interface HandRank {
  value: number;    // lower = stronger
  class: HandClass;
}

// Each class gets a non-overlapping range of values. We pack the kicker
// info into the low bits so ties break correctly within a class.
// Value formula: (classOffset) - kicker, ensuring lower = stronger within class.
// Range size per class is chosen to comfortably exceed max kicker range (13^5 = 371k).
const CLASS_OFFSET: Record<HandClass, number> = {
  1: 1_000_000,         // SF: 1M..
  2: 2_000_000,
  3: 3_000_000,
  4: 4_000_000,
  5: 5_000_000,
  6: 6_000_000,
  7: 7_000_000,
  8: 8_000_000,
  9: 9_000_000,
};

/** Packs up to 5 rank values (0..12) into a single number, MSB-first. */
function packKickers(ranks: number[]): number {
  let out = 0;
  for (let i = 0; i < ranks.length; i++) {
    out = out * 16 + (ranks[i] + 1);  // +1 so kickers [0..12] become [1..13]
  }
  return out;
}

/** Given sorted (desc) ranks of 5 cards, return rank value within its class. */
function valueInClass(cls: HandClass, kickerPack: number): number {
  // kickerPack is a number where bigger = stronger hand.
  // We want lower = stronger overall, so subtract.
  return CLASS_OFFSET[cls] - kickerPack;
}

/**
 * Evaluate exactly 5 cards. Returns the hand rank.
 * Performance note: this is on the hot path. Optimised for clarity +
 * low-allocation; no sorting libraries, no Set, no Map.
 */
export function evaluate5(a: Card, b: Card, c: Card, d: Card, e: Card): HandRank {
  // Extract ranks and suits
  const r0 = rankOf(a), r1 = rankOf(b), r2 = rankOf(c), r3 = rankOf(d), r4 = rankOf(e);
  const s0 = suitOf(a), s1 = suitOf(b), s2 = suitOf(c), s3 = suitOf(d), s4 = suitOf(e);

  // Count ranks (13 entries)
  const rankCount: number[] = new Array(13).fill(0);
  rankCount[r0]++; rankCount[r1]++; rankCount[r2]++; rankCount[r3]++; rankCount[r4]++;

  // Flush check
  const isFlush = (s0 === s1) && (s1 === s2) && (s2 === s3) && (s3 === s4);

  // Straight check: either 5 consecutive ranks, or A-2-3-4-5 (wheel).
  // Build a 13-bit mask of present ranks.
  let mask = 0;
  for (let i = 0; i < 13; i++) if (rankCount[i] > 0) mask |= 1 << i;

  let isStraight = false;
  let straightHighRank = -1;
  // 5 distinct ranks = 5 bits set
  if (popcount(mask) === 5) {
    // Check top-down for a run of 5 consecutive bits
    for (let hi = 12; hi >= 4; hi--) {
      const expected = 0b11111 << (hi - 4);
      if ((mask & expected) === expected) {
        isStraight = true;
        straightHighRank = hi;
        break;
      }
    }
    // Wheel: A + 2,3,4,5 (ranks 12, 0, 1, 2, 3) — treated as 5-high straight
    if (!isStraight && mask === 0b1000000001111) {
      isStraight = true;
      straightHighRank = 3; // 5 = rank index 3
    }
  }

  // Straight flush (incl. royal as SF with high A)
  if (isFlush && isStraight) {
    return { value: valueInClass(1, straightHighRank + 1), class: 1 };
  }

  // Count groupings: find sorted (count desc, rank desc) pairs
  // Extract unique ranks with counts
  const grouped: Array<[number, number]> = []; // [count, rank]
  for (let i = 12; i >= 0; i--) {
    if (rankCount[i] > 0) grouped.push([rankCount[i], i]);
  }
  // Sort: count desc (primary), rank desc (secondary)
  grouped.sort((x, y) => y[0] - x[0] || y[1] - x[1]);

  const counts = grouped.map(g => g[0]);
  const ranks = grouped.map(g => g[1]);

  // Quads
  if (counts[0] === 4) {
    return { value: valueInClass(2, packKickers([ranks[0], ranks[1]])), class: 2 };
  }
  // Full house
  if (counts[0] === 3 && counts[1] === 2) {
    return { value: valueInClass(3, packKickers([ranks[0], ranks[1]])), class: 3 };
  }
  // Flush (not straight)
  if (isFlush) {
    const sortedRanks = [r0, r1, r2, r3, r4].sort((x, y) => y - x);
    return { value: valueInClass(4, packKickers(sortedRanks)), class: 4 };
  }
  // Straight (not flush)
  if (isStraight) {
    return { value: valueInClass(5, straightHighRank + 1), class: 5 };
  }
  // Trips
  if (counts[0] === 3) {
    return { value: valueInClass(6, packKickers([ranks[0], ranks[1], ranks[2]])), class: 6 };
  }
  // Two pair
  if (counts[0] === 2 && counts[1] === 2) {
    return { value: valueInClass(7, packKickers([ranks[0], ranks[1], ranks[2]])), class: 7 };
  }
  // One pair
  if (counts[0] === 2) {
    return { value: valueInClass(8, packKickers([ranks[0], ranks[1], ranks[2], ranks[3]])), class: 8 };
  }
  // High card
  const sortedRanks = [r0, r1, r2, r3, r4].sort((x, y) => y - x);
  return { value: valueInClass(9, packKickers(sortedRanks)), class: 9 };
}

function popcount(n: number): number {
  n = n - ((n >> 1) & 0x55555555);
  n = (n & 0x33333333) + ((n >> 2) & 0x33333333);
  return (((n + (n >> 4)) & 0x0f0f0f0f) * 0x01010101) >>> 24;
}

/**
 * Best Omaha hand: exactly 2 from the 4 hole + exactly 3 from 5 board = 5-card hand.
 * 6 * 10 = 60 combinations to check.
 */
export function bestOmahaHand(hole: Card[], board: Card[]): HandRank {
  if (hole.length !== 4) throw new Error('Omaha hole must be 4 cards');
  if (board.length !== 5) throw new Error('Board must be 5 cards');

  let best: HandRank | null = null;

  for (let h1 = 0; h1 < 3; h1++) {
    for (let h2 = h1 + 1; h2 < 4; h2++) {
      const a = hole[h1], b = hole[h2];
      for (let b1 = 0; b1 < 3; b1++) {
        for (let b2 = b1 + 1; b2 < 4; b2++) {
          for (let b3 = b2 + 1; b3 < 5; b3++) {
            const r = evaluate5(a, b, board[b1], board[b2], board[b3]);
            if (!best || r.value < best.value) best = r;
          }
        }
      }
    }
  }

  return best!;
}

/**
 * Identify if a hand is specifically a Royal Flush (A-K-Q-J-T of one suit).
 * Call only when class === STRAIGHT_FLUSH.
 */
export function isRoyalOmaha(hole: Card[], board: Card[]): boolean {
  for (let h1 = 0; h1 < 3; h1++) {
    for (let h2 = h1 + 1; h2 < 4; h2++) {
      const a = hole[h1], b = hole[h2];
      for (let b1 = 0; b1 < 3; b1++) {
        for (let b2 = b1 + 1; b2 < 4; b2++) {
          for (let b3 = b2 + 1; b3 < 5; b3++) {
            const five = [a, b, board[b1], board[b2], board[b3]];
            const suit0 = suitOf(five[0]);
            if (five.every(c => suitOf(c) === suit0)) {
              const rs = new Set(five.map(rankOf));
              if (rs.has(12) && rs.has(11) && rs.has(10) && rs.has(9) && rs.has(8)) {
                return true;
              }
            }
          }
        }
      }
    }
  }
  return false;
}

/**
 * For an Omaha hand that is classified as PAIR, return the rank of the pair.
 * Needed for qualifier check ("pair of 9s or better").
 */
export function bestOmahaPairRank(hole: Card[], board: Card[]): number | null {
  let bestPair = -1;
  let found = false;

  for (let h1 = 0; h1 < 3; h1++) {
    for (let h2 = h1 + 1; h2 < 4; h2++) {
      const a = hole[h1], b = hole[h2];
      for (let b1 = 0; b1 < 3; b1++) {
        for (let b2 = b1 + 1; b2 < 4; b2++) {
          for (let b3 = b2 + 1; b3 < 5; b3++) {
            const five = [a, b, board[b1], board[b2], board[b3]];
            const r = evaluate5(five[0], five[1], five[2], five[3], five[4]);
            if (r.class === 8) {
              const counts: number[] = new Array(13).fill(0);
              for (const c of five) counts[rankOf(c)]++;
              for (let i = 0; i < 13; i++) {
                if (counts[i] === 2 && i > bestPair) {
                  bestPair = i;
                  found = true;
                }
              }
            }
          }
        }
      }
    }
  }
  return found ? bestPair : null;
}
