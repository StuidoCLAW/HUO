# Calibration — the rating system, and where every part of it comes from

Rebuilt 2026-09-06 against the four game repositories. The first version of this
document reverse-engineered the rating maths from score arithmetic alone and got
the scale wrong. That correction is recorded in §7.

Sources are labelled throughout: **published** (Stake's own docs), **recorded**
(our repos' review history), **measured** (verified against the artefacts here),
or **assumed**.

---

## 1. Published — how Stake rates games

From `graveyard-shift/docs/stake-engine/approval-quality.svx`, Stake Engine's
"Game Quality Rankings" page, vendored into the repo:

- Games are rated **0 to 3 stars**. Not 0–5.
- Each game is assigned **3 anonymous reviewers**.
- Each reviewer selects **one value from a fixed 10-point scale**:

  > **0** · 0.33 · 0.67 · **1** · 1.33 · 1.67 · **2** · 2.33 · 2.67 · **3**

  "Reviewers select one of these 10 values — they cannot enter arbitrary decimals."
- The three scores are averaged and **rounded to the nearest whole number**.
- **Below 1.0 average → 0 stars, NOT APPROVED.** Thread closed and locked for 7
  days, then resubmission is allowed. "An average of 0.67 does not round up to 1."
  This policy has been in effect since March 2026.

Stake's own worked example: 2.33 + 2.33 + 3.00 → 2.55 → **3 stars**.

### Tier definitions, quoted

| Stars | Stake's words | Visibility |
|---|---|---|
| 3 | "Awarded only to studio-quality games showing exceptional creativity, uniqueness, and attention to detail." | Burst Games, Stake Exclusives, featured in New Releases |
| 2 | "Games that show considerable creativity or originality. While they may lack polish compared to more established studios, they still demonstrate strong development quality and attention to detail." | Promotional categories only if popularity drives it |
| 1 | "Games of lower polish that still meet publishing requirements." | Bottom of New Releases, no promotion |
| 0 | Below 1.0 | Not published |

**The 3-star line is a 2.50 average.** Three reviewers at 2.33 average 2.33 and
get 2 stars. It takes a 2.67 or a 3.00 in the mix.

---

## 2. Recorded — every review return we hold

| Game | Repo | Reviewer scores | Average | Stars |
|---|---|---|---|---|
| Graveyard Shift (round 1, 2026-07-11) | `graveyard-shift` | 2.33 / 2.67 / 2.33 | 2.44 | 2 |
| Graveyard Shift (re-rate, 2026-07-14) | `graveyard-shift` | not recorded | — | **3** |
| Into The Slot O' Verse | `SpaceOdyssey` | 2.33 / 1.67 / 1.33 | 1.78 | 2 |
| Mummy's Riches | `MummysRiches` | 1.67 / 2.33 / 2.00 | 2.00 | 2 |
| Tiki Taka Madness | `Tiki-Taka-Madness` | 2.33 / 2.00 / 2.00 | 2.11 | 2 |

Primary source for the Graveyard Shift rounds and the Mummy's Riches split:
`MummysRiches/docs/STAKE-REVIEWER-LESSONS.md`. Tiki Taka's findings:
`Tiki-Taka-Madness/docs/STAKE-RETEST-CHECKLIST-2026-08-21.md`.

Plain round-half-up reproduces every one of these. `npm test` fails if it stops
doing so.

**Two things follow, and they are the useful ones:**

1. **The studio's first-pass ceiling is 2.33.** No reviewer has ever given a
   Clawbyte game more than 2.33 on a first submission.
2. **The only 3-star came from a re-rate.** Graveyard Shift scored 2.44 → 2 stars,
   the studio worked the attached fix list, and the re-rate came back at 3. A
   2-star result is not the end of the conversation — it is the halfway point.

---

## 3. Measured — why each game scored what it did

Verified against the repositories at HEAD, not taken from their own documentation.

### Into The Slot O' Verse — 2.33 / 1.67 / 1.33

**Nine of eleven sound effects are the same file of digital silence.**

```
c0a19322779874889ea95389b4f037f3  public/sfx/anticipation.mp3   4044 bytes
c0a19322779874889ea95389b4f037f3  public/sfx/barrel_break.mp3   4044 bytes
c0a19322779874889ea95389b4f037f3  public/sfx/big_win.mp3        4044 bytes
c0a19322779874889ea95389b4f037f3  public/sfx/bonus_token.mp3    4044 bytes
c0a19322779874889ea95389b4f037f3  public/sfx/click.mp3          4044 bytes
c0a19322779874889ea95389b4f037f3  public/sfx/reel_stop.mp3      4044 bytes
c0a19322779874889ea95389b4f037f3  public/sfx/spin.mp3           4044 bytes
c0a19322779874889ea95389b4f037f3  public/sfx/tease_miss.mp3     4044 bytes
c0a19322779874889ea95389b4f037f3  public/sfx/win.mp3            4044 bytes
672f26e6ea13dd0fe0cd783b76918f05  public/sfx/meteor_shower.mp3 49382 bytes
926edd2dd61e21e8b4f0759d9c530198  public/sfx/portal_beam.mp3  113937 bytes
```

The game's own audit (`STAKE-AUDIT-2026-08-12.md`) called this the single largest
quality-ranking risk and predicted **"as-is I'd score 1.33"**. A real reviewer
scored exactly 1.33. Meanwhile the four interactive bonus worlds held another
reviewer at 2.33. That spread — 1.00 wide on the same build — is the clearest
demonstration in the catalogue that the axes are weighted differently by
different reviewers.

It is also the only game of the four that does **not** use the Stake `web-sdk` or
`math-sdk`, so it inherited none of the SDK-level compliance fixes.

### Mummy's Riches — 1.67 / 2.33 / 2.00

Both low scores are polish, and both are documented in
`docs/STAKE-REVIEWER-LESSONS.md` §1 round 6:

- **1.67, no comment left.** Diagnosed afterwards as scene warm-up landing on the
  main thread all at once: **7.7fps after PLAY, and a 3.7-second frozen frame**
  entering Super Free Spins at 6× CPU throttle. Steady-state gameplay held ~50fps,
  which is why the team never saw it.
- **2.33, one sentence: "some animations end abruptly."** One disease across eight
  sites — one-shot clips given display windows shorter than their authored length.

Mummy's Riches has the most mature enforcement tooling of the four (a `build:stake`
pipeline chaining `verify_pos_anchors`, `scan:banned`, `verify_maxwin_sync`,
`verify_royal_money`, `verify_stake_clean`) and 47 distinct audio files. It still
only made 2.00, because the two reviewers who mattered were feeling frame times,
not running checklists.

### Tiki Taka Madness — 2.33 / 2.00 / 2.00

The most conventional return: an itemised reviewer list, all compliance-shaped.
Bet amount read from cache instead of the latest `authenticate`; both scrollbars
shown at once in the replay window; restricted terminology ("payline", "payout")
in menus; decimal-place rules; a base-mode event stalling at "press the Spin
button". All 29 of its audio files are distinct.

### Graveyard Shift — 2.33 / 2.67 / 2.33, then 3 stars

Round 1 came back with **no itemised defect list — the score was the feedback**.
The studio's own read was that two things dragged it: roughly 35 assets
byte-identical to the web-sdk `lines` sample game, and the pop-out layout being
effectively unplayable (8 of 9 interactive controls sat 1–7 real pixels
off-viewport at 400×225). Its own pre-submission audit had also flagged
procedural Web Audio as "the single biggest 0-1 star risk".

The re-rate after working the fix list came back at 3 stars.

---

## 4. Measured — the pattern across all four

| | Graveyard | Slot O' Verse | Mummy's | Tiki Taka |
|---|---|---|---|---|
| Audio files | 16 | 15 | 49 | 29 |
| Distinct hashes | 4 | **7** | 47 | 29 |
| Most-duplicated cue | 5× (sample apps) | **9× (silence)** | 2× | 1× |
| Uses Stake web-sdk | yes | **no** | yes | yes |
| Best reviewer score | 2.67 | 2.33 | 2.33 | 2.33 |
| Worst reviewer score | 2.33 | **1.33** | 1.67 | 2.00 |

**Every sub-2.0 score in the catalogue came from polish.** Not one came from
maths. Not one came from a compliance blocker. Review effort should be
distributed accordingly, which is why the panel weights it accordingly.

---

## 5. Assumed — the three reviewer personas

Stake do not publish anything about how their three reviewers differ, and our
records do not show them specialising. The personas in
`.claude/agents/stake-reviewer-*.md` are a **construct**, justified as follows:

- The observed spreads are wide on identical builds — a full 1.00 between the
  best and worst reviewer on Slot O' Verse. Something differentiates them.
- The documented causes of our low scores cluster into exactly three groups:
  polish felt during play, itemised checklist findings, and creativity holding a
  score up despite the other two.
- Three personas covering those three failure modes reproduce every observed
  score multiset in the catalogue.

That is a defensible design for finding defects. It is **not** a claim that Stake
assigns lanes. Do not repeat it to Stake as if it were.

---

## 6. Assumed — the standards uplift

> "We must also have a standard increase for each game as Stake have increased
> difficulty to receive higher ratings." — Jake

Taken as given. There is no way to measure it from five returns whose averages
all sit between 1.78 and 2.44, and — unlike the first version of this document —
no rounding anomaly to point at either.

So it is a policy setting, expressed in the natural unit:

```ts
export const STANDARDS_DRIFT_NOTCHES = 1;   // tools/stake-review/score.ts
```

**One notch = 0.33 = the smallest move a real reviewer can make.** Each predicted
reviewer score is docked one step on Stake's own scale before the panel is
struck, costing 0.33 of a star overall. Override with `--drift=0` to see the raw
prediction, or a higher integer to model a harsher bar.

The agents are told explicitly not to apply this themselves — they score the build
as they find it and the aggregator takes the notch. Otherwise it gets
double-counted.

---

## 7. The correction

The first version of this system, built before the game repositories were
available, inferred from the fact that all twelve reviewer scores were exact
thirds that each reviewer must be averaging three whole-star sub-scores on a
**1–5 scale**. It then explained Graveyard Shift's 3 stars off a 2.44 average as
a "generous July rounding" and built a 0.5-star drift constant on top of it.

Reading the repositories corrected three things:

1. **The scale is 0–3, not 1–5**, and the thirds come from the scale itself —
   reviewers pick one of ten fixed values. There are no sub-scores.
2. **2.44 rounded to 2, exactly as it should.** Graveyard Shift's 3 stars came
   from a **re-rate after fixes**, not from a lenient round. There was no
   rounding anomaly to explain.
3. **Below 1.0 is not approved at all** — a cliff the 1–5 model had no concept of,
   and the single most important number in the system.

Jake's recollection of Graveyard Shift's split (2 / 2.33 / 3) differs from the
repo record (2.33 / 2.67 / 2.33), but both sum to 7.33 and both average 2.44, so
the star outcome is unaffected. The repo record is used here.

**The lesson worth keeping:** the arithmetic fitted the data perfectly and the
model was still wrong. Four data points will support more than one story. Go and
read the source.

---

## 8. Re-fitting on the next return

1. Add it to `HISTORY` in `tools/stake-review/score.ts` with its reviewer scores
   and a `source` citation.
2. Run `npm test`. The back-test fails if the model no longer reproduces every
   recorded return.
3. Compare the actual return against our panel's prediction for that build. If we
   scored it high, the agents' anchors are soft — tighten the anchor text, not the
   drift constant.
