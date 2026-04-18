/**
 * Game orchestration — plays one hand end-to-end.
 *
 * For parity testing with the Python sim, this function must produce
 * identical bet outcomes given identical (deck order, strategy decisions).
 * The "River pair+ fallback" strategy matches huo_sim.py strategy_river().
 *
 * Intentionally no equity-based strategy here — that's a client-side
 * concern (optional "strategy advisor" later). For parity testing we
 * use the same simple fallback strategy across both implementations.
 */

import type { Card } from './cards.js';
import { makeDeck } from './cards.js';
import { shuffle, type Rng } from './rng.js';
import { bestOmahaHand, HAND_CLASS } from './evaluator.js';
import { resolveBets, type BetResult } from './payouts.js';

export type StreetAction = 'raise' | 'check' | 'fold';
export type Street = 'preflop' | 'flop' | 'river';

export interface HandDeal {
  playerHole: Card[];
  dealerHole: Card[];
  flop: Card[];
  turn: Card[];
  river: Card[];
  /** full 5-card board for convenience */
  board: Card[];
}

export function dealHand(rng: Rng): HandDeal {
  const deck = shuffle(makeDeck(), rng);
  const playerHole = deck.slice(0, 4);
  const dealerHole = deck.slice(4, 8);
  const flop = deck.slice(8, 11);
  const turn = deck.slice(11, 12);
  const river = deck.slice(12, 13);
  return { playerHole, dealerHole, flop, turn, river, board: [...flop, ...turn, ...river] };
}

/**
 * Strategy that matches huo_sim.py for parity testing:
 *   - Pre-flop: check (always)  — we test the "no raise" path
 *   - Flop: check (always)
 *   - River: raise 1x if player has at least a pair, else fold
 *
 * This gives a clean deterministic test where the only variable is the
 * shuffle order, not any equity computation (which would be slow +
 * stochastic). Parity of this simple strategy across Python and TS
 * proves the evaluator, qualifier, and paytables agree.
 */
export interface Strategy {
  preflop: (hole: Card[]) => StreetAction;  // 'raise' or 'check'
  flop: (hole: Card[], flop: Card[]) => StreetAction;  // 'raise' or 'check'
  river: (hole: Card[], board: Card[]) => StreetAction; // 'raise' or 'fold'
}

export const parityStrategy: Strategy = {
  preflop: () => 'check',
  flop: () => 'check',
  river: (hole, board) => {
    const h = bestOmahaHand(hole, board);
    // Same rule as Python: raise if class <= PAIR (i.e. pair or better)
    return h.class <= HAND_CLASS.PAIR ? 'raise' : 'fold';
  },
};

export interface PlayedHand {
  deal: HandDeal;
  raisedStreet: Street | null;
  playMultiplier: number;
  folded: boolean;
  tripsBetPlaced: boolean;
  result: BetResult;
}

export function playHand(rng: Rng, strategy: Strategy, tripsBetPlaced = false): PlayedHand {
  const deal = dealHand(rng);
  let raisedStreet: Street | null = null;
  let playMultiplier = 0;
  let folded = false;

  const pfAction = strategy.preflop(deal.playerHole);
  if (pfAction === 'raise') {
    raisedStreet = 'preflop';
    playMultiplier = 3;
  } else {
    const flopAction = strategy.flop(deal.playerHole, deal.flop);
    if (flopAction === 'raise') {
      raisedStreet = 'flop';
      playMultiplier = 2;
    } else {
      const riverAction = strategy.river(deal.playerHole, deal.board);
      if (riverAction === 'raise') {
        raisedStreet = 'river';
        playMultiplier = 1;
      } else {
        folded = true;
      }
    }
  }

  const result = resolveBets({
    playerHole: deal.playerHole,
    dealerHole: deal.dealerHole,
    board: deal.board,
    folded,
    playMultiplier,
    tripsBetPlaced,
  });

  return { deal, raisedStreet, playMultiplier, folded, tripsBetPlaced, result };
}
