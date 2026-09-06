# Stake review rating system

What the three reviewer agents score against, and the maths that turns three
scores into a star rating. Derivation and sources: `CALIBRATION.md`. What
actually loses stars: `DEFECT-CORPUS.md`.

---

## The maths

```
Each reviewer picks ONE value from:  0 · 0.33 · 0.67 · 1 · 1.33 · 1.67 · 2 · 2.33 · 2.67 · 3
panel average = (r1 + r2 + r3) / 3
stars         = round(panel average)        ... EXCEPT
average < 1.0 = 0 stars, NOT APPROVED, thread locked 7 days
```

There are no sub-scores and no half-values. 1.5 and 2.5 are not scores a Stake
reviewer can enter, and the scorer rejects them.

| Stars | Panel average | What it gets you |
|---|---|---|
| **3** | ≥ 2.50 | Burst Games, Stake Exclusives, featured in New Releases |
| **2** | 1.50 – 2.49 | Promotional placement only if popularity drives it |
| **1** | 1.00 – 1.49 | Bottom of New Releases, no promotion |
| **0** | < 1.00 | Not published. 7-day lockout. |

### The two numbers that matter

- **2.50 is the 3-star line.** Three reviewers at 2.33 average 2.33 — that is a
  2-star game. Reaching 3 needs a 2.67 or a 3.00 in the mix, and no Clawbyte game
  has been given more than 2.33 on a first pass.
- **1.00 is a cliff, not a slope.** 0.99 is not "nearly a 1-star game", it is a
  rejection and a week of lockout. Into The Slot O' Verse's own audit put it at
  1.33–1.67 with "genuine sub-1.0 risk if all three weight audio".

### Standards uplift

Each predicted reviewer score is docked **one notch (0.33)** before the panel is
struck — Jake's instruction that Stake have raised the bar since July 2026,
expressed in the smallest unit a real reviewer can move. It costs 0.33 of a star.
Pass `--drift=0` for the raw prediction. See `CALIBRATION.md` §6; it is a policy
setting, not a measurement.

---

## The three axes

Every reviewer weighs all three. What differs is the weighting.

| Axis | What it covers |
|---|---|
| **Creativity, uniqueness, identity** | Is there a mechanic or structure a player could not get elsewhere? Does it read as its own game or a reskin? |
| **Polish, feel and completeness** | Audio, animation completeness, frame rate on ordinary hardware, speed, win presentation. What ten minutes of play with sound on feels like. |
| **Compliance and correctness** | The reviewer checklist: RGS bet levels, currency decimals, social scrub, popout layouts, replay, resume, rules accuracy, asset and request hygiene. |

Run `npx tsx tools/stake-review/score.ts --scale` to print the score bands for
each axis.

## The three reviewers

| Agent | Weighting | Method |
|---|---|---|
| `stake-reviewer-creative` | 50% creativity | Plays every mode and buy tier hunting for a hook. Our historical high scorer — and the one most likely to over-score. |
| `stake-reviewer-player` | 60% polish | Ten minutes of ordinary play, sound on, CPU throttled. **Every sub-2.0 score in the catalogue came from this axis.** |
| `stake-reviewer-compliance` | 60% compliance | Works the checklist across currencies, locales, jurisdictions and viewports. Files itemised findings. |

They score blind — no agent reads another's verdict — and the aggregation is
mechanical.

---

## Where the effort goes

From five returns across four games:

- **Polish caused every low score.** Silence, frame rate, animations ending
  abruptly. Nothing else has ever taken a Clawbyte game below 2.0.
- **Maths has never cost us a star.** The constraints still bind (RTP 90–98%, all
  modes within 0.5%, max win reachable at 1-in-20M or better, hit rate 1-in-3 to
  1-in-8) but no reviewer has scored us down on them.
- **Creativity is our strongest axis** and is worth protecting. Into The Slot O'
  Verse held a 2.33 from one reviewer while shipping in silence, purely on the
  strength of its four bonus worlds.

Stake's 3-star bar is "exceptional creativity, uniqueness, **and** attention to
detail". The studio keeps supplying the creativity and losing the stars on the
attention to detail.

---

## Rules for scoring

1. **Score the build, not the documentation.** Documents in our own repos have
   asserted the opposite of the code. Verify against the artefact.
2. **Prove the instrument.** A review that could not see the game reports a clean
   bill of health, which is worse than no review.
3. **Every claim carries a citation** — `file:line`, a command and its output, a
   hash, a measured number, or a screenshot.
4. **Absence is a finding**, and it is scored as absent.
5. **Only the ten legal values.** Whole stars and halves are not on the scale.
6. **Blind, then aggregate.** No reviewer reads another before writing.
7. **British English, no hedging, no emojis** — including in the product.
