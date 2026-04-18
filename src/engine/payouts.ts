/**
 * Dealer qualifier and payout tables.
 * These are THE locked values from the design session:
 *   - Qualifier: Pair of 9s or better
 *   - Blind: RF 100, SF 50, Quads 10, FH 3, Flush 1, else loss (push on win below flush)
 *   - Trips: RF 100, SF 50, Quads 20, FH 7, Flush 3, else loss
 */

import type { Card } from './cards.js';
import { bestOmahaHand, bestOmahaPairRank, isRoyalOmaha, HAND_CLASS, type HandRank } from './evaluator.js';

// Rank index 7 = 9 (0=2, 1=3, ..., 6=8, 7=9, ...)
export const QUALIFIER_MIN_PAIR_RANK = 7;

export function dealerQualifies(hole: Card[], board: Card[]): boolean {
  const hand = bestOmahaHand(hole, board);
  if (hand.class < HAND_CLASS.PAIR) return true; // two pair or better
  if (hand.class === HAND_CLASS.PAIR) {
    const pr = bestOmahaPairRank(hole, board);
    return pr !== null && pr >= QUALIFIER_MIN_PAIR_RANK;
  }
  return false;
}

/**
 * Blind payout multiplier (per unit of Blind bet staked).
 * Positive = player wins that multiple.
 * -1 = player loses the Blind.
 * 0 = push (player wins showdown but hand below flush).
 * NOTE: this function is called only when we already know the player won
 * the showdown. Loss/push handling on showdown is done in resolveBets.
 */
export function blindPayoutOnWin(hole: Card[], board: Card[]): number {
  const h = bestOmahaHand(hole, board);
  if (h.class === HAND_CLASS.STRAIGHT_FLUSH) {
    return isRoyalOmaha(hole, board) ? 100 : 50;
  }
  if (h.class === HAND_CLASS.QUADS) return 10;
  if (h.class === HAND_CLASS.FULL_HOUSE) return 3;
  if (h.class === HAND_CLASS.FLUSH) return 1;
  return 0; // win but below flush = push
}

/**
 * Trips side bet payout (per unit of Trips bet).
 * Resolves independently of showdown result.
 * -1 = loss.
 */
export function tripsPayout(hole: Card[], board: Card[]): number {
  const h = bestOmahaHand(hole, board);
  if (h.class === HAND_CLASS.STRAIGHT_FLUSH) {
    return isRoyalOmaha(hole, board) ? 100 : 50;
  }
  if (h.class === HAND_CLASS.QUADS) return 20;
  if (h.class === HAND_CLASS.FULL_HOUSE) return 7;
  if (h.class === HAND_CLASS.FLUSH) return 3;
  return -1;
}

export interface BetResult {
  /** Net units returned on the Ante bet. -1, 0 (push), or +1. */
  ante: number;
  /** Net units returned on the Blind bet. -1, 0 (push), or +multiplier. */
  blind: number;
  /** Net units returned on the Play bet. -playMultiplier, 0 (tie), or +playMultiplier. */
  play: number;
  /** Net units returned on the Trips bet. -1 (or 0 if no trips bet placed), or +payout. */
  trips: number;
  /** Metadata for UI/logging. */
  dealerQualified: boolean;
  playerWonShowdown: boolean;
  tie: boolean;
}

export interface ResolveInput {
  playerHole: Card[];
  dealerHole: Card[];
  board: Card[];
  /** Did the player reach showdown? If false, they folded (all bets lost, no Play posted). */
  folded: boolean;
  /** 0 if player didn't raise. Otherwise 3 (pre-flop), 2 (flop), or 1 (river). */
  playMultiplier: number;
  /** Did the player place a Trips side bet? */
  tripsBetPlaced: boolean;
}

export function resolveBets(input: ResolveInput): BetResult {
  const { playerHole, dealerHole, board, folded, playMultiplier, tripsBetPlaced } = input;

  // Trips resolves independently, including on folds (it's a side bet on player's final hand shape)
  const tripsNet = tripsBetPlaced ? tripsPayout(playerHole, board) : 0;

  if (folded) {
    return {
      ante: -1,
      blind: -1,
      play: 0,
      trips: tripsNet,
      dealerQualified: false,
      playerWonShowdown: false,
      tie: false,
    };
  }

  const p = bestOmahaHand(playerHole, board);
  const d = bestOmahaHand(dealerHole, board);
  const dQual = dealerQualifies(dealerHole, board);

  const tie = p.value === d.value;
  const playerWon = !tie && p.value < d.value;

  // Ante: pushes if dealer doesn't qualify OR on tie. Otherwise standard 1:1.
  let ante: number;
  if (!dQual || tie) ante = 0;
  else ante = playerWon ? 1 : -1;

  // Play: always resolves at showdown (if bet was placed). Ties push.
  let play: number;
  if (tie) play = 0;
  else play = playerWon ? playMultiplier : -playMultiplier;

  // Blind: win with flush+ pays paytable; win below flush pushes; tie pushes; loss loses 1.
  let blind: number;
  if (tie) blind = 0;
  else if (playerWon) blind = blindPayoutOnWin(playerHole, board);
  else blind = -1;

  return {
    ante,
    blind,
    play,
    trips: tripsNet,
    dealerQualified: dQual,
    playerWonShowdown: playerWon,
    tie,
  };
}
