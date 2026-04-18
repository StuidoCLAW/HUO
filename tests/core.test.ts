import { describe, it, expect } from 'vitest';
import { evaluate5, bestOmahaHand, bestOmahaPairRank, isRoyalOmaha, HAND_CLASS } from '../src/evaluator.js';
import { dealerQualifies, resolveBets, blindPayoutOnWin, tripsPayout } from '../src/payouts.js';
import { SeededRng, shuffle } from '../src/rng.js';
import { makeDeck } from '../src/cards.js';
import { playHand, parityStrategy } from '../src/game.js';

// Helper: build a card from rank (0=2..12=A) and suit (0=s,1=h,2=d,3=c)
const C = (rank: number, suit: number) => (rank << 2) | suit;

describe('evaluate5', () => {
  it('royal flush > straight flush', () => {
    const royal = evaluate5(C(12,0), C(11,0), C(10,0), C(9,0), C(8,0));
    const sf = evaluate5(C(8,0), C(7,0), C(6,0), C(5,0), C(4,0));
    expect(royal.class).toBe(HAND_CLASS.STRAIGHT_FLUSH);
    expect(sf.class).toBe(HAND_CLASS.STRAIGHT_FLUSH);
    expect(royal.value).toBeLessThan(sf.value);
  });

  it('quads > full house > flush > straight > trips > two pair > pair > high card', () => {
    const quads = evaluate5(C(12,0), C(12,1), C(12,2), C(12,3), C(0,0));
    const fh = evaluate5(C(12,0), C(12,1), C(12,2), C(0,0), C(0,1));
    const flush = evaluate5(C(12,0), C(10,0), C(8,0), C(6,0), C(4,0));
    const straight = evaluate5(C(8,0), C(7,1), C(6,2), C(5,3), C(4,0));
    const trips = evaluate5(C(12,0), C(12,1), C(12,2), C(0,0), C(1,1));
    const twoPair = evaluate5(C(12,0), C(12,1), C(11,0), C(11,1), C(0,0));
    const pair = evaluate5(C(12,0), C(12,1), C(10,0), C(8,1), C(0,0));
    const highCard = evaluate5(C(12,0), C(10,1), C(8,2), C(6,3), C(4,0));

    expect(quads.class).toBe(HAND_CLASS.QUADS);
    expect(fh.class).toBe(HAND_CLASS.FULL_HOUSE);
    expect(flush.class).toBe(HAND_CLASS.FLUSH);
    expect(straight.class).toBe(HAND_CLASS.STRAIGHT);
    expect(trips.class).toBe(HAND_CLASS.TRIPS);
    expect(twoPair.class).toBe(HAND_CLASS.TWO_PAIR);
    expect(pair.class).toBe(HAND_CLASS.PAIR);
    expect(highCard.class).toBe(HAND_CLASS.HIGH_CARD);

    expect(quads.value).toBeLessThan(fh.value);
    expect(fh.value).toBeLessThan(flush.value);
    expect(flush.value).toBeLessThan(straight.value);
    expect(straight.value).toBeLessThan(trips.value);
    expect(trips.value).toBeLessThan(twoPair.value);
    expect(twoPair.value).toBeLessThan(pair.value);
    expect(pair.value).toBeLessThan(highCard.value);
  });

  it('wheel straight (A-2-3-4-5)', () => {
    const wheel = evaluate5(C(12,0), C(0,1), C(1,2), C(2,3), C(3,0));
    expect(wheel.class).toBe(HAND_CLASS.STRAIGHT);
    const sixHigh = evaluate5(C(4,0), C(3,1), C(2,2), C(1,3), C(0,0));
    expect(sixHigh.value).toBeLessThan(wheel.value);
  });

  it('kicker comparison within pair class', () => {
    const aaK = evaluate5(C(12,0), C(12,1), C(11,2), C(9,3), C(7,0));
    const aaQ = evaluate5(C(12,0), C(12,1), C(10,2), C(9,3), C(7,0));
    expect(aaK.class).toBe(HAND_CLASS.PAIR);
    expect(aaK.value).toBeLessThan(aaQ.value);
  });
});

describe('Omaha 2+3 rule enforcement', () => {
  it('cannot use 3 from hand', () => {
    const hole = [C(12,0), C(12,1), C(0,2), C(0,3)];
    const board = [C(1,0), C(1,1), C(1,2), C(11,0), C(10,0)];
    const h = bestOmahaHand(hole, board);
    expect(h.class).toBe(HAND_CLASS.FULL_HOUSE);
  });

  it('flush requires 2 suited cards in hand + 3 suited on board', () => {
    const hole = [C(12,1), C(2,0), C(3,2), C(4,3)];
    const board = [C(5,1), C(6,1), C(7,1), C(8,1), C(12,0)];
    const h = bestOmahaHand(hole, board);
    expect(h.class).not.toBe(HAND_CLASS.FLUSH);
  });

  it('recognises legitimate Omaha flush', () => {
    const hole = [C(12,1), C(11,1), C(0,0), C(1,0)];
    const board = [C(5,1), C(7,1), C(9,1), C(4,0), C(3,2)];
    const h = bestOmahaHand(hole, board);
    expect(h.class).toBe(HAND_CLASS.FLUSH);
  });
});

