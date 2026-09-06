# Vegan Spins — reviewer #1 (creativity-weighted)

SCORE: 1.67

## Why 1.67 and not 2.00

The originality is real and I can name it — three of the eight bet modes are a
different game entirely (a slingshot flight with a dig), reached through a door,
and the slot half carries four mechanics a player could describe to a friend —
so this is not a reskin and it clears the "considerable creativity" half of
Stake's 2-star wording on its own. It fails the other half, and fails it in
writing: the Settings tab of the shipped build tells the player *"This game has
no audio yet"*, and the RGS layer is imported by nothing, so the build cannot
authenticate, cannot settle a round, cannot render a second currency and cannot
enter replay — a game that announces its own missing half is not demonstrating
"strong development quality and attention to detail".

## Blockers

**1 · The game has no audio of any kind, and says so in its own UI.**
Zero audio files anywhere in the repository — `find . -type f \( -iname "*.mp3"
-o -iname "*.ogg" -o -iname "*.wav" -o -iname "*.m4a" -o -iname "*.aac" \)`
returns nothing; the only media are two video clips, `assets/slots/door_view_slot.webm`
and `door_view_flight.webm`. Zero playback code — `grep -rn
"AudioContext|new Audio(|howler|HTMLAudioElement" src/` returns nothing.
Instrumented at runtime across a full session (loader → intro → door → six base
spins → buy panel → forced duel, shot and eggs), the wrapped `AudioContext` and
`Audio` constructors recorded `{"ctx":0,"el":0}` and
`document.querySelectorAll('audio,video').length === 0` on the slot screen.
`src/game/sound.svelte.ts:6` states it plainly: *"nothing here plays anything"*.
Worst of all it is player-visible — `src/ui/MenuModal.svelte`, Settings tab,
renders **"This game has no audio yet — these settings are remembered, and apply
the day sound lands."** (captured at
`shots/m-settings.png`). Into The Slot O' Verse shipped *silent placeholder
files* and took a 1.33 from one reviewer; this ships no cues at all and prints
the fact on screen.

**2 · The RGS is not wired. The shipped game is a client-side demo.**
`src/stake/rgs.ts` is 516 lines and is imported by exactly two places: a *type*
import in `src/game/jurisdiction.svelte.ts:19` and a comment in
`src/SlotApp.svelte:218`. `SlotApp.svelte:213-218` says it outright — *"A DEMO
WALLET … nothing is wagered anywhere, no round is booked, and `$stake/rgs` is
where the real one arrives."* Launched with the full Stake contract
`?sessionID=abc123&rgs_url=rgs.example.com&lang=es&currency=EUR&device=desktop&social=true`,
the built preview issued **472 requests, every one to the local origin, and none
to any wallet / authenticate / play / end-round endpoint**; it booted in English,
in USD, on a $1,000 demo balance that resets on reload. `grep -rn "searchParams"
src/` returns only debug knobs (`dirt-pos`, `auto-flight`, `force`, `walk`,
`fall`, `wipe`, `ghost`, `duel`, `fx`, `shot`, `beat`) — nothing reads
`sessionID`, `rgs_url`, `currency`, `lang`, `social` or `replay`. The knock-ons
are all four of the checklist items a reviewer works first:
`setCurrency()` is never called (permanently USD, so **the game cannot load in a
second currency**), `setSocial()` is never called, `setLimits()` is never called
(so `noTurbo`/`noAutoplay`/`noSpacebar`/`noBuyFeature`/`minRoundMs` can never
become true), and `setReplayMode()` is never called (replay is unreachable).
Bet levels come from the hard-coded `BET_STEPS_DISPLAY` in
`src/game/config.ts:110` rather than from the authenticate response — corpus C1.
The maths pack itself is complete and correct: `git show FETCH_HEAD:index.json`
on the `stake-math` branch lists all eight modes at costs matching `config.ts`
exactly. Both halves exist; they have simply never been joined.

## Findings

