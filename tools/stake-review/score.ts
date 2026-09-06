/**
 * Stake review scoring — panel aggregation, standards drift, back-test.
 *
 * All arithmetic is done in ninths (integers) so no float noise can move a
 * star. A submission is nine integer stars: three reviewers x three criteria.
 *
 *   reviewer score = (sum of that reviewer's 3 criteria) / 3
 *   panel raw      = (sum of all 9 criteria) / 9
 *   headline star  = round(panel raw - standards drift)
 *
 * See docs/stake-review/CALIBRATION.md for how this was derived from the four
 * Clawbyte review returns and why the rounding threshold differs by cohort.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  CRITERIA,
  CRITERIA_BY_REVIEWER,
  REVIEWERS,
  type CriterionId,
  type ReviewerId,
  type Star,
} from './rubric.js';

/** Guards float comparison at the rounding boundary. */
const EPS = 1e-9;

/**
 * Stars deducted from the panel raw before rounding, to convert a score made
 * against the July-2026-anchored rubric into today's expected Stake headline.
 *
 * 1/18 of this is observable (Graveyard Shift's headline round-up, which today
 * would not happen). The remainder is Jake's brief that Stake have raised the
 * bar since the July cohort went live. Tune here, or pass --drift=N.
 */
export const STANDARDS_DRIFT_STARS = 0.5;

/** Fractional part at or above which a panel raw rounds up to the next star. */
export const ROUND_UP_AT = {
  /** July 2026 cohort: Graveyard Shift's 22/9 (0.444 frac) was rounded up. */
  'jul-2026': 4 / 9,
  /** Current cohort: no observed round-up below one half. */
  current: 0.5,
} as const;

export type Cohort = keyof typeof ROUND_UP_AT;

export interface Scorecard {
  game: string;
  reviewer: ReviewerId;
  date: string;
  scores: Record<CriterionId, Star>;
  blockers?: string[];
  /** Criterion id -> the single change that would buy one more star. */
  lifts?: Record<string, string>;
}

export interface PanelResult {
  game: string;
  /** Integer sum of all nine criterion stars, 9..45. */
  ninths: number;
  raw: number;
  reviewerScores: Record<ReviewerId, number>;
  drift: number;
  adjusted: number;
  headline: Star;
  /** Panel raw needed to reach the next headline star under the same drift. */
  rawForNextStar: number | null;
}

function isStar(n: unknown): n is Star {
  return n === 1 || n === 2 || n === 3 || n === 4 || n === 5;
}

/** Sum of one reviewer's three criterion stars. Range 3..15. */
export function reviewerSubtotal(card: Scorecard): number {
  return CRITERIA_BY_REVIEWER[card.reviewer].reduce((sum, c) => {
    const s = card.scores[c.id];
    if (!isStar(s)) {
      throw new Error(`${card.reviewer} scorecard missing or invalid ${c.id}`);
    }
    return sum + s;
  }, 0);
}

/** A reviewer's reported score: their three criteria averaged. */
export function reviewerScore(card: Scorecard): number {
  return reviewerSubtotal(card) / 3;
}

/** Round a panel score to a headline star under a cohort's rounding rule. */
export function toStars(value: number, roundUpAt: number = ROUND_UP_AT.current): Star {
  const clamped = Math.min(5, Math.max(1, value));
  const floor = Math.floor(clamped);
  const frac = clamped - floor;
  const star = frac >= roundUpAt - EPS ? floor + 1 : floor;
  return Math.min(5, Math.max(1, star)) as Star;
}

/**
 * Minimum panel raw needed to land a given headline star today.
 * With drift 0.5 and half-up rounding this is exactly the star itself:
 * a 3-star headline needs a 3.0 panel average.
 */
export function rawRequiredFor(
  star: Star,
  drift: number = STANDARDS_DRIFT_STARS,
  roundUpAt: number = ROUND_UP_AT.current,
): number {
  return star - 1 + roundUpAt + drift;
}