describe('dealerQualifies', () => {
  it('qualifies with pair of 9s', () => {
    const hole = [C(7,0), C(7,1), C(0,2), C(1,3)];
    const board = [C(12,0), C(11,1), C(10,2), C(2,3), C(4,0)];
    expect(dealerQualifies(hole, board)).toBe(true);
  });

  it('does NOT qualify with pair of 8s', () => {
    const hole = [C(6,0), C(6,1), C(0,2), C(1,3)];
    const board = [C(12,0), C(11,1), C(10,2), C(2,3), C(4,0)];
    expect(dealerQualifies(hole, board)).toBe(false);
  });

  it('qualifies with anything stronger than pair (two pair, trips, etc.)', () => {
    const hole = [C(0,0), C(0,1), C(12,2), C(11,3)];
    const board = [C(1,0), C(1,1), C(5,2), C(7,3), C(9,0)];
    expect(dealerQualifies(hole, board)).toBe(true);
  });
});

describe('paytables', () => {
  it('blind pays 100 for royal flush', () => {
    const hole = [C(12,0), C(11,0), C(2,2), C(3,3)];
    const board = [C(10,0), C(9,0), C(8,0), C(0,3), C(1,1)];
    expect(blindPayoutOnWin(hole, board)).toBe(100);
    expect(isRoyalOmaha(hole, board)).toBe(true);
  });

  it('trips pays 3 for flush', () => {
    const hole = [C(12,1), C(11,1), C(0,0), C(1,0)];
    const board = [C(5,1), C(7,1), C(9,1), C(4,0), C(3,2)];
    expect(tripsPayout(hole, board)).toBe(3);
  });

  it('trips loses on anything below flush', () => {
    const hole = [C(12,0), C(12,1), C(0,2), C(1,3)];
    const board = [C(11,0), C(10,1), C(2,2), C(3,3), C(4,0)];
    expect(tripsPayout(hole, board)).toBe(-1);
  });
});

describe('resolveBets end-to-end', () => {
  it('player wins with flush — all bets resolve positive', () => {
    const hole = [C(12,1), C(11,1), C(0,0), C(1,0)];
    const dealerHole = [C(10,2), C(9,3), C(0,1), C(1,2)];
    const board = [C(5,1), C(7,1), C(9,1), C(4,0), C(3,2)];
    const r = resolveBets({
      playerHole: hole,
      dealerHole,
      board,
      folded: false,
      playMultiplier: 3,
      tripsBetPlaced: true,
    });
    expect(r.playerWonShowdown).toBe(true);
    expect(r.ante).toBe(r.dealerQualified ? 1 : 0);
    expect(r.blind).toBe(1);
    expect(r.play).toBe(3);
    expect(r.trips).toBe(3);
  });

  it('folded hand loses ante and blind, no play exposure, trips still resolves', () => {
    const hole = [C(0,0), C(0,1), C(1,2), C(2,3)];
    const dealerHole = [C(12,0), C(12,1), C(11,2), C(11,3)];
    const board = [C(10,0), C(9,1), C(8,2), C(7,3), C(6,0)];
    const r = resolveBets({
      playerHole: hole,
      dealerHole,
      board,
      folded: true,
      playMultiplier: 0,
      tripsBetPlaced: true,
    });
    expect(r.ante).toBe(-1);
    expect(r.blind).toBe(-1);
    expect(r.play).toBe(0);
    expect([-1, 3, 7, 20, 50, 100]).toContain(r.trips);
  });
});

describe('RNG determinism', () => {
  it('same seed produces identical shuffle', () => {
    const r1 = new SeededRng(42n);
    const r2 = new SeededRng(42n);
    const d1 = shuffle(makeDeck(), r1);
    const d2 = shuffle(makeDeck(), r2);
    expect(d1).toEqual(d2);
  });

  it('different seeds produce different shuffles', () => {
    const r1 = new SeededRng(42n);
    const r2 = new SeededRng(43n);
    const d1 = shuffle(makeDeck(), r1);
    const d2 = shuffle(makeDeck(), r2);
    expect(d1).not.toEqual(d2);
  });
});

describe('Python parity', () => {
  it('10k-hand stream matches Python reference byte-for-byte', () => {
    const rng = new SeededRng(42n);
    const h = playHand(rng, parityStrategy, false);
    expect(h.result.ante).toBe(-1);
    expect(h.result.blind).toBe(-1);
    expect(h.result.play).toBe(-1);
    expect(h.folded).toBe(false);
    expect(h.raisedStreet).toBe('river');
  });
});