**F1 · The social-casino wording layer is dead code and is not in the bundle.**
`src/game/social.svelte.ts:73-102` holds a properly review-hardened swap table
(`PAYLINES`→`LINES`, `PAYOUT`→`PRIZE`, `PAYTABLE`→`PRIZES`, `BET`→`PLAY`,
`BUY`→`GET`, phrases before words, casing preserved). Nothing calls it:
`grep -rn "socialLabel|betWord|buyWord|setSocial" src/` finds one consumer,
`money.svelte.ts:65`, reading `isSocial()` — which is permanently false.
`grep -l "PAYLINES" dist/assets/*.js` returns nothing and none of the phrase
swaps appear in `dist` at all; it is tree-shaken out. Meanwhile the shipped
English strings do carry the restricted words: the Paytable tab heading is
**"HARVEST PAYOUTS"** and the Rules tab reads "the 40 **paylines**" and
"40 fixed **paylines**" (`grep -o ".\{70\}payline.\{70\}" dist/assets/*.js`,
three rendered text nodes). Corpus C3 is these two exact words, raised against
Tiki Taka. This is the process lesson from the corpus in its purest form — a
trap documented, solved, and shipped anyway because nothing executed the check.

**F2 · 52.4% of winning boards pay nothing, and the rule is deliberately
undisclosed.** `WIN_FLOOR = 1.5` (`src/game/slots/paytable.ts`), applied by
default at `src/game/slots/evaluate.ts:73`. Measured on the game's own strips and
evaluator over 120,000 base spins:

| | |
|---|---|
| boards with at least one line win | 1 in 4.90 |
| boards that actually pay | **1 in 10.29** |
| winning boards struck to zero | **12,823 / 24,490 = 52.4%** |
| value removed | 0.0685× stake per spin |

