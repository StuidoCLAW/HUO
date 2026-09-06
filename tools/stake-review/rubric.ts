/**
 * Stake review rubric — criterion definitions and star anchors.
 *
 * Structure is RECONSTRUCTED from the four Clawbyte review returns, not
 * published by Stake. See docs/stake-review/CALIBRATION.md for the derivation.
 * Every awarded reviewer score we have ever received is an exact third
 * (1.33, 1.67, 2.00, 2.33, 3.00), which means each reviewer awards three
 * whole-star sub-scores and reports their mean. Three reviewers x three
 * criteria = nine integer stars per submission.
 */

export type Star = 1 | 2 | 3 | 4 | 5;

export type ReviewerId = 'maths' | 'experience' | 'technical';

export type CriterionId =
  | 'M1' | 'M2' | 'M3'
  | 'X1' | 'X2' | 'X3'
  | 'T1' | 'T2' | 'T3';

export interface Criterion {
  id: CriterionId;
  reviewer: ReviewerId;
  title: string;
  /** What the reviewer is actually measuring. */
  scope: string;
  /** Star anchors, index 0 = 1 star ... index 4 = 5 stars. */
  anchors: [string, string, string, string, string];
}

export const REVIEWERS: Record<ReviewerId, { title: string; remit: string }> = {
  maths: {
    title: 'Maths & Game Integrity',
    remit:
      'Return-to-player model, volatility, session shape, rules correctness, ' +
      'edge cases and exposure. Scores nothing on how the game looks.',
  },
  experience: {
    title: 'Player Experience & Presentation',
    remit:
      'Art direction, motion, audio, readability, control feel, mobile and ' +
      'accessibility. Scores nothing on how the maths are implemented.',
  },
  technical: {
    title: 'Technical & Compliance',
    remit:
      'State integrity, anti-cheat, performance, resilience, test coverage, ' +
      'platform integration and certification readiness.',
  },
};

