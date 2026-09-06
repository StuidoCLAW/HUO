/**
 * Stake Engine review rubric.
 *
 * Unlike the first cut of this file, nothing here is reverse-engineered from
 * score arithmetic. The rating mechanics below are Stake's own, quoted from the
 * vendored platform documentation:
 *
 *   graveyard-shift/docs/stake-engine/approval-quality.svx  ("Game Quality Rankings")
 *   graveyard-shift/docs/stake-engine/approval-checklist.json (31 structured items)
 *
 * The three reviewer personas ARE a construct — see docs/stake-review/CALIBRATION.md
 * §5 for what is evidenced and what is not.
 */

/** The only values a Stake reviewer may select. Not a continuous scale. */
export const SCALE = [0, 0.33, 0.67, 1, 1.33, 1.67, 2, 2.33, 2.67, 3] as const;
export type ReviewerScore = (typeof SCALE)[number];

/** Star tiers Stake awards. 0 means not approved, not "bad but published". */
export type StarTier = 0 | 1 | 2 | 3;

export type ReviewerId = 'veteran' | 'enthusiast' | 'inspector';

/**
 * Stake's published tier definitions, quoted. These are the words the reviewers
 * are scoring against, so they are the words our agents score against.
 */
export const TIERS: Record<StarTier, { label: string; stake: string; visibility: string }> = {
  3: {
    label: '3 stars',
    stake:
      'Awarded only to studio-quality games showing exceptional creativity, ' +
      'uniqueness, and attention to detail.',
    visibility:
      'Optimal positioning — eligible for Burst Games, Stake Exclusives, and the ' +
      'featured section of New Releases.',
  },
  2: {
    label: '2 stars',
    stake:
      'Given to games that show considerable creativity or originality. While they ' +
      'may lack polish compared to more established studios, they still demonstrate ' +
      'strong development quality and attention to detail.',
    visibility:
      'Can appear in Burst Games or Stake Exclusives if driven by user popularity. ' +
      'Placement in New Releases depends on space and demand.',
  },
  1: {
    label: '1 star',
    stake: 'Games of lower polish that still meet publishing requirements.',
    visibility:
      'Published with limited visibility. Always at the bottom of New Releases. ' +
      'Not included in promotional categories unless driven by exceptional demand.',
  },
  0: {
    label: 'Not approved',
    stake:
      'Average below 1.0. The game is not published, the approval thread is closed ' +
      'and locked for 7 days, after which it may be resubmitted.',
    visibility: 'Not published. Does not appear on the platform.',
  },
};

/**
 * The three axes of judgement. EVERY reviewer reads all three — they all run the
 * same protocol (docs/stake-review/REVIEW-PROTOCOL.md). What differs is how much
 * each axis moves a given reviewer's number, which is temperament, not remit.
 */
export interface Axis {
  id: 'creativity' | 'polish' | 'compliance';
  title: string;
  scope: string;
  /** What each score band looks like on this axis. */
  bands: { at: string; means: string }[];
}