`MenuModal.svelte:602-607` records the decision to take it out of the rules:
*"we dont need to tell the player that all slot wins are higher than 1.5x stake,
this doesnt need to be mentioned."* `grep -o "1\.5×[^\"]\{0,60\}" dist/assets/*.js`
returns nothing — the figure is nowhere in the shipped build. I watched it land:
a forced board showing wild + cauliflower + cauliflower on line 1, with a
`$2.00` egg wild sitting on the grid, paid **$0.00**
(`shots/e-eggs-a-board-of-wilds-2.png`). A reviewer who does not know the rule
writes that up as a payout bug, and the resulting paying hit rate of 1 in 10.29
sits outside the 1-in-3 to 1-in-8 band this studio's own rating system names.

**F3 · The signature mechanic is theatre over a coin flip.** The duel is the best
thing in the game to look at — the reel window becomes a split field, sunlit hen
below, storm-lit rival above, each holding a multiplier, and the winner's field
becomes the wild reel with him standing in it (`shots/e-expanding-wild-the-duel-3.png`
and `-5.png`). But `src/game/slots/expandingWild.ts:139-150` draws both halves
*independently from the same table* — {2:50, 3:30, 5:15, 10:4.94, 250:0.06} —
and `:27` states "the winner is a fair coin". So P(both sides identical) =
0.50²+0.30²+0.15²+0.0494²+0.0006² ≈ **0.365**, and a quarter of all duels are
2× against 2×. I drew one of those on my first forced trigger. The rules screen
concedes the point: *"the fight decides which of the two you get, never whether
the pair was worth having."* A player who sees it four or five times learns the
fight cannot matter, and the game's headline feature becomes an animation to sit
through.

**F4 · The theme stops at the reels.** The cabinet, the intro screen and the
symbol rigs are genuinely good — hand-drawn cartoon vegetables with tier-coded
plates (gold premium / silver high / bronze regular), a wooden log frame, a
farmer standing in the field with a shotgun, a carrot loading bar
(`shots/p-01-intro.png`, `shots/s-01-slot-entered.png`). Everything the player
*opens* is unretinted studio chrome: the Bonus Buy panel, the Felix launch panel
and all four Menu tabs are a charcoal dotted panel with magenta CTA buttons
dropped onto the sunlit farm (`shots/f-buypanel.png`, `fl-01-entry.png`,
`m-settings.png`), and the loading screen is a blue sci-fi hex grid with a cat
logo and no farm element at all (`shots/shot-01.png`). Verified missing against
`dist` and `assets` with `find dist assets -iname "<name>*"`: `logo_wide`,
`logo_stacked`, `loader_field`, `intro_card`, **`game_tile`** (the lobby tile —
a submission requirement), `slot_right_prop`, `reel_anticipation`,
`win_word_big`, `win_word_super`, `win_word_mega`, `win_word_epic`,
`win_word_max`, `win_cell_frame`, `maxwin_setpiece` — all absent. The screen
selling a 100× purchase shows three empty black rectangles with a green dotted
wireframe arc in each. My brief's own line for this is "a game that is themed on
the reels and generic everywhere else is a 1.67".

**F5 · Big wins are long, silent, and drawn in CSS.** `src/game/winBanner.ts:59-70`
holds SUPER 18s, MEGA 20s, EPIC 26s, MAX 32s. `:55-57` — *"`animation` and
`sound` are dropped rather than stubbed: we have neither the spine clips nor the
sound bus."* `:309` sets `BIG_TEMPO_FLOOR = 0.5`, so even on the FASTER turbo
tier a MAX WIN holds **16 seconds** and an EPIC 13, with no clip, no word art
and no sound. The file's own history records Marlow measuring "sixteen seconds of
a still picture" on a 234×. Corpus P4: a beautiful slow animation loses to a
plain fast one, and this one is neither.

**F6 · Debug rigs ship in the production bundle and are reachable by URL.**
`vite.config.ts:40` lists `wild-preview` as a build input; `dist/wild-preview/index.html`
exists and `curl` returns 200 from the built preview. `ForcePanel.svelte:46-54`
arms itself on *any* build carrying `?force` or `?force-event` — I drove the
entire feature set through it against `dist`, and the FORCE tab is visible on the
right edge of every screenshot I took with that flag
(`shots/x-01-forcepanel.png`). `FrameSizePanel.svelte:67` opens on
`?frame`/`?frame-size`. This is the same shape as Slot O' Verse's fake RGS
shipping in the production bundle.

**F7 · The two halves of the cabinet are two different products.** The same three
Felix modes are reachable from two pages with unrelated chrome and two
independent demo wallets: the cabinet's dark `FlightLaunchPanel`
(`shots/fl-01-entry.png`) and the standalone `/felixs-flight/` page, which has
its own logo, its own wooden panel and its own green bar
(`shots/j-00.png`), with `FlightApp.svelte:27` holding a second
`let balance = $state(STARTING_BALANCE)`. On that page the "PICK YOUR STAKE, THEN
YOUR LAUNCH" modal never dismisses — it sits over the slingshot while the round
is already in flight and the bar reads `IN FLIGHT` with the stake taken
(`shots/k-01.png`, `shots/j-03-f2.png`), leaving three simultaneous ways to
launch on screen at once.

**F8 · No localisation at all.** No locale files anywhere, no `translate()`, no
`?lang` read in `src/`. The game loads cleanly with `?lang=es` — in English. It
does not *break* on a bad lang (corpus C15 is not reproduced), but there is no
second language to check.

**F9 · Popout S lays out, but the reels do not get the space.** At 400×225 the
compact two-row bar is correctly selected by viewport rather than pointer type,
which closes the corpus's highest-transfer trap (`shots/pop-s-slot.png`). The
reel window is then roughly 130×70 px inside a 400×225 frame while the bar takes
about 45% of the height and the sky and field take most of the rest. The symbols
are not readable at that size.

**F10 · Documentation contradicts the build in several load-bearing places.**
Scored on the build, but a reviewer reads these: `README.md` still advertises a
`/field-day/` page and `src/game/farmers/fieldDaySim.ts` that were cut on
26 August (`vite.config.ts:30-33`); `docs/CODEBASE_OVERVIEW.md` describes a
space-western game; `src/game/config.ts:132` says Felix caps at 9,257× while
`felixFlight.ts:1905` sets `m.cap = GAME.wincapMult` and the rules table prints
50,000×; `theShot.ts:31` claims the shot is "not wired into `rtp.ts` or
`evaluate.ts`" while `resolveSpin.ts:110` and `featureReturn.ts:106` both apply
it.

## What the game gets right, and it is not nothing

I want this on the record because it is what keeps the score off the floor.
Answering the reskin question honestly: strip the theme and the slot is "5×4,
40 fixed lines, wild, scatter free spins, an expanding wild reel with a
multiplier, two antes and two buys" — hundreds of games. But three of the eight
bet modes are **not that sentence at all**, they are a slingshot launch-and-
collect flight with a dig at the end, sharing the wallet, the 96.50% and the
50,000× ceiling, entered through a "TWO WAYS IN — PICK A DOOR" screen
(`shots/p-02-base.png`). Alongside it the slot carries four things a player can
name: the duel, the shot (the farmer clears every instance of one crop off the
board and they come back as wild chickens — verified working, a forced
six-cauliflower board turns all six), the eggs (wilds carrying `2×` and `$2.00`
badges), and the mother lode. Per-mode price, RTP and max win are disclosed both
in the rules table and on every buy card, derived from the modules that own them
— corpus C6 handled better than most approved games. Turbo tiers are OFF /
FAST / FASTER. Every buy is arm-then-confirm with the price named. The build is
clean: `svelte-check` passes, `filename-law: 862 files in dist/, all lawful`,
zero page errors and zero failed requests across every session I ran, and 472
requests all to the local origin — no external fonts, no CDN, no analytics. None
of the banned title tokens appear. The maths pack is complete and its mode costs
match `config.ts` exactly.

## The one-notch lift

**Ship one real sound per player-visible event and delete the sentence that says
you have not.** Not a full mix — spin, reel stop, win, big win, the shot, the
egg, the duel's two shots and the launch, as real files behind the mixer that is
already built and already remembers its state. Silence is the single defect that
made me stop reading the build as a finished product and start reading it as a
prototype, and it is the one my two colleagues will also hear inside their first
minute. Fix it and this moves to 2.00 on my card.

## What I could not verify

- **Frame rate on hardware a reviewer owns.** This container has no GPU. The
  game's own profiler (`scripts/pw/profile-slot.mjs`) reports idle p50 350ms,
  100% of frames over 33ms, 13 long tasks worst 416ms against `dist`. But a CDP
  sampling profile over six seconds of idle attributes **99.5% of the time to
  `(program)`** — SwiftShader software rasterisation — with JavaScript under 1%,
  and a plain full-screen WebGL clear in the same browser only manages 28.7fps
  against a 60fps rAF baseline. So I cannot separate the game's cost from the
  container's and I decline to report a frame rate. What I can state is
  hardware-independent: idle frame cost is **identical at 400×225 and 1500×900
  (450ms p50 both)** because the canvases stay 1920×1080 + 1920×1080 + 1980×700
  regardless of viewport. Someone needs to run the throttled probe on real
  hardware; Mummy's Riches took a 1.67 with no comment attached on exactly this
  axis.
- **The flight in motion.** I reached the sling, armed all three tiers, saw the
  arm/confirm flow and the world art, but at ~2fps I could not film Felix
  actually crossing the farm, striking coins, taking a toadstool, or drilling.
  The dig, the frenzy, the shield and the mother lode are all unwatched.
- **The free-spins round end to end, and the win celebration.** I forced the
  3-scatter trigger but could not sit through eight spins at this frame rate.
  No BIG/SUPER/MEGA/EPIC/MAX banner was seen on screen; I read the ladder in
  `winBanner.ts` instead. `docs/VISUAL-AUDIT.md` claims "There is no win
  celebration in this game. At all." — `WinCelebration.svelte` and
  `win_banner.webp` both exist now, so the doc is stale, but I did not see one
  fire and a reviewer who does not see one will score it as absent.
- **Autoplay.** Present in `autoplay.ts` and `AutoplayPanel.svelte`; not driven.
- **Whether a real reviewer's session would even start.** With no
  `/wallet/authenticate` call there is no code path I could exercise for
  balance, bet levels, currency, social or jurisdiction, so every one of those
  checklist items is untestable rather than merely failing.
