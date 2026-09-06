/**
 * Stake Engine review scoring.
 *
 *   Three anonymous reviewers each select ONE value from a fixed 10-point scale
 *   (0, 0.33, 0.67, 1, 1.33, 1.67, 2, 2.33, 2.67, 3). The three are averaged and
 *   rounded to the nearest whole star. An average BELOW 1.0 is not a 1-star game
 *   — it is not approved, and the thread locks for 7 days.
 *
 * Source: Stake Engine "Game Quality Rankings"
 *   graveyard-shift/docs/stake-engine/approval-quality.svx
 *
 * Arithmetic is done in notches (integers 0..9) so no float can move a star.
 */

import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  AXES,
  REVIEWERS,
  SCALE,
  TIERS,
  notchToScore,
  scoreToNotch,
  type Axis,
  type ReviewerId,
  type ReviewerScore,
  type StarTier,
} from './rubric.js';

const EPS = 1e-9;

/** Below this average the game is not approved, regardless of rounding. */
export const APPROVAL_FLOOR = 1.0;

/**
 * Notches subtracted from each predicted reviewer score before the panel is
 * struck, to account for Stake raising the bar since the July 2026 cohort.
 *
 * One notch = 0.33 = the smallest move a real reviewer can make, so this is the
 * natural unit for "assume they are a step harder on you than the back
 * catalogue suggests". This is a POLICY setting from Jake's brief, not a
 * measurement — see docs/stake-review/CALIBRATION.md §6. Override with --drift=N.
 */
export const STANDARDS_DRIFT_NOTCHES = 1;

export interface Scorecard {
  game: string;
  reviewer: ReviewerId;
  date: string;
  /** Must be one of the 10 legal values. */
  score: ReviewerScore;
  /** Per-axis read, for diagnosis. Does not feed the arithmetic. */
  axes?: Partial<Record<Axis['id'], number>>;
  blockers?: string[];
  findings?: string[];
  /** The single change that would move this reviewer up one notch. */
  lift?: string;
}

export interface PanelResult {
  game: string;
  /** Sum of the three reviewers' notches, 0..27. */
  notches: number;
  raw: number;
  scores: Record<ReviewerId, number>;
  driftNotches: number;
  adjusted: number;
  stars: StarTier;
  approved: boolean;
  /** Panel average needed for the next star up, under the same drift. */
  neededForNextStar: number | null;
}

/** Round to the nearest star, then apply the sub-1.0 approval floor. */
export function toStars(average: number): StarTier {
  if (average < APPROVAL_FLOOR - EPS) return 0;
  const rounded = Math.floor(average + 0.5 + EPS);
  return Math.min(3, Math.max(0, rounded)) as StarTier;
}

/** Lowest panel average that lands a given star tier. */
export function averageRequiredFor(star: StarTier): number {
  if (star === 0) return 0;
  if (star === 1) return APPROVAL_FLOOR;
  return star - 0.5;
}

export function aggregate(
  cards: Scorecard[],
  opts: { driftNotches?: number } = {},
): PanelResult {
  if (cards.length !== 3) {
    throw new Error(`a Stake panel is exactly 3 reviewers, got ${cards.length}`);
  }
  const seen = new Set(cards.map((c) => c.reviewer));
  for (const id of Object.keys(REVIEWERS) as ReviewerId[]) {
    if (!seen.has(id)) throw new Error(`missing scorecard from reviewer: ${id}`);
  }

  const drift = opts.driftNotches ?? STANDARDS_DRIFT_NOTCHES;
  const scores = {} as Record<ReviewerId, number>;
  let notches = 0;
  let adjustedNotches = 0;

  for (const card of cards) {
    const n = scoreToNotch(card.score);
    scores[card.reviewer] = card.score;
    notches += n;
    adjustedNotches += Math.max(0, n - drift);
  }

  const raw = notches / 9;
  const adjusted = adjustedNotches / 9;
  const stars = toStars(adjusted);
  const next = (stars + 1) as StarTier;

  return {
    game: cards[0].game,
    notches,
    raw,
    scores,
    driftNotches: drift,
    adjusted,
    stars,
    approved: stars >= 1,
    neededForNextStar: next <= 3 ? averageRequiredFor(next) : null,
  };
}

// ---------------------------------------------------------------------------
// Calibration set — every Clawbyte review return we hold a record of.
// ---------------------------------------------------------------------------

export interface HistoricalReview {
  title: string;
  repo: string;
  date: string;
  /** Reviewer scores as awarded. Empty when the split was not recorded. */
  reviewerScores: number[];
  awardedStars: StarTier;
  /** What the record says drove the score. */
  driver: string;
  source: string;
}

