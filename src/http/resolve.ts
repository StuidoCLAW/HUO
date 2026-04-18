/**
 * Build the RESOLVED response payload from a finished Session.
 *
 * Engine-neutral: uses resolveBets() and bestOmahaHand() from the Phase 1 core
 * and packages the result for the HTTP layer. No game-design decisions here.
 */

import type { Card } from '../engine/cards.js';
import { bestOmahaHand, HAND_CLASS_NAMES, type HandClass } from '../engine/evaluator.js';
import { resolveBets, type BetResult } from '../engine/payouts.js';
import type { Session } from './session.js';

export interface ResolvedHand {
  class: HandClass;
  className: string;
  value: number;
}

export interface Resolution {
  state: 'RESOLVED';
  dealerHole: Card[];
  board: Card[];
  playerHand: ResolvedHand;
  dealerHand: ResolvedHand;
  dealerQualified: boolean;
  tie: boolean;
  playerWon: boolean;
  folded: boolean;
  raisedStreet: Session['raisedStreet'];
  playMultiplier: number;
  payouts: {
    ante: number;
    blind: number;
    play: number;
    trips: number;
  };
  /** Stakes * net multipliers summed (-stake for losses, +stake*mult for wins). */
  totalReturn: number;
}

export function buildResolution(session: Session): Resolution {
  const board = [...session.flop, ...session.turn, ...session.river];

  const bet: BetResult = resolveBets({
    playerHole: session.playerHole,
    dealerHole: session.dealerHole,
    board,
    folded: session.folded,
    playMultiplier: session.playMultiplier,
    tripsBetPlaced: session.tripsStake > 0,
  });

  const p = bestOmahaHand(session.playerHole, board);
  const d = bestOmahaHand(session.dealerHole, board);

  const playerHand: ResolvedHand = {
    class: p.class,
    className: HAND_CLASS_NAMES[p.class],
    value: p.value,
  };
  const dealerHand: ResolvedHand = {
    class: d.class,
    className: HAND_CLASS_NAMES[d.class],
    value: d.value,
  };

  const payouts = {
    ante: bet.ante * session.anteStake,
    blind: bet.blind * session.blindStake,
    play: bet.play * session.anteStake,
    trips: bet.trips * session.tripsStake,
  };
  const totalReturn = payouts.ante + payouts.blind + payouts.play + payouts.trips;

  return {
    state: 'RESOLVED',
    dealerHole: session.dealerHole,
    board,
    playerHand,
    dealerHand,
    dealerQualified: bet.dealerQualified,
    tie: bet.tie,
    playerWon: bet.playerWonShowdown,
    folded: session.folded,
    raisedStreet: session.raisedStreet,
    playMultiplier: session.playMultiplier,
    payouts,
    totalReturn,
  };
}