export function aggregate(
  cards: Scorecard[],
  opts: { drift?: number; roundUpAt?: number } = {},
): PanelResult {
  const seen = new Set(cards.map((c) => c.reviewer));
  for (const id of Object.keys(REVIEWERS) as ReviewerId[]) {
    if (!seen.has(id)) throw new Error(`missing scorecard from reviewer: ${id}`);
  }
  if (cards.length !== 3) {
    throw new Error(`expected exactly 3 scorecards, got ${cards.length}`);
  }

  const drift = opts.drift ?? STANDARDS_DRIFT_STARS;
  const roundUpAt = opts.roundUpAt ?? ROUND_UP_AT.current;

  const ninths = cards.reduce((sum, c) => sum + reviewerSubtotal(c), 0);
  const raw = ninths / 9;
  const adjusted = raw - drift;
  const headline = toStars(adjusted, roundUpAt);

  const reviewerScores = {} as Record<ReviewerId, number>;
  for (const card of cards) reviewerScores[card.reviewer] = reviewerScore(card);

  const next = (headline + 1) as Star;
  return {
    game: cards[0].game,
    ninths,
    raw,
    reviewerScores,
    drift,
    adjusted,
    headline,
    rawForNextStar: next <= 5 ? rawRequiredFor(next, drift, roundUpAt) : null,
  };
}

// ---------------------------------------------------------------------------
// Calibration set — the four Clawbyte submissions Stake have returned.
// Reviewer scores are stored as the integer subtotal of that reviewer's three
// criteria, which is exactly how the reported thirds arise:
//   6/3 = 2.00   7/3 = 2.33   9/3 = 3.00   5/3 = 1.67   4/3 = 1.33
// ---------------------------------------------------------------------------

export interface HistoricalReview {
  title: string;
  cohort: Cohort;
  /** Integer subtotals, one per reviewer, each 3..15. */
  subtotals: [number, number, number];
  /** Reviewer scores exactly as Stake reported them, for the record. */
  reported: [number, number, number];
  awardedOverall: Star;
}

export const HISTORY: readonly HistoricalReview[] = [
  {
    title: 'Graveyard Shift',
    cohort: 'jul-2026',
    subtotals: [6, 7, 9],
    reported: [2, 2.33, 3],
    awardedOverall: 3,
  },
  {
    title: 'Into the Slot-o-Verse',
    cohort: 'jul-2026',
    subtotals: [7, 5, 4],
    reported: [2.33, 1.67, 1.33],
    awardedOverall: 2,
  },
  {
    title: "Mummy's Riches",
    cohort: 'current',
    subtotals: [5, 7, 6],
    reported: [1.67, 2.33, 2],
    awardedOverall: 2,
  },
  {
    title: 'Tiki Taka Madness',
    cohort: 'current',
    subtotals: [7, 6, 6],
    reported: [2.33, 2, 2],
    awardedOverall: 2,
  },
] as const;

export interface BacktestRow extends HistoricalReview {
  ninths: number;
  raw: number;
  modelled: Star;
  matches: boolean;
  /** What this submission would score if resubmitted today, unchanged. */
  headlineToday: Star;
}

/**
 * Replays the four known returns through the model. Drift is zero here: these
 * scores were awarded under their own cohort's standards, so the only cohort
 * difference applied is the rounding threshold.
 */
export function backtest(): BacktestRow[] {
  return HISTORY.map((h) => {
    const ninths = h.subtotals.reduce((a, b) => a + b, 0);
    const raw = ninths / 9;
    const modelled = toStars(raw, ROUND_UP_AT[h.cohort]);
    return {
      ...h,
      ninths,
      raw,
      modelled,
      matches: modelled === h.awardedOverall,
      headlineToday: toStars(
        raw - (h.cohort === 'jul-2026' ? STANDARDS_DRIFT_STARS : 0),
        ROUND_UP_AT.current,
      ),
    };
  });
}

// ---------------------------------------------------------------------------
// Scorecard loading
// ---------------------------------------------------------------------------

export function parseScorecard(json: string, source: string): Scorecard {
  const raw: unknown = JSON.parse(json);
  if (typeof raw !== 'object' || raw === null) {
    throw new Error(`${source}: scorecard is not an object`);
  }
  const card = raw as Partial<Scorecard>;
  if (!card.reviewer || !(card.reviewer in REVIEWERS)) {
    throw new Error(`${source}: unknown reviewer "${String(card.reviewer)}"`);
  }
  if (!card.game) throw new Error(`${source}: missing game`);
  if (!card.scores) throw new Error(`${source}: missing scores`);

  const own = CRITERIA_BY_REVIEWER[card.reviewer].map((c) => c.id);
  for (const id of Object.keys(card.scores) as CriterionId[]) {
    if (!own.includes(id)) {
      throw new Error(`${source}: ${card.reviewer} may not score ${id}`);
    }
    if (!isStar(card.scores[id])) {
      throw new Error(`${source}: ${id} must be a whole star 1-5`);
    }
  }
  for (const id of own) {
    if (card.scores[id] === undefined) throw new Error(`${source}: missing ${id}`);
  }
  return card as Scorecard;
}

