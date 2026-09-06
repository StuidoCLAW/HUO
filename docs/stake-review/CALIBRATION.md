# Calibration — how the rating system was derived

Reconstructs Stake's scoring from the four review returns Clawbyte has received.
Everything here is either **observed** (the returns themselves), **derived**
(arithmetic that follows from them), or **assumed** (labelled as such). Nothing
is presented as coming from Stake that did not.

---

## 1. Observed — the four returns

| Game | Live | Reviewer 1 | Reviewer 2 | Reviewer 3 | Overall awarded |
|---|---|---|---|---|---|
| Graveyard Shift | ~Jul 2026 | 2.00 | 2.33 | 3.00 | **3** |
| Into the Slot-o-Verse | ~Jul 2026 | 2.33 | 1.67 | 1.33 | **2** |
| Mummy's Riches | recent | 1.67 | 2.33 | 2.00 | **2** |
| Tiki Taka Madness | recent | 2.33 | 2.00 | 2.00 | **2** |

Twelve reviewer scores, four headline ratings.

## 2. Derived — every reviewer score is an exact third

The twelve values take five distinct forms: 1.33, 1.67, 2.00, 2.33, 3.00.
Every one is an exact third:

```
1.33 = 4/3    1.67 = 5/3    2.00 = 6/3    2.33 = 7/3    3.00 = 9/3
```

Twelve of twelve landing on thirds is not chance. A reviewer's reported score is
**the mean of three whole-star sub-scores**. That gives the structure:

> **3 reviewers × 3 criteria = 9 integer stars per submission.**

Each submission therefore decodes to an integer subtotal per reviewer (3–15) and
an integer total across the panel (9–45):

| Game | Subtotals | Panel total | Panel raw |
|---|---|---|---|
| Graveyard Shift | 6, 7, 9 | 22 | 22/9 = **2.44** |
| Into the Slot-o-Verse | 7, 5, 4 | 16 | 16/9 = **1.78** |
| Mummy's Riches | 5, 7, 6 | 18 | 18/9 = **2.00** |
| Tiki Taka Madness | 7, 6, 6 | 19 | 19/9 = **2.11** |

All four are exact ninths. The panel raw is simply **the sum of nine integer
stars divided by nine** — which is why the scorer works entirely in ninths and
no float can move a headline.

## 3. Derived — the headline rounding, and the one outlier

Three of the four headlines are ordinary round-half-up of the panel raw:

- 1.78 → 2 ✓
- 2.00 → 2 ✓
- 2.11 → 2 ✓

**Graveyard Shift is the exception.** 2.44 → 3 requires rounding up from below
one half. Its fractional part is exactly 4/9 (0.4444). So in the July cohort the
round-up threshold sat at or below 4/9; in the current cohort nothing has been
observed rounding up below 0.5.

That single data point is the only *measurable* evidence of standards tightening
in the returns, and it is worth 1/18 of a star. It is real, and it is small.

An equally good reading of the same point: Graveyard Shift had a reviewer at a
clean 3.00 and the headline followed the ceiling rather than the mean. Both
readings predict the same thing for us — **that generosity is gone** — so the
model encodes the numeric version and notes this one here.

## 4. Assumed — the standards drift

> "Standards have since increased." — Jake

Taken as given. The returns cannot measure it beyond the 1/18 above, because the
recent cohort's raws (2.00 and 2.11) sit in a band where both the old and new
rounding rules agree, and nothing has scored above 3 for us to test the upper
thresholds against.

So the drift is a **policy constant, not a finding**:

```ts
export const STANDARDS_DRIFT_STARS = 0.5;   // tools/stake-review/score.ts
```

Score a build against the July-anchored rubric anchors, then subtract 0.5 to
predict today's Stake headline. Tune it in that one place, or pass `--drift=N`.
If a fifth return comes back, re-fit it against the actual result — that is what
the constant is for.

**Consequence of drift 0.5, and the single most useful number in this document:**

```
headline star = round_half_up(panel raw − 0.5)

  3 stars needs panel raw ≥ 3.00   — a straight 3 across all nine criteria
  4 stars needs panel raw ≥ 4.00   — a straight 4 across all nine criteria
```

The bar is now **the panel average must equal the star you want**. One 2 among
nine criteria puts a 3-star submission back to 2 stars. There is no carrying a
weak lane on the strength of the other two.

## 5. Derived — what our back catalogue is worth today

Run `npx tsx tools/stake-review/score.ts --backtest`:

```
  Game                    Cohort     Reviewers            Raw   Model  Awarded  Today
  Graveyard Shift         jul-2026   2.00 2.33 3.00       2.44  3      3 ok   2
  Into the Slot-o-Verse   jul-2026   2.33 1.67 1.33       1.78  2      2 ok   1
  Mummy's Riches          current    1.67 2.33 2.00       2.00  2      2 ok   2
  Tiki Taka Madness       current    2.33 2.00 2.00       2.11  2      2 ok   2

  Model reproduces all four returns: YES
  Clawbyte cohort mean panel raw:    2.08
```

The model reproduces all four awarded ratings exactly. Two things follow:

1. **Graveyard Shift, our best result, is a 2-star game today.** Resubmitted
   unchanged it would not hold its 3. Do not treat it as the standard to match.
2. **The house baseline is 2.08.** Four submissions, no trend, no title above
   the rounding line under current rules. A new build starts from the assumption
   that it is a 2 until it proves otherwise — which is exactly the posture the
   three reviewer agents are given.

## 6. What we do not know

Stated plainly, so nobody mistakes the model for inside knowledge.

- **Stake's real criterion names.** The 3×3 structure is forced by the
  arithmetic; the nine criteria in `RATING-SYSTEM.md` are our reconstruction of
  what a casino-game panel weighs, not a published list. The aggregation maths
  is right regardless of what the criteria are called.
- **The per-criterion breakdown of any past return.** We know each reviewer's
  subtotal, not their three individual stars. A subtotal of 7 could be 3+2+2 or
  1+3+3 — different diagnoses, same score. No past game is used as a
  per-criterion exemplar anywhere in the rubric for this reason.
- **Anything above 3 stars.** Every observation sits between 1.33 and 3.00. The
  4- and 5-star anchors are extrapolated from what the platform's stronger
  titles visibly do, not fitted to data. Treat them as a direction of travel.
- **Whether reviewers are specialists.** We assign three lanes because
  specialisation produces the score spread we see and makes the reviews
  actionable. Stake may allocate differently.
- **Whether drift is continuous or stepped.** One constant, revisited on the
  next return.

## 7. Re-fitting on the next return

When the next review comes back:

1. Add it to `HISTORY` in `tools/stake-review/score.ts` — subtotals as
   integers, cohort `current`.
2. Run `npm test`. The back-test will fail if the model no longer reproduces
   every return.
3. If it fails on the new row only, adjust `STANDARDS_DRIFT_STARS` or the
   cohort's `ROUND_UP_AT` until it fits, and record what changed here.
4. If our own pre-submission panel scored it too high, the anchors are soft —
   tighten the anchor text, not the constant.
