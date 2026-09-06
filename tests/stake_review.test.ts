import { describe, it, expect } from 'vitest';
import {
  CRITERIA,
  CRITERIA_BY_REVIEWER,
  REVIEWERS,
  type CriterionId,
  type ReviewerId,
  type Star,
} from '../tools/stake-review/rubric.js';
import {
  aggregate,
  backtest,
  HISTORY,
  parseScorecard,
  rawRequiredFor,
  reviewerScore,
  ROUND_UP_AT,
  STANDARDS_DRIFT_STARS,
  toStars,
  type Scorecard,
} from '../tools/stake-review/score.js';

const card = (reviewer: ReviewerId, ...stars: Star[]): Scorecard => ({
  game: 'test',
  reviewer,
  date: '2026-09-06',
  scores: Object.fromEntries(
    CRITERIA_BY_REVIEWER[reviewer].map((c, i) => [c.id, stars[i]]),
  ) as Record<CriterionId, Star>,
});

const panel = (...stars: Star[]) => [
  card('maths', stars[0], stars[1], stars[2]),
  card('experience', stars[3], stars[4], stars[5]),
  card('technical', stars[6], stars[7], stars[8]),
];

describe('rubric shape', () => {
  it('is nine criteria across three reviewers', () => {
    expect(CRITERIA).toHaveLength(9);
    for (const id of Object.keys(REVIEWERS) as ReviewerId[]) {
      expect(CRITERIA_BY_REVIEWER[id]).toHaveLength(3);
    }
  });

  it('gives every criterion five distinct star anchors', () => {
    for (const c of CRITERIA) {
      expect(c.anchors).toHaveLength(5);
      expect(new Set(c.anchors).size).toBe(5);
    }
  });
});

describe('reviewer scores land on the thirds Stake report', () => {
  it('reproduces every reported value in the calibration set', () => {
    const reported = new Set(HISTORY.flatMap((h) => h.reported.map((r) => r.toFixed(2))));
    // Every third from 1.00 to 5.00 is expressible; check the observed ones.
    for (const value of reported) {
      const subtotal = Math.round(Number(value) * 3);
      const stars = [
        Math.floor(subtotal / 3),
        Math.floor((subtotal + 1) / 3),
        Math.floor((subtotal + 2) / 3),
      ] as Star[];
      expect(reviewerScore(card('maths', ...stars)).toFixed(2)).toBe(value);
    }
  });
});

describe('calibration back-test', () => {
  const rows = backtest();

  it('reproduces all four awarded overall ratings', () => {
    for (const r of rows) {
      expect(`${r.title}:${r.modelled}`).toBe(`${r.title}:${r.awardedOverall}`);
    }
  });

  it('decodes each submission as an exact ninth', () => {
    for (const r of rows) {
      expect(Number.isInteger(r.ninths)).toBe(true);
      expect(r.ninths).toBeGreaterThanOrEqual(9);
      expect(r.ninths).toBeLessThanOrEqual(45);
      expect(r.raw * 9).toBeCloseTo(r.ninths, 10);
    }
  });

  it('demotes Graveyard Shift to 2 stars under current standards', () => {
    const gs = rows.find((r) => r.title === 'Graveyard Shift')!;
    expect(gs.awardedOverall).toBe(3);
    expect(gs.headlineToday).toBe(2);
  });

  it('leaves the current-cohort returns unchanged under current standards', () => {
    for (const r of rows.filter((x) => x.cohort === 'current')) {
      expect(r.headlineToday).toBe(r.awardedOverall);
    }
  });
});

describe('rounding thresholds', () => {
  it('rounds 22/9 up only under the July rule', () => {
    expect(toStars(22 / 9, ROUND_UP_AT['jul-2026'])).toBe(3);
    expect(toStars(22 / 9, ROUND_UP_AT.current)).toBe(2);
  });

  it('is exact at the boundary rather than float-dependent', () => {
    expect(toStars(2.5, ROUND_UP_AT.current)).toBe(3);
    expect(toStars(2.5 - 1e-12, ROUND_UP_AT.current)).toBe(3);
    expect(toStars(2.4, ROUND_UP_AT.current)).toBe(2);
  });

  it('clamps to the 1..5 range', () => {
    expect(toStars(-3)).toBe(1);
    expect(toStars(0.2)).toBe(1);
    expect(toStars(9)).toBe(5);
  });
});

describe('standards drift gate', () => {
  it('requires a panel average equal to the star you want', () => {
    expect(rawRequiredFor(3)).toBeCloseTo(3, 10);
    expect(rawRequiredFor(4)).toBeCloseTo(4, 10);
  });

  it('needs a straight 3 across all nine criteria for a 3-star headline', () => {
    expect(aggregate(panel(3, 3, 3, 3, 3, 3, 3, 3, 3)).headline).toBe(3);
    expect(aggregate(panel(3, 3, 3, 3, 3, 3, 3, 3, 2)).headline).toBe(2);
  });

  it('reports the cohort-typical build as a 2', () => {
    // Tiki Taka Madness' 19/9 shape.
    expect(aggregate(panel(3, 2, 2, 2, 2, 2, 2, 2, 2)).headline).toBe(2);
  });

  it('honours a drift override', () => {
    const cards = panel(3, 3, 3, 3, 3, 3, 3, 3, 2);
    expect(aggregate(cards, { drift: 0 }).headline).toBe(3);
    expect(aggregate(cards, { drift: STANDARDS_DRIFT_STARS }).headline).toBe(2);
  });

  it('quantifies the gap to the next star in criterion stars', () => {
    const result = aggregate(panel(2, 2, 2, 2, 2, 2, 2, 2, 2));
    expect(result.raw).toBe(2);
    expect(result.rawForNextStar).toBeCloseTo(3, 10);
  });
});

describe('scorecard validation', () => {
  it('rejects a reviewer scoring outside their lane', () => {
    expect(() =>
      parseScorecard(
        JSON.stringify({ game: 'g', reviewer: 'maths', scores: { X1: 3 } }),
        'bad.json',
      ),
    ).toThrow(/may not score X1/);
  });

  it('rejects half stars at criterion level', () => {
    expect(() =>
      parseScorecard(
        JSON.stringify({ game: 'g', reviewer: 'maths', scores: { M1: 2.5 } }),
        'bad.json',
      ),
    ).toThrow(/whole star/);
  });

  it('rejects an incomplete lane', () => {
    expect(() =>
      parseScorecard(
        JSON.stringify({ game: 'g', reviewer: 'maths', scores: { M1: 2, M2: 2 } }),
        'bad.json',
      ),
    ).toThrow(/missing M3/);
  });

  it('rejects a panel missing a reviewer', () => {
    expect(() => aggregate(panel(2, 2, 2, 2, 2, 2, 2, 2, 2).slice(0, 2))).toThrow(
      /missing scorecard/,
    );
  });
});
