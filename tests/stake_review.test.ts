import { describe, it, expect } from 'vitest';
import {
  AXES,
  REVIEWERS,
  SCALE,
  TIERS,
  notchToScore,
  scoreToNotch,
  type ReviewerId,
  type ReviewerScore,
} from '../tools/stake-review/rubric.js';
import {
  APPROVAL_FLOOR,
  aggregate,
  averageRequiredFor,
  backtest,
  HISTORY,
  parseScorecard,
  STANDARDS_DRIFT_NOTCHES,
  toStars,
  type Scorecard,
} from '../tools/stake-review/score.js';

const card = (reviewer: ReviewerId, score: ReviewerScore): Scorecard => ({
  game: 'test',
  reviewer,
  date: '2026-09-06',
  score,
});

const panel = (a: ReviewerScore, b: ReviewerScore, c: ReviewerScore) => [
  card('veteran', a),
  card('enthusiast', b),
  card('inspector', c),
];

describe('the scale is Stake\'s, not ours', () => {
  it('offers exactly the ten published values', () => {
    expect(SCALE).toEqual([0, 0.33, 0.67, 1, 1.33, 1.67, 2, 2.33, 2.67, 3]);
  });

  it('rejects a score off the scale, however plausible', () => {
    expect(() => scoreToNotch(2.5)).toThrow(/not a Stake reviewer score/);
    expect(() => scoreToNotch(1.5)).toThrow(/not a Stake reviewer score/);
    expect(() => scoreToNotch(4)).toThrow(/not a Stake reviewer score/);
  });

  it('round-trips every legal value through its notch', () => {
    for (const s of SCALE) expect(notchToScore(scoreToNotch(s))).toBe(s);
  });

  it('describes all four star tiers, 0 included', () => {
    expect(Object.keys(TIERS).sort()).toEqual(['0', '1', '2', '3']);
    expect(TIERS[0].label).toBe('Not approved');
  });

  it('biases three axes per reviewer, each summing to 1', () => {
    expect(AXES).toHaveLength(3);
    for (const id of Object.keys(REVIEWERS) as ReviewerId[]) {
      const b = REVIEWERS[id].bias;
      expect(b.creativity + b.polish + b.compliance).toBeCloseTo(1, 10);
    }
  });

  it('gives every reviewer a stake in all three axes — no lanes', () => {
    for (const id of Object.keys(REVIEWERS) as ReviewerId[]) {
      for (const v of Object.values(REVIEWERS[id].bias)) {
        expect(v).toBeGreaterThan(0.15);
      }
    }
  });

  it('gives no reviewer an expected band to anchor to', () => {
    for (const id of Object.keys(REVIEWERS) as ReviewerId[]) {
      const keys = Object.keys(REVIEWERS[id]);
      expect(keys).not.toContain('typicalRange');
      expect(keys).not.toContain('expectedRange');
      expect(JSON.stringify(REVIEWERS[id])).not.toMatch(/cluster|usually score/i);
    }
  });

  it('takes exactly one final score per reviewer, never a range', () => {
    const card = JSON.stringify({ game: 'g', reviewer: 'veteran', score: [1.67, 2] });
    expect(() => parseScorecard(card, 'bad.json')).toThrow(/not a Stake reviewer score/);
  });
});

describe('calibration against the real returns', () => {
  const rows = backtest();

  it('reproduces every recorded star award', () => {
    for (const r of rows) {
      expect(`${r.title}:${r.modelled ?? r.awardedStars}`).toBe(
        `${r.title}:${r.awardedStars}`,
      );
    }
  });

  it('every recorded reviewer score is a legal scale value', () => {
    for (const h of HISTORY) {
      for (const s of h.reviewerScores) expect(() => scoreToNotch(s)).not.toThrow();
    }
  });

  it('puts Graveyard Shift round 1 at 2.44 and 2 stars, not 3', () => {
    const gs = rows.find((r) => r.title === 'Graveyard Shift (round 1)')!;
    expect(gs.average).toBeCloseTo(22 / 9, 6);
    expect(gs.modelled).toBe(2);
  });

  it('records the only 3-star as a re-rate, not a first pass', () => {
    const rerate = HISTORY.find((h) => h.awardedStars === 3)!;
    expect(rerate.title).toMatch(/re-rate/);
    expect(rerate.reviewerScores).toHaveLength(0);
  });

  it('cites a source for every return', () => {
    for (const h of HISTORY) expect(h.source.length).toBeGreaterThan(10);
  });
});

