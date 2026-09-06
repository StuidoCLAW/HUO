# Stake review rating system

The rubric the three reviewer agents score against, and the maths that turns
nine numbers into a headline star. Derivation is in `CALIBRATION.md`; the
implementation is `tools/stake-review/`.

---

## The maths

```
reviewer score  = (that reviewer's 3 criterion stars) / 3      → 1.00 … 5.00 in thirds
panel raw       = (all 9 criterion stars) / 9                  → 1.00 … 5.00 in ninths
headline star   = round_half_up(panel raw − 0.5)               → 1 … 5
```

Criterion stars are **whole numbers, 1–5**. There are no half stars at criterion
level — the thirds in a reviewer score arise from averaging three whole stars
and nothing else. A reviewer who wants to award 2.5 must decide which of their
three criteria carries the difference.

The 0.5 is the standards drift (`STANDARDS_DRIFT_STARS`), which converts a score
made against these anchors into today's expected Stake headline. It is a policy
constant, not a measurement — see `CALIBRATION.md` §4.

### The gate

| Headline wanted | Panel raw needed | In plain terms |
|---|---|---|
| 2 stars | 2.00 | eighteen criterion stars |
| **3 stars** | **3.00** | **a straight 3 on all nine criteria** |
| 4 stars | 4.00 | a straight 4 on all nine criteria |

One 2 among nine criteria drops a 3-star submission to 2 stars. A strong lane
cannot carry a weak one. Clawbyte's four submissions average a 2.08 panel raw
and none clears the 3-star line under current rules.

---

## The nine criteria

Three lanes, three criteria each, one agent per lane. Full star anchors live in
`tools/stake-review/rubric.ts` and are reproduced in each agent's definition —
that file is the single source of truth for the wording.

### Maths & Game Integrity — `stake-reviewer-maths`

| Id | Criterion | Measures |
|---|---|---|
| M1 | Model correctness & verifiability | Is the RTP/house edge derived, reproducible, independently checkable? Do paytables in the docs match the code? |
| M2 | Volatility & session shape | Hit frequency, dead runs, win-size distribution, side-bet cadence, bankroll survivability |
| M3 | Rules integrity & edge cases | Spec compliance, ties/pushes/qualifiers, boundary states, max-win exposure |

### Player Experience & Presentation — `stake-reviewer-experience`

| Id | Criterion | Measures |
|---|---|---|
| X1 | Art direction & visual craft | Originality, asset quality, composition, theme coherence, distinct product vs reskin |
| X2 | Motion, feedback & audio | Timing and easing, anticipation, win celebration proportionality, sound, tactility |
| X3 | Clarity, usability & accessibility | Thirty-second comprehension, portrait/mobile, contrast, reduced motion, screen readers |

### Technical & Compliance — `stake-reviewer-technical`

| Id | Criterion | Measures |
|---|---|---|
| T1 | State integrity & anti-cheat | Server authority, hidden-state leakage, inference channels, RNG, replay resistance |
| T2 | Engineering quality & resilience | Load, errors, reconnection, session durability, money-path test coverage, dependencies |
| T3 | Platform & compliance readiness | Integration contract, certification pack, responsible gaming, jurisdictional copy, asset licensing |

### The shape of the anchors

Every criterion uses the same ladder, which is worth internalising:

| Star | What it means |
|---|---|
| 1 | Broken, absent, or actively wrong |
| 2 | Present on the happy path, unmeasured and untuned everywhere else |
| 3 | Competent, complete, evidenced — and forgettable |
| 4 | Deliberate and defended, with the evidence a third party could rerun |
| 5 | Exceptional; the platform would market it |

**3 is not a good score, it is the passing score.** Most builds at this studio
sit at 2 because they are complete on the happy path and unmeasured elsewhere.
The distance from 2 to 3 is almost always measurement, coverage and tuning —
not features.

---

## Rules for scoring

1. **Score the repository, not the roadmap.** Planned work scores as absent.
2. **Every score needs three cited evidence items.** `file:line`, a command and
   its output, a measured number, or a screenshot. A score without citations is
   not a review.
3. **Every score needs a one-star lift** — the single change that would move it
   up by one. One, not a list.
4. **Default to 2 and make the build climb.** The base rate is 2.08.
5. **Never award 4 or 5 without naming the artefact that proves it.**
6. **Reviewers score their own lane only.** The scorer rejects a scorecard that
   reaches into another lane.
7. **Reviewers score blind.** No agent reads another's verdict before writing
   its own. Aggregation happens afterwards, mechanically.
8. **British English, no hedging.** House style applies to reviews too.

---

## Running a panel

See `README.md` in this directory for the commands.