export const HISTORY: readonly HistoricalReview[] = [
  {
    title: 'Graveyard Shift (round 1)',
    repo: 'StuidoCLAW/graveyard-shift',
    date: '2026-07-11',
    reviewerScores: [2.33, 2.67, 2.33],
    awardedStars: 2,
    driver:
      'No itemised list; the score was the feedback. Suspected drags: byte-identical ' +
      'web-sdk sample assets, and the pop-out layout being unplayable.',
    source: 'mummysriches/docs/STAKE-REVIEWER-LESSONS.md §1 round 2',
  },
  {
    title: 'Graveyard Shift (re-rate)',
    repo: 'StuidoCLAW/graveyard-shift',
    date: '2026-07-14',
    reviewerScores: [],
    awardedStars: 3,
    driver:
      'Re-rated to 3 stars after the round-3 fix list was worked. The only 3-star ' +
      'result in the catalogue, and it came from a second cycle, not a first pass.',
    source: 'mummysriches/docs/STAKE-REVIEWER-LESSONS.md preamble',
  },
  {
    title: "Into The Slot O' Verse",
    repo: 'StuidoCLAW/SpaceOdyssey',
    date: '2026-08',
    reviewerScores: [2.33, 1.67, 1.33],
    awardedStars: 2,
    driver:
      'Nine of eleven SFX are the same 4,044-byte file of digital silence (md5 ' +
      'c0a19322…): spin, reel_stop, click, win, big_win, anticipation, tease_miss, ' +
      'bonus_token, barrel_break. The reels spin in silence. Creativity (four ' +
      'interactive bonus worlds) held one reviewer at 2.33.',
    source: 'spaceodyssey/STAKE-AUDIT-2026-08-12.md H7; verified by md5 at HEAD',
  },
  {
    title: "Mummy's Riches",
    repo: 'StuidoCLAW/MummysRiches',
    date: '2026-08-11',
    reviewerScores: [1.67, 2.33, 2.0],
    awardedStars: 2,
    driver:
      'Reviewer #1 scored 1.67 with no comment — diagnosed afterwards as scene ' +
      'warm-up on the main thread: 7.7fps after PLAY and a 3.7s frozen frame at 6x ' +
      'CPU throttle. Reviewer #2 scored 2.33 with one sentence: "some animations ' +
      'end abruptly" — one-shot clips given windows shorter than their authored length.',
    source: 'mummysriches/docs/STAKE-REVIEWER-LESSONS.md §1 round 6',
  },
  {
    title: 'Tiki Taka Madness',
    repo: 'StuidoCLAW/Tiki-Taka-Madness',
    date: '2026-08-21',
    reviewerScores: [2.33, 2.0, 2.0],
    awardedStars: 2,
    driver:
      'Itemised checklist findings: bet amount taken from cached data instead of the ' +
      'latest authenticate; both scrollbars shown at once in the replay window; ' +
      'restricted terminology (payline/payout) in menus; decimal-place rules; a base ' +
      'mode event stalled at "press the Spin button".',
    source: 'tiki-taka-madness/docs/STAKE-RETEST-CHECKLIST-2026-08-21.md',
  },
] as const;

export interface BacktestRow extends HistoricalReview {
  average: number | null;
  modelled: StarTier | null;
  matches: boolean;
}