describe('the sub-1.0 cliff', () => {
  it('does not round 0.67 up to a 1-star game', () => {
    expect(toStars(0.67)).toBe(0);
  });

  it('treats anything below 1.0 as not approved', () => {
    expect(toStars(0.99)).toBe(0);
    expect(toStars(APPROVAL_FLOOR)).toBe(1);
  });

  it('reports approval status on the panel', () => {
    expect(aggregate(panel(1, 0.67, 1), { driftNotches: 0 }).approved).toBe(false);
    expect(aggregate(panel(2, 2, 2), { driftNotches: 0 }).approved).toBe(true);
  });
});

describe('rounding', () => {
  it('matches Stake\'s own worked example: 2.33/2.33/3.00 -> 3 stars', () => {
    const r = aggregate(panel(2.33, 2.33, 3), { driftNotches: 0 });
    // Stake's doc prints 2.55 by averaging the DISPLAYED 2.33s. We average the
    // exact notches (7/3), giving 23/9 = 2.5556. Same tier, no float drift.
    expect(r.raw).toBeCloseTo(23 / 9, 10);
    expect(r.stars).toBe(3);
  });

  it('rounds half up and caps at 3', () => {
    expect(toStars(2.5)).toBe(3);
    expect(toStars(2.49)).toBe(2);
    expect(toStars(3)).toBe(3);
  });
});

describe('standards drift', () => {
  it('defaults to one reviewer notch', () => {
    expect(STANDARDS_DRIFT_NOTCHES).toBe(1);
  });

  it('costs a third of a star across the panel', () => {
    const r = aggregate(panel(2.33, 2.33, 2.33));
    expect(r.raw - r.adjusted).toBeCloseTo(1 / 3, 6);
  });

  it('turns our best first-pass result into a 2 under the raised bar', () => {
    // Graveyard Shift round 1 was 2.44 raw, already a 2.
    expect(aggregate(panel(2.33, 2.67, 2.33), { driftNotches: 0 }).stars).toBe(2);
    expect(aggregate(panel(2.33, 2.67, 2.33)).stars).toBe(2);
  });

  it('never pushes a reviewer below the bottom of the scale', () => {
    expect(aggregate(panel(0, 0, 0), { driftNotches: 3 }).adjusted).toBe(0);
  });

  it('is disclosed on the result so a prediction is never mistaken for a raw score', () => {
    const r = aggregate(panel(2, 2, 2));
    expect(r.driftNotches).toBe(1);
    expect(r.raw).not.toBeCloseTo(r.adjusted, 3);
  });
});

describe('what it takes to move up', () => {
  it('needs 2.50 for 3 stars', () => {
    expect(averageRequiredFor(3)).toBeCloseTo(2.5, 10);
  });

  it('needs 1.00, not 0.50, for 1 star', () => {
    expect(averageRequiredFor(1)).toBe(APPROVAL_FLOOR);
  });

  it('quantifies the gap in reviewer notches', () => {
    const r = aggregate(panel(2, 2, 2), { driftNotches: 0 });
    expect(r.neededForNextStar).toBeCloseTo(2.5, 10);
  });
});

describe('scorecard validation', () => {
  it('rejects an off-scale score in a verdict file', () => {
    expect(() =>
      parseScorecard(
        JSON.stringify({ game: 'g', reviewer: 'enthusiast', score: 1.5 }),
        'bad.json',
      ),
    ).toThrow(/not a Stake reviewer score/);
  });

  it('rejects an unknown reviewer', () => {
    expect(() =>
      parseScorecard(JSON.stringify({ game: 'g', reviewer: 'maths', score: 2 }), 'bad.json'),
    ).toThrow(/unknown reviewer/);
  });

  it('rejects a panel that is not three reviewers', () => {
    expect(() => aggregate(panel(2, 2, 2).slice(0, 2))).toThrow(/exactly 3 reviewers/);
  });

  it('rejects a panel with a duplicated reviewer', () => {
    expect(() => aggregate([card('veteran', 2), card('veteran', 2), card('enthusiast', 2)])).toThrow(
      /missing scorecard/,
    );
  });
});
