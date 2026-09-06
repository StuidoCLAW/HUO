# What actually loses stars at Stake

Every entry is a real finding from a real Stake reviewer or tester against a
Clawbyte game, with the root cause we eventually found. Nothing here is
hypothetical. Sources are the sibling repos:

- `StuidoCLAW/graveyard-shift` — `AUDIT.md`, `OVERNIGHT_AUDIT.md`, `docs/stake-engine/`
- `StuidoCLAW/MummysRiches` — `docs/STAKE-REVIEWER-LESSONS.md` (the master record: 7 rounds of reviewer contact, 21 transferable traps, a 112-point checklist)
- `StuidoCLAW/Tiki-Taka-Madness` — `docs/STAKE-RETEST-CHECKLIST-2026-08-21.md`
- `StuidoCLAW/SpaceOdyssey` — `STAKE-AUDIT-2026-08-12.md`, `GAME_AUDIT.md`

**Read `MummysRiches/docs/STAKE-REVIEWER-LESSONS.md` in full before reviewing
anything.** This file is a summary of it, not a replacement.

---

## The one-line summary

> Every sub-2.0 score in the catalogue came from **polish**, not from maths and
> not from compliance. Silence and frame rate cost us more stars than every
> checklist item combined.

---

## Polish — the axis that has actually cost us stars

### P1 · Silent or placeholder audio (cost: 1.33 from one reviewer)

Into The Slot O' Verse shipped with **nine of eleven SFX being the same
4,044-byte file of digital silence** — `spin`, `reel_stop`, `click`, `win`,
`big_win`, `anticipation`, `tease_miss`, `bonus_token`, `barrel_break`, all
md5 `c0a19322779874889ea95389b4f037f3`, decoded peak amplitude 0. Still true at
HEAD today. Only `meteor_shower` and `portal_beam` are real.

The internal pre-submission audit predicted "1.33, and I wouldn't be certain my
colleagues stay above 1.0". A real reviewer scored exactly **1.33**.

> "Three reviewers will each play this for ten minutes with sound on, and every
> one will hear a game that isn't finished."

**The check.** Hash every audio file. Identical hashes across differently-named
cues is placeholder audio. Decode peak amplitude: zero is silence. Then map every
player-visible event to the cue that fires for it and list the ones with nothing.
Graveyard Shift was flagged for the same axis — procedural Web Audio was called
"the single biggest 0-1 star risk" in its own audit.

### P2 · Frame rate on hardware the reviewer owns (cost: 1.67 from one reviewer)

Mummy's Riches' reviewer #1 scored 1.67 and **left no comment at all**. Diagnosed
only after Jake felt it on an old laptop: scene warm-up (rig parses plus texture
decodes) all landing on the main thread at once — **7.7fps after PLAY, and a 3.7
second frozen frame** entering Super Free Spins at 6× CPU throttle. Gameplay
itself held ~50fps, which is why nobody caught it.