/** Replays every recorded return through the model. No drift: these are actuals. */
export function backtest(): BacktestRow[] {
  return HISTORY.map((h) => {
    if (h.reviewerScores.length === 0) {
      return { ...h, average: null, modelled: null, matches: true };
    }
    const notches = h.reviewerScores.reduce((s, v) => s + scoreToNotch(v), 0);
    const average = notches / h.reviewerScores.length / 3;
    const modelled = toStars(average);
    return { ...h, average, modelled, matches: modelled === h.awardedStars };
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
  if (card.score === undefined) throw new Error(`${source}: missing score`);
  scoreToNotch(card.score); // throws with the legal values listed
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
  console.log('\nCalibration — every recorded Clawbyte return\n');
  for (const r of rows) {
    const scores = r.reviewerScores.length
      ? r.reviewerScores.map(f2).join(' / ')
      : '(split not recorded)';
    const avg = r.average === null ? '   —' : f2(r.average);
    const flag = r.average === null ? '' : r.matches ? ' ok' : ' MISMATCH';
    console.log(
      `  ${r.title.padEnd(26)} ${scores.padEnd(22)} avg ${avg}  ->  ${r.awardedStars}*${flag}`,
    );
  }
  const scored = rows.filter((r) => r.average !== null);
  const ok = scored.every((r) => r.matches);
  const mean = scored.reduce((s, r) => s + (r.average ?? 0), 0) / scored.length;
  console.log(`\n  Model reproduces every recorded return: ${ok ? 'YES' : 'NO'}`);
  console.log(`  Catalogue mean panel average:           ${f2(mean)}`);
  console.log(`  Not approved below:                     ${f2(APPROVAL_FLOOR)}`);
  console.log(`  3 stars needs:                          ${f2(averageRequiredFor(3))}\n`);
  if (!ok) process.exitCode = 1;
}

function printPanel(r: PanelResult): void {
  console.log(`\n${r.game} — predicted Stake panel\n`);
  for (const id of Object.keys(REVIEWERS) as ReviewerId[]) {
    console.log(`  ${REVIEWERS[id].title.padEnd(38)} ${f2(r.scores[id])}`);
  }
  console.log(`\n  Panel average    ${f2(r.raw)}`);
  if (r.driftNotches > 0) {
    console.log(
      `  Standards drift  -${r.driftNotches} notch${r.driftNotches === 1 ? '' : 'es'} per reviewer (-${f2(r.driftNotches / 3)})`,
    );
    console.log(`  Adjusted         ${f2(r.adjusted)}`);
  }
  console.log(`\n  PREDICTED        ${TIERS[r.stars].label}`);
  if (!r.approved) {
    console.log(`  NOT APPROVED     average below ${f2(APPROVAL_FLOOR)} — 7-day lockout`);
  }
  if (r.neededForNextStar !== null) {
    const gap = r.neededForNextStar - r.adjusted;
    const notches = Math.ceil(gap * 9 - EPS);
    console.log(
      `  For ${r.stars + 1} stars      average ${f2(r.neededForNextStar)} ` +
        `(+${f2(gap)}, i.e. ${notches} reviewer notch${notches === 1 ? '' : 'es'})`,
    );
  }
  console.log('');
}

function main(argv: string[]): void {
  const driftArg = argv.find((a) => a.startsWith('--drift='));
  const driftNotches = driftArg ? Number(driftArg.split('=')[1]) : STANDARDS_DRIFT_NOTCHES;

  if (argv.includes('--backtest')) return printBacktest();

  if (argv.includes('--scale')) {
    console.log('\nLegal reviewer scores:', SCALE.join('  '));
    console.log('\nAxes:');
    for (const a of AXES) {
      console.log(`\n  ${a.id} — ${a.title}`);
      for (const b of a.bands) console.log(`    ${b.at.padEnd(10)} ${b.means}`);
    }
    console.log('');
    return;
  }

  const scoresArg = argv.find((a) => a.startsWith('--scores='));
  if (scoresArg) {
    const parts = scoresArg.split('=')[1].split(',').map(Number);
    if (parts.length !== 3) throw new Error('--scores needs 3 values: veteran,enthusiast,inspector');
    const ids = Object.keys(REVIEWERS) as ReviewerId[];
    const cards: Scorecard[] = ids.map((id, i) => ({
      game: 'ad-hoc',
      reviewer: id,
      date: new Date().toISOString().slice(0, 10),
      score: notchToScore(scoreToNotch(parts[i])),
    }));
    return printPanel(aggregate(cards, { driftNotches }));
  }

  const dirArg = argv.find((a) => a.startsWith('--verdicts='));
  if (dirArg) {
    return printPanel(aggregate(loadVerdicts(dirArg.split('=')[1]), { driftNotches }));
  }

  console.log(`
Stake review scorer — 0-3 stars, 3 anonymous reviewers

  npx tsx tools/stake-review/score.ts --backtest
  npx tsx tools/stake-review/score.ts --scale
  npx tsx tools/stake-review/score.ts --verdicts=docs/stake-review/verdicts/huo
  npx tsx tools/stake-review/score.ts --scores=2.33,1.67,2
  ...any of the above with --drift=0   (0 = predict raw, no standards uplift)

Legal reviewer scores: ${SCALE.join(', ')}
`);
}

const invokedDirectly =
  process.argv[1] !== undefined && process.argv[1].endsWith('score.ts');
if (invokedDirectly) {
  // Piping into `head` closes stdout early; that is not an error worth a stack trace.
  process.stdout.on('error', (err: NodeJS.ErrnoException) => {
    if (err.code !== 'EPIPE') throw err;
  });
  main(process.argv.slice(2));
}