export const CRITERIA: readonly Criterion[] = [
  {
    id: 'M1',
    reviewer: 'maths',
    title: 'Model correctness & verifiability',
    scope:
      'Is the stated RTP / house edge derived, reproducible and independently ' +
      'checkable? Do the paytables, multipliers and qualifier arithmetic agree ' +
      'with the shipped code?',
    anchors: [
      'No published model. RTP is asserted, not computed. Code and spec disagree.',
      'A model exists but is unreproducible: no seed, no reference implementation, no confidence interval. Figures quoted to a precision the evidence cannot support.',
      'Reproducible simulation with a fixed seed and a documented strategy assumption. Paytable arithmetic matches the code. No second independent implementation.',
      'Two independent implementations agree byte-for-byte over a large sample. RTP quoted with a confidence interval and a stated player-strategy basis. Sensitivity to each paytable line is documented.',
      'The above, plus optimal-play RTP bounded from both sides, exposure curves per bet type, and a certifier-ready submission pack that a third party could rerun unaided.',
    ],
  },
  {
    id: 'M2',
    reviewer: 'maths',
    title: 'Volatility & session shape',
    scope:
      'Hit frequency, dead-spin/dead-hand runs, win-size distribution, side-bet ' +
      'cadence, bankroll survivability over a realistic session.',
    anchors: [
      'Volatility unmeasured. Long dead runs with no compensating structure.',
      'Headline hit frequency only. No distribution, no run-length analysis, no bankroll modelling. Side bet is a flat tax with no visible payoff cadence.',
      'Hit frequency, win-size histogram and median session outcome are measured and defensible for the stated volatility band.',
      'Run-length distributions, percentile session outcomes and time-to-bust curves are modelled at each stake tier. The pacing of big wins is a deliberate, evidenced choice.',
      'The above, plus the shape is tuned against comparable live titles with a stated target player-hours-per-session, and the tuning is reproducible.',
    ],
  },
  {
    id: 'M3',
    reviewer: 'maths',
    title: 'Rules integrity & edge cases',
    scope:
      'Spec compliance, ties/pushes/qualifiers, boundary states, max-win ' +
      'exposure, and any input that produces a payout the model did not predict.',
    anchors: [
      'A reachable state pays wrongly, or the rules as coded contradict the rules as displayed.',
      'Happy path is correct. Boundary behaviour (ties, pushes, qualifier misses, max stake, simultaneous wins) is untested or undocumented.',
      'Every rule branch has a test. Ties, pushes and qualifier outcomes are explicitly covered and match the displayed rules.',
      'Exhaustive or near-exhaustive enumeration of outcome classes, with max-win exposure per bet type bounded and stated. Adversarial inputs produce defined behaviour.',
      'The above, plus a written threat model of rule exploitation and evidence that no bet combination beats the house over any horizon.',
    ],
  },
  {
    id: 'X1',
    reviewer: 'experience',
    title: 'Art direction & visual craft',
    scope:
      'Originality, asset quality, compositional discipline, theme coherence, ' +
      'and whether the title reads as a distinct product or a reskin.',
    anchors: [
      'Stock or placeholder assets. No coherent direction. Reads as a template.',
      'A theme is present but generically executed. Inconsistent lighting, mismatched asset provenance, unconsidered typography, crowded or unbalanced composition.',
      'Consistent, competently executed direction. Deliberate palette and type choices. Nothing embarrassing, nothing memorable.',
      'A specific and defensible visual identity carried through every surface, including the states players see least. Detail rewards a second look.',
      'The above, plus a signature the platform can market. Craft quality is visible in motion, at rest, on a small screen and in a thumbnail.',
    ],
  },
  {
    id: 'X2',
    reviewer: 'experience',
    title: 'Motion, feedback & audio',
    scope:
      'Animation timing and easing, anticipation and payoff, win celebration ' +
      'proportionality, sound design, and moment-to-moment tactility.',
    anchors: [
      'Instant state changes, no easing, no audio. Nothing acknowledges the player.',
      'Basic transitions exist but are uniform and untuned. No anticipation before a reveal. Wins of every size are celebrated identically, or not at all.',
      'Timing is tuned, reveals build tension, wins are celebrated in proportion to size. Audio present and mixed.',
      'Motion carries the game rules: the player reads what happened without text. Layered audio, dynamic mix, and a rewarding tactile response to every input.',
      'The above, plus a paced escalation across a session and a signature win moment that players would recognise out of context.',
    ],
  },
  {
    id: 'X3',
    reviewer: 'experience',
    title: 'Clarity, usability & accessibility',
    scope:
      'Can a new player understand the bet, the odds and the outcome in thirty ' +
      'seconds? Mobile portrait, one-handed reach, contrast, motion sensitivity, ' +
      'screen readers, and error recovery in the UI.',
    anchors: [
      'Rules are unavailable or wrong. Unplayable on a phone. Outcomes are ambiguous.',
      'Desktop-first layout, cramped or broken in portrait. Paytable present but hard to parse. No accessibility provision. The player can lose a hand without understanding why.',
      'Readable at every supported viewport, rules and paytable accessible in-game, outcomes explained in plain language. Basic contrast standards met.',
      'Portrait-native layout with one-handed reach, a reduced-motion path, keyboard and screen-reader support, and an outcome summary that names the winning combination.',
      'The above, plus first-session onboarding, live hand-strength feedback, and no measured comprehension failure in playtesting.',
    ],
  },
  {
    id: 'T1',
    reviewer: 'technical',
    title: 'State integrity & anti-cheat',
    scope:
      'Server authority over every outcome, what the client can observe or ' +
      'infer ahead of time, RNG handling, and replay/tamper resistance.',
    anchors: [
      'Outcomes decided client-side, or hidden state reachable from the client.',
      'Server decides outcomes but leaks: hidden cards, future board, deck order or timing sit in a payload, a response size or a log the client can reach.',
      'Server authoritative, hidden state withheld until the rules reveal it, transitions validated server-side, cryptographic RNG.',
      'The above, plus verified absence of inference channels, per-round audit records sufficient to reconstruct any dispute, and idempotent replay-safe actions.',
      'The above, plus provably-fair commitment or equivalent, and an external review confirming no observable channel discloses future state.',
    ],
  },
  {
    id: 'T2',
    reviewer: 'technical',
    title: 'Engineering quality & resilience',
    scope:
      'Performance under load, memory behaviour, error handling, reconnection, ' +
      'test coverage of the paths that lose money, and dependency hygiene.',
    anchors: [
      'Crashes, unhandled rejections, or state loss during ordinary play.',
      'Works on the happy path. Reconnection, concurrency, cold starts or session expiry lose player state. Tests cover construction but not the failure paths.',
      'Errors handled and logged without leaking internals, reconnection restores play, the money-handling paths are tested, dependencies are current and minimal.',
      'Load-tested to a stated concurrency with published latency percentiles, durable session state, graceful degradation, and coverage on every path that can pay or take money.',
      'The above, plus chaos-tested failure injection, a documented recovery procedure, and observability sufficient to settle a player dispute from logs alone.',
    ],
  },
  {
    id: 'T3',
    reviewer: 'technical',
    title: 'Platform & compliance readiness',
    scope:
      'Stake Engine integration contract, certification readiness, responsible ' +
      'gaming provision, jurisdictional copy, and asset licensing.',
    anchors: [
      'No platform integration. Would not run in the host environment.',
      'Integration is partial or hand-rolled. No responsible-gaming provision, no certification pack, licensing of assets undocumented.',
      'Integration contract met, RNG documented for certification, responsible-gaming controls present, asset licences on file.',
      'Certification submission pack complete and reviewed, session limits and reality checks implemented, jurisdictional copy variants handled, full asset provenance.',
      'The above, plus an accepted certification result and a maintenance plan for regulatory change.',
    ],
  },
] as const;

export const CRITERIA_BY_REVIEWER: Record<ReviewerId, readonly Criterion[]> = {
  maths: CRITERIA.filter((c) => c.reviewer === 'maths'),
  experience: CRITERIA.filter((c) => c.reviewer === 'experience'),
  technical: CRITERIA.filter((c) => c.reviewer === 'technical'),
};