**The check.** Run a CPU-throttled probe (`tools/_perf_probe.mjs THROTTLE=6` in
Mummy's Riches is the worked example) across every phase transition, not just
steady-state play. Entry phases must hold ~30fps with no multi-second worst
frame. A score with no comment attached is usually this.

### P3 · Animations that end abruptly (cost: one reviewer's 2.33 ceiling)

"Some animations end abruptly" — one sentence, one reviewer, Mummy's Riches. One
disease across eight sites: one-shot clips given display windows shorter than
their authored length (a flat 1000ms hold against 1200ms clips), rigs that mark
nothing `looping="false"` so ended one-shots restarted inside their settle pads,
and every return-to-idle being a one-frame pose cut.

**The check.** For every one-shot: window ≥ clip length, or playback speed derived
from the window. Film the beats and diff frames — a snap is one isolated delta
spike, a blend is a tail.

### P4 · Speed — beats that gate an outcome

Streamer feedback after Graveyard Shift went live: the art was excellent and the
game stood out, but the character beats gating a guaranteed win took too long.
Stake players value speed above all. Every cosmetic beat that gates an outcome
must tier on turbo (off = full beat, single = snappy, double = instant).

> A beautiful slow animation loses to a plain fast one.

Commercial, not an approval item — but it is the difference between approved and
earning.

---

## Compliance — itemised findings a reviewer writes up

Condensed from the 112-point checklist in `STAKE-REVIEWER-LESSONS.md` §3. These
are the ones that have actually been raised against us.

| # | Finding | Game |
|---|---|---|
| C1 | Bet amount taken from cached data instead of the latest `authenticate` response | Tiki Taka |
| C2 | Replay window showed both scrollbars at once in Popout S | Tiki Taka |
| C3 | Restricted terminology in menus — "payline", "payout" | Tiki Taka |
| C4 | Balance/Bet must be exactly 2dp; win values must show exact value up to 4dp | Tiki Taka, Mummy's |
| C5 | A base-mode event stalled at "press the Spin button" | Tiki Taka |
| C6 | Max win advertised game-wide (50,000×) when the buy mode caps at 5,000× — each mode needs its own RTP and max win | Mummy's |
| C7 | "Nothing is **staked**" — restricted word in the replay window; the scrub regex missed the `-ed` inflection | Mummy's |
| C8 | Win presentation showed $147.69 for a round settled at $147.70 — money must never round | Mummy's |
| C9 | Replay in Spanish rendered English — a local `tx()` helper skipped `translate()` | Mummy's |
| C10 | Paytable images overlapped the Game Info on iOS 17 — `position:absolute` anchored only by a `filter` containing block (Safari ≤17 gap) | Mummy's |
| C11 | "The game is sending a high number of invalid requests" — per-frame `<img>` src swaps with cache disabled, plus `ERR_VAL` rejections | Graveyard |
| C12 | Max bet set the stake to the player's exact balance — bet amounts must come only from RGS levels; snap DOWN | Graveyard |
| C13 | A `beforeunload` popup on mid-round refresh — refresh must be freely allowed | Graveyard |
| C14 | Bets possible in Replay Mode via the Space hotkey | Graveyard |
| C15 | Invalid `?lang` broke the load — must fall back to English and still load | Graveyard |
| C16 | An extra-spin feature fired that was not in the rules | Graveyard |
| C17 | Reviewer instruction: remove Responsible Gaming and Age Restriction from the Disclaimer tab; no links anywhere in the game | Mummy's |

### The traps with the highest transfer risk to a new game

1. **Social signal** — the swap must key off `config.jurisdiction.socialCasino`, not just `?social=true`. Keying off the URL parameter alone is dead in production while testing green locally.
2. **Scrub morphology** — `\bpay\b` does not match `paying`, `payline`, `paytable`. Scan the **scrubbed output**, not the source.
3. **Filename law** — Stake's CDN silently 403s spaces and capitals, including inside baked manifests, atlas `image` refs, mobile mirror trees and whole folders.
4. **Popout S (400×225)** — select the compact layout by **viewport size, not `pointer:coarse`**. Keying off pointer type is the literal root cause of a previous "really hard to play" rejection.
5. **Sample assets** — anything byte-identical to a web-sdk sample game will not be approved. Hash them.
6. **Static files only** — no external origins at all. No Google Fonts, no CDN, no analytics.

---

## Creativity — where we have actually done well

This is the axis Clawbyte scores best on, and it is worth knowing why so it is
not traded away.

- Into The Slot O' Verse held a **2.33 from one reviewer despite shipping in
  silence**, on the strength of four interactive bonus worlds. The internal read:
  *"four interactive bonus worlds is genuinely novel on this platform, 2-star
  insurance that flirts with the 3-star 'exceptional' language."*
- Graveyard Shift's grave-pick bonus and zombie-chase background were rated
  distinctive in its own audit and it is the only game to reach 3 stars.

Stake's 3-star bar is *"exceptional creativity, uniqueness, and attention to
detail"*. We have repeatedly supplied the creativity and lost the stars on the
attention to detail.

---

## Maths — never yet the reason for a low score

Worth stating plainly so review effort goes where the evidence points. No Stake
reviewer has scored a Clawbyte game down on maths. The constraints still bind:

- RTP 90–98%, all modes within 0.5% of each other
- Advertised max win achievable at 1-in-20,000,000 or better
- Non-zero hit rate around 1-in-3 to 1-in-8 for base; over 1-in-20 is a reject risk
- No payout gaps between small wins and the maximum

The one maths-shaped risk actually recorded is a *perception* problem: Slot O'
Verse's Super Free Spins max win was reachable on roughly the 22nd buy at four
times cost, and the internal read was *"I'd write that up as a math error"* — a
reviewer hitting your ceiling during a ten-minute test reads as broken even when
the model is right.

---

## Process lessons that changed outcomes

- **Ship for review when a week of play finds nothing.** Mummy's first upload went
  in while the bug-discovery rate was still high, and reviewers scored the
  unfinished build.
- **A trap without a failing build check is not closed.** The restricted-word trap
  was documented in the lessons file and shipped anyway, because the check it
  described was executed by nothing.
- **Run every check against the uploaded zip, not the dev build.** Selecting the
  wrong version in the dashboard burned the studio three times.
- **A 2-star is not the end of the conversation.** Graveyard Shift's 3 stars came
  from a **re-rate after working the attached fix list** — the only 3-star result
  in the catalogue, and it was a second cycle.