export function loadVerdicts(dir: string): Scorecard[] {
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => parseScorecard(readFileSync(join(dir, f), 'utf8'), f));
}

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------

const f2 = (n: number) => n.toFixed(2);

function printBacktest(): void {
  const rows = backtest();
  console.log('\nCalibration back-test — model vs awarded\n');
  console.log(
    '  Game                    Cohort     Reviewers            Raw   Model  Awarded  Today',
  );
  for (const r of rows) {
    const reported = r.reported.map(f2).join(' ');
    console.log(
      `  ${r.title.padEnd(23)} ${r.cohort.padEnd(10)} ${reported.padEnd(20)} ` +
        `${f2(r.raw)}  ${r.modelled}      ${r.awardedOverall}${r.matches ? ' ok' : ' MISMATCH'}   ${r.headlineToday}`,
    );
  }
  const ok = rows.every((r) => r.matches);
  const mean = rows.reduce((s, r) => s + r.raw, 0) / rows.length;
  console.log(`\n  Model reproduces all four returns: ${ok ? 'YES' : 'NO'}`);
  console.log(`  Clawbyte cohort mean panel raw:    ${f2(mean)}`);
  console.log(
    `  Panel raw needed for 3 stars today: ${f2(rawRequiredFor(3))} ` +
      `(drift ${f2(STANDARDS_DRIFT_STARS)})\n`,
  );
  if (!ok) process.exitCode = 1;
}

function printPanel(result: PanelResult): void {
  console.log(`\n${result.game} — panel result\n`);
  for (const id of Object.keys(REVIEWERS) as ReviewerId[]) {
    console.log(
      `  ${REVIEWERS[id].title.padEnd(32)} ${f2(result.reviewerScores[id])}`,
    );
  }
  console.log(`\n  Panel raw       ${f2(result.raw)}  (${result.ninths}/9)`);
  const driftSign = result.drift === 0 ? ' ' : '-';
  console.log(`  Standards drift ${driftSign}${f2(Math.abs(result.drift))}`);
  console.log(`  Adjusted        ${f2(result.adjusted)}`);
  console.log(`\n  HEADLINE        ${result.headline} star${result.headline === 1 ? '' : 's'}`);
  if (result.rawForNextStar !== null) {
    const gap = result.rawForNextStar - result.raw;
    console.log(
      `  For ${result.headline + 1} stars     panel raw ${f2(result.rawForNextStar)} ` +
        `(+${f2(gap)}, i.e. ${Math.ceil(gap * 9 - EPS)} more criterion stars)\n`,
    );
  } else {
    console.log('');
  }
}

function main(argv: string[]): void {
  const driftArg = argv.find((a) => a.startsWith('--drift='));
  const drift = driftArg ? Number(driftArg.split('=')[1]) : STANDARDS_DRIFT_STARS;

  if (argv.includes('--backtest')) return printBacktest();

  const scoresArg = argv.find((a) => a.startsWith('--scores='));
  if (scoresArg) {
    const parts = scoresArg.split('=')[1].split(',').map(Number);
    if (parts.length !== 9) throw new Error('--scores needs 9 values, M1..T3 in order');
    const cards: Scorecard[] = (Object.keys(REVIEWERS) as ReviewerId[]).map((id, i) => ({
      game: 'ad-hoc',
      reviewer: id,
      date: new Date().toISOString().slice(0, 10),
      scores: Object.fromEntries(
        CRITERIA_BY_REVIEWER[id].map((c, j) => [c.id, parts[i * 3 + j]]),
      ) as Record<CriterionId, Star>,
    }));
    return printPanel(aggregate(cards, { drift }));
  }

  const dirArg = argv.find((a) => a.startsWith('--verdicts='));
  if (dirArg) {
    return printPanel(aggregate(loadVerdicts(dirArg.split('=')[1]), { drift }));
  }

  console.log(`
Stake review scorer

  npx tsx tools/stake-review/score.ts --backtest
  npx tsx tools/stake-review/score.ts --verdicts=docs/stake-review/verdicts/huo
  npx tsx tools/stake-review/score.ts --scores=2,3,2,2,2,2,3,3,2
  ...any of the above with --drift=0.5

Criterion order for --scores: ${CRITERIA.map((c) => c.id).join(',')}
`);
}

const invokedDirectly =
  process.argv[1] !== undefined && process.argv[1].endsWith('score.ts');
if (invokedDirectly) main(process.argv.slice(2));
