# Stake review panel

Three independent reviewer agents plus a deterministic scorer, calibrated
against the four review returns Stake have given Clawbyte. Predicts the star
rating a build would receive and names what is costing the stars.

- `RATING-SYSTEM.md` — the rubric and the maths
- `CALIBRATION.md` — how it was derived from our four returns, and its limits
- `../../tools/stake-review/rubric.ts` — criteria and star anchors (source of truth)
- `../../tools/stake-review/score.ts` — aggregation, drift, back-test, CLI
- `../../.claude/agents/stake-reviewer-*.md` — the three reviewer agents
- `verdicts/<game>/` — where each panel's scorecards land

## Run a panel on a build

Score blind, then aggregate. Launch all three in one go so none can see the
others' output:

```
Review Heads Up Omaha as it stands. Use stake-reviewer-maths,
stake-reviewer-experience and stake-reviewer-technical, all three in parallel,
each writing to docs/stake-review/verdicts/huo/.
```

Each agent writes `<lane>.md` (the review) and `<lane>.json` (the scores). Then
aggregate:

```bash
npx tsx tools/stake-review/score.ts --verdicts=docs/stake-review/verdicts/huo
```

```
Heads Up Omaha — panel result

  Maths & Game Integrity           2.33
  Player Experience & Presentation 1.67
  Technical & Compliance           2.00

  Panel raw       2.00  (18/9)
  Standards drift -0.50
  Adjusted        1.50

  HEADLINE        2 stars
  For 3 stars     panel raw 3.00 (+1.00, i.e. 9 more criterion stars)
```

(Illustrative shape, not a real result.)

## Other commands

```bash
# Replay the four historical returns through the model
npx tsx tools/stake-review/score.ts --backtest

# Score an ad-hoc set of nine criterion stars, M1..T3 in order
npx tsx tools/stake-review/score.ts --scores=2,3,2,2,2,2,3,3,2

# Model a different standards assumption
npx tsx tools/stake-review/score.ts --verdicts=docs/stake-review/verdicts/huo --drift=0.75
```

The back-test also runs as part of `npm test`, so the model cannot silently
drift away from the returns it was fitted to.

## Working the result

The headline is the least useful part of the output. What you act on is:

1. **Blockers**, across all three verdicts — these stop a submission regardless
   of score.
2. **The one-star lifts.** Nine of them, one per criterion. Because a 3-star
   headline needs a straight 3, the job is to find every criterion sitting at 2
   and take its lift. Ordering by effort against that list is the release plan.
3. **"What I could not verify."** Anything a reviewer could not check, a Stake
   reviewer will also fail to check — and will score as absent.

## When the next return arrives

Add it to `HISTORY` in `tools/stake-review/score.ts` and run `npm test`. If the
back-test fails, the model needs re-fitting — the procedure is in
`CALIBRATION.md` §7. Compare the actual return against our panel's prediction
for the same build: the gap tells you whether the anchors are soft and by how
much.