export const AXES: readonly Axis[] = [
  {
    id: 'creativity',
    title: 'Creativity, uniqueness and identity',
    scope:
      'Is there a mechanic, structure or identity a player could not get from ' +
      'another title? Does it read as its own game or as a reskin of a template?',
    bands: [
      { at: '0–0.67', means: 'A template with new art. Nothing here a player has not played.' },
      { at: '1–1.67', means: 'A recognised mechanic executed straight, with a theme layered on. Competent, anonymous.' },
      { at: '2–2.33', means: 'Considerable originality: a named mechanic of its own, or a structure with a hook. Stake\'s own 2-star language.' },
      { at: '2.67–3', means: 'Exceptional and unique. A structure the platform can market and a player can describe to a friend.' },
    ],
  },
  {
    id: 'polish',
    title: 'Polish, feel and completeness',
    scope:
      'Audio, animation completeness, frame rate on ordinary hardware, speed, ' +
      'win presentation. What a reviewer feels in ten minutes of play with sound on.',
    bands: [
      { at: '0–0.67', means: 'Reads as unfinished: silence, placeholder assets, stalls, or abrupt/missing animation.' },
      { at: '1–1.67', means: 'Plays, but the seams show — thin or missing audio, beats that end abruptly, frame drops on weaker hardware, slow gates on outcomes.' },
      { at: '2–2.33', means: 'Complete and consistent. Every event has a sound and a settled animation. Holds frame rate on a throttled device.' },
      { at: '2.67–3', means: 'Studio-quality. Layered audio, tiered win presentation, motion that carries the rules, fast at turbo.' },
    ],
  },
  {
    id: 'compliance',
    title: 'Platform compliance and correctness',
    scope:
      'The reviewer checklist: RGS bet levels, currency decimals, social scrub, ' +
      'popout layouts, replay, resume, rules accuracy, per-mode RTP and max win, ' +
      'asset and request hygiene.',
    bands: [
      { at: '0–0.67', means: 'A blocker: money can be taken wrongly, the game fails to load in a tested configuration, or restricted terminology is live.' },
      { at: '1–1.67', means: 'Several itemised findings a reviewer had to write up — decimals, cached bet, scrollbars, stalled events, copy that disagrees with the maths.' },
      { at: '2–2.33', means: 'The checklist passes; findings are nits the reviewer mentions in one sentence.' },
      { at: '2.67–3', means: 'Nothing to write up. Every currency, layout, locale and replay path behaves first time.' },
    ],
  },
] as const;

export const REVIEWERS: Record<
  ReviewerId,
  {
    title: string;
    /** How much each axis moves THIS reviewer's number. Not a division of labour. */
    bias: Record<Axis['id'], number>;
    temperament: string;
    /** Where this reviewer's scores historically cluster. */
    typicalRange: [number, number];
  }
> = {
  veteran: {
    title: 'Reviewer 1 — the veteran',
    bias: { creativity: 0.3, polish: 0.45, compliance: 0.25 },
    temperament:
      'Fifteen years in studios. Weighs craft and whether the thing is finished. ' +
      'Forgives a conventional mechanic executed well; cannot forgive unfinished ' +
      'work presented as finished. Writes barely anything.',
    typicalRange: [1.33, 2.33],
  },
  enthusiast: {
    title: 'Reviewer 2 — the enthusiast',
    bias: { creativity: 0.45, polish: 0.35, compliance: 0.2 },
    temperament:
      'Plays slots for pleasure and knows the catalogue by feel. Weighs whether ' +
      'it is fun. Forgives rough edges on a game with a real hook; cannot forgive ' +
      'boredom, being made to wait, or a dead session. Widest range on the panel.',
    typicalRange: [0.67, 2.67],
  },
  inspector: {
    title: 'Reviewer 3 — the inspector',
    bias: { creativity: 0.25, polish: 0.25, compliance: 0.5 },
    temperament:
      'Came from QA. Weighs accumulated defects by severity. Forgives nothing but ' +
      'weights honestly; cannot forgive anything touching money, or a game whose ' +
      'rules screen disagrees with its maths. Files numbered, reproducible items.',
    typicalRange: [1.0, 2.33],
  },
};

/** Notches: integer 0..9 mapping onto SCALE, so panel arithmetic stays exact. */
export function scoreToNotch(score: number): number {
  const i = SCALE.findIndex((s) => Math.abs(s - score) < 0.005);
  if (i === -1) {
    throw new Error(
      `${score} is not a Stake reviewer score. Legal values: ${SCALE.join(', ')}`,
    );
  }
  return i;
}

export function notchToScore(notch: number): ReviewerScore {
  if (!Number.isInteger(notch) || notch < 0 || notch > 9) {
    throw new Error(`notch must be an integer 0..9, got ${notch}`);
  }
  return SCALE[notch];
}
