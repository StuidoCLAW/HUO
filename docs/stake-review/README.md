# Stake review panel

Three reviewer agents that predict the star rating a game would get from Stake
Engine, plus a deterministic scorer calibrated against every review return
Clawbyte has received.

Built from the platform's own rating spec and seven rounds of real reviewer
contact recorded across the four shipped game repositories — not from guesswork.

| File | What it is |
|---|---|
| `RATING-SYSTEM.md` | The scale, the maths, the axes, the rules |
| `CALIBRATION.md` | Where every part of it comes from, per-game analysis, and the limits |
| `DEFECT-CORPUS.md` | What has actually cost us stars, with sources |
| `../../.claude/agents/stake-reviewer-*.md` | The three reviewers |
| `../../tools/stake-review/rubric.ts` | Scale, tiers, axes, personas |
| `../../tools/stake-review/score.ts` | Aggregation, drift, back-test, CLI |
| `verdicts/<game>/` | Where each panel's scorecards land |

## Run a panel

Launch all three at once so none can see the others' work:

```
Review <game> as it stands, at <path>. Use stake-reviewer-creative,
stake-reviewer-player and stake-reviewer-compliance, all three in parallel,
each writing to docs/stake-review/verdicts/<game>/.
```

Then aggregate:

```bash
npx tsx tools/stake-review/score.ts --verdicts=docs/stake-review/verdicts/<game>
```

```
Into The Slot O' Verse — predicted Stake panel

  Reviewer 1 — creativity-weighted       2.33
  Reviewer 2 — polish-weighted           1.33
  Reviewer 3 — checklist-weighted        1.67

  Panel average    1.78
  Standards drift  -1 notch per reviewer (-0.33)
  Adjusted         1.44

  PREDICTED        1 star
  For 2 stars      average 1.50 (+0.06, i.e. 1 reviewer notch)
```

Those are Into The Slot O' Verse's real reviewer scores. Stake awarded it 2
stars on a 1.78 average; the panel here predicts 1 star because the standards
uplift is applied on top. That is the uplift working as intended — a prediction
is deliberately harsher than the historical return. Use `--drift=0` when you want
to compare like for like against a past result.

## Reviewing a game in another repository

The agents are game-agnostic — point them at any checkout. They expect to find,
or be told where to find:

- the built or buildable frontend
- the maths pack, if there is one
- the game's own rules/paytable surface

They read `MummysRiches/docs/STAKE-REVIEWER-LESSONS.md` for the reviewer
checklist when it is available; clone that repo alongside if you are reviewing
something outside this workspace.

## Other commands

```bash
npx tsx tools/stake-review/score.ts --backtest             # replay every recorded return
npx tsx tools/stake-review/score.ts --scale                # legal scores + axis bands
npx tsx tools/stake-review/score.ts --scores=2.33,1.67,2   # ad-hoc panel
npx tsx tools/stake-review/score.ts --backtest --drift=0   # no standards uplift
```

The back-test runs as part of `npm test`, so the model cannot drift away from the
returns it was fitted to.

## Working the result

The predicted star is the least useful part of the output.

1. **Blockers**, across all three verdicts — anything pushing the average toward
   1.0 is an existential problem, not a quality one.
2. **The three one-notch lifts.** Each reviewer names the single change that would
   move their own score up one step. Three changes, 0.33 each, is a full star.
3. **"What I could not verify."** A reviewer will not be able to check it either,
   and will score it as absent.

And the thing the catalogue actually proves: **a 2-star is not the end.**
Graveyard Shift's 3 stars came from a re-rate after working the attached fix list.
Getting the list and working it is the highest-yield move available.
