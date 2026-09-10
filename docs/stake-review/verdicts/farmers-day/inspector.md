# Vegan Spins — reviewer #3 (inspector)

SCORE: 1.00

**Commit and artefact.** `StuidoCLAW/farmers-day` at `a1d4440` ("JOBS: put the merged
entry back in order", 2026-09-10). Reviewed from a private extraction at
`/tmp/claude-0/-home-user-HUO/8a8b4e92-4a7e-5384-aa95-b96521497d2e/scratchpad/wt/inspector`,
built there with `npm run build` (exit 0; `filename-law: 889 files in dist/, all
lawful`). Every figure below is measured against that build. Dist tree md5
`fc5a2f7d3d53b16c605d0ffec6b96fd3`; 43 JS chunks, no duplicate stems, one
consistent build. Served from a sub-path
(`http://127.0.0.1:39117/sub/path/vegan-spins/`) on my own port after finding
8731 already in use by another process. I did not build or serve from
`/home/user/farmers-day`.

---

## 1. Why 1.00 and not 1.33

The build has no Remote Game Server integration at all — it deals its own
outcomes from a client-side RNG and pays from a demo wallet, so every wallet,
session, resume and replay requirement is not failed but absent, and the two
currencies I was told to test cannot be tested because the build will not run in
them. That is both halves of my own bottom band in one artefact, and the rules
screen compounds it by voiding half of all winning combinations under a 1.5×
floor that the studio deliberately removed from the disclosure.

---

## 2. Blockers

### B1 — No RGS. The game spins on a client-side RNG and pays from a demo wallet.

*Checklist:* items 20–37 (Bets and wallet, Session and resume) and 73–77
(Replay), all unreachable. Protocol Stage 6, first line.

**Steps.** Build `dist/`, serve it, open it, press SPIN twenty-two times.
**Expected.** `/wallet/authenticate` on launch, `/wallet/play` per round,
`/wallet/end-round` to settle.
**Actual.** Balance moved $1,000.00 → $1,018.50 with zero network traffic beyond
static assets (242 requests, every one an asset URL on my own origin).

Evidence:

```
$ for s in wallet/authenticate wallet/play wallet/end-round rgs_url sessionID \
           bet/replay payoutMultiplier; do
    echo "$s -> $(grep -rl --binary-files=text -- "$s" dist | wc -l)"; done
wallet/authenticate -> 0
wallet/play         -> 0
wallet/end-round    -> 0
rgs_url             -> 0
sessionID           -> 0
bet/replay          -> 0
payoutMultiplier    -> 0
```

`src/stake/rgs.ts` is 517 lines of a careful, correct live client —
`createRgsClient`, `readStakeLaunch`, `readReplayLaunch`, `fetchReplayBook` — and
nothing in `src/` imports any of it. It is tree-shaken out of the bundle
entirely. What ships instead:

- `src/SlotApp.svelte:188` — `spin(source)`, outcomes drawn locally.
- `src/SlotApp.svelte:225` — `let balance = $state(untrack(() => startingBalance));`
  under the comment at `:217` reading *"A DEMO WALLET, and the distinction
  matters… nothing is wagered anywhere, no round is booked, and `$stake/rgs` is
  where the real one arrives."*
- `src/SlotApp.svelte:1709` — `createDemoFlightRgs({ getBalance, setBalance })`
  for the bonus world.
- `src/SlotApp.svelte:1698` — the studio's own note: *"Swapping this one line for
  `createRgsClient(launch)` is the whole of what Gate 4 asks of the flight."*

There is also **no replay implementation of any kind**: zero uses of
`readReplayLaunch`, `fetchReplayBook` or any replay surface anywhere in `src/`.
Items 73–77 have nothing to test.

### B2 — Currency, language and social mode are unreachable: `setCurrency()` and `setSocial()` have no call sites.

*Checklist:* 2–19 and 38–40.

```
$ grep -rn "setCurrency\|setSocial" src --include='*.ts' --include='*.svelte' \
    | grep -v "money.svelte.ts\|social.svelte.ts"
(no output)
```

`src/game/money.svelte.ts:79` `setCurrency` and `src/game/social.svelte.ts:26`
`setSocial` are called by nothing. The currency is fixed at the module default
`"USD"` (`money.svelte.ts:56`).

**Steps.** Open with `?social=true`. **Expected.** No restricted word on any
surface. **Actual.** The intro renders `MAX WIN 50,000× STAKE`, "Pay 2.4× your
stake a spin" and "Buy a launch whenever you like" unchanged. `socialLabel` is
not present in `dist/` at all (`grep -rl socialLabel dist` → 0 files): the
124-line scrub table in `social.svelte.ts` ships nowhere.

**Steps.** Open with `?lang=de`. **Expected.** German. **Actual.** English —
there is no i18n system in the codebase. `?lang=zzinvalid` loads cleanly in
English with zero console errors, so item 38 passes trivially and item 39 fails
outright.

**And the part I cannot get past.** I was instructed to test KWD (3 minor units)
and JPY (0). **There is no path in this build to run it in either.** Items 16–19
are not "failed", they are unprovable against the artefact — which under my own
rules is the same as a blocker.

### B3 — The disclaimer carries 1 of Stake's 7 required points, and contradicts the one about payout source.

*Checklist:* 56. `graveyard-shift/docs/stake-engine/approval-disclaimer.svx:18` —
*"Games submitted without a disclaimer in the rules/info popup will not pass
approval."*

The whole of the shipped ABOUT tab's legal copy (`MenuModal.svelte:1237-1243`,
read out of the running build):

> **FAIR PLAY** — Every spin's outcome is drawn from the game's random source at
> the moment SPIN is pressed. The animation, turbo and stop only present a result
> that already exists; nothing on screen can change it.
> Malfunction voids all pays and plays.

| Required point | Present |
|---|---|
| Malfunction clause | yes |
| Internet requirement | no |
| Disconnection recovery | no |
| Expected return over many plays | no |
| Display accuracy | no |
| Payout source is the RGS, not browser events | **states the opposite** |
| Copyright / trademark | no |

The sixth row is the one that matters. Stake requires "Winnings are settled
according to the amount received from the Remote Game Server and not from events
within the web browser." This game tells the player the outcome comes from the
browser — and it is telling the truth, which is B1 restated in the player's own
words.

---

## 3. Findings

Ranked by what they cost me.

### F1 — An undisclosed 1.5× win floor voids advertised paytable wins. 51% of winning spins pay nothing.

*Checklist:* 49 (per-symbol payouts match the maths), 53 (every visible mechanic
in the rules), 99 (no payout gaps).

`src/game/slots/paytable.ts:629` — `export const WIN_FLOOR = 1.5;`
`src/game/slots/evaluate.ts:257` —

```ts
const total = totalBetUnits > 0 && raw < settled.floor * totalBetUnits ? 0 : raw;
```

Any round totalling under 1.5× the **total stake** pays zero, and `:258` then
suppresses the winning lines so the player never sees the cells that matched. At
a $1.00 stake across 40 lines the line bet is $0.025, so:

| Symbol group | 3-of-a-kind | 4-of-a-kind |
|---|---|---|
| chilli, pepper | $1.50 — pays | $5.00 — pays |
| aubergine, avocado, tomato | **$0.50 — voided** | $1.00 — voided |
| broccoli, radish, carrot | **$0.25 — voided** | **$0.50 — voided** |

Driven through the shipped evaluator on a board whose only significant hit is the
advertised combination:

```
carrot x3: paytable $0.25 | evaluator with floor off $0.75 | AS SHIPPED $0.00  <-- VOIDED
carrot x4: paytable $0.50 | evaluator with floor off $1.00 | AS SHIPPED $0.00  <-- VOIDED
carrot x5: paytable $2.50 | evaluator with floor off $3.00 | AS SHIPPED $3.00
```

The shipped PAYTABLE tab prints "REGULAR — 4x: $0.50, 3x: $0.25" at a $1.00
stake. Those two rows are amounts the game will not pay.

Scale, from my own run of `npm run sim` at this commit (2,000,000 base spins,
seed 20260828): line-win hit rate **20.3697%**, paid hit rate **9.9246%**.
**51.3% of spins that produce a winning line are settled at zero.**

It is not in the rules, and that is a decision rather than an oversight —
`src/ui/MenuModal.svelte:684-690`:

> `<!-- NO "MINIMUM WIN" TILE. Orrin, 2026-09-06: *"we dont need to tell the`
> `player that all slot wins are higher than 1.5x stake, this doesnt need to be`
> `mentioned."* -->`

This is the finding that most reliably drops my score, because after it every
other number I was shown is a claim rather than a fact.

### F2 — Probability and hit-rate figures throughout player copy.

*Checklist:* 57 — "Zero hit-rate / chance / probability numbers in player copy."
Trap T12's inverse rule. Read out of the running build:

1. ABOUT — "Free spins lands 3 or more about **1 spin in 451**".
2. ABOUT — "All 5 starts SUPER — **once in 1,048,576 spins**".
3. ABOUT — "A free-spins round is worth **about 94.6× your stake**; a super round about 241×".
4. RULES, Bonus Enhancer — "free spins arrive about **1 in 4 spins** instead of **1 in 451**".
5. RULES, Feature Enhancer — "free spins land **3× as often**".
6. RULES, Felix's Flight — "it drills on **5.3% of rounds**" / "**90% of rounds**".
7. Intro card — "The rival goes from about **one spin in thirty to one in ten**".
8. Launch panel cards — "**DIGS 5% OF ROUNDS**", "**DIGS 90% OF ROUNDS**".

### F3 — The Settings tab tells the player the game has no audio. It has audio.

*Checklist:* 55, and evidence rule 1 in reverse — the product contradicting the
product. `src/ui/MenuModal.svelte:1206`, unconditional, present in
`dist/assets/slotapp-jgqxp9m2.js`:

> "This game has no audio yet — these settings are remembered, and apply the day
> sound lands."

Measured by instrumenting `AudioContext` in the built game: 13 buffers decoded
(0.313s–7.784s), **37 buffer sources started across six spins**, one `<audio>`
element playing the music bed. Peak amplitudes 0.5008 (reel stop) and 0.1773
(spin press / wreath) — nothing is silence, and no two of the 13 SFX share an md5.
The audio works. The rules screen says it does not.

### F4 — The entire bonus world and every feature scene are silent.

*Checklist:* Protocol Stage 1, cue-to-event map. Zero `playSfx` / `scheduleSfx` /
`startLoop` / `new Audio(` in **any** of `FelixFlight.svelte`, `DuelScene.svelte`,
`ShotScene.svelte`, `EggFx.svelte`, `TractorWipe.svelte`, `FsFrame.svelte`,
`FreeSpinTracker.svelte`, `AubergineFall.svelte`, `BuyPanel.svelte`,
`RoundGate.svelte`.

Covered: spin press, five reel stops, a five-rung wreath ladder, anticipation,
UI click, coin pour, coin shower, two win rollups, one music loop.
**Not covered:** free-spins entry, free-spins exit, retrigger, the expanding-wild
duel, the shot, the eggs, the tractor wipe, the buy confirm, and the whole of
Felix's Flight — sky, drill, chests, mother lode. A player who buys a 100× launch
hears one looping farm tune and nothing else. That is a large, expensive, well
animated bonus world with no sound design in it at all.

### F5 — Dev tooling ships in the production build.

*Checklist:* 88 — "Dev hooks, debug routes, mock RGS and preview payloads absent
from the built bundle (grep by name)."

**Steps.** Serve `dist/` and open `…/index.html?force-event`.
**Actual.** A FORCE tab appears; opening it lists 21 forced outcomes — "3 → 8
spins", "5 → 8 SUPER spins", "Expanding Wild — the duel", "Eggs — a board of
wilds". Gate at `src/ui/ForcePanel.svelte:49-56` (`q.has("force") ||
q.has("force-event")`), and `src/SlotApp.svelte:2762` mounts it unconditionally.
Verified against the built artefact, not the dev server.

Also live from `src/main.ts:70-79`: `?build-ew`, `?build-egg`, `?build-fs`,
`?type` mount rig-builder pages. And `dist/impact-preview/index.html`,
`dist/wild-preview/index.html` and `dist/felixs-flight/index.html` ship as
routes.

### F6 — Felix's Flight launch prices are invisible at 1280×720.

*Checklist:* 51 — "Description and cost for every mode."

**Steps.** At 1280×720, press the paw tile, press ENTER on the Felix's Flight
card. **Expected.** Each launch tier shows its price. **Actual.** Three "PRICE"
labels with no value under them.

Cause, measured: `.fl__body` carries `overflow: auto` and its rect is
(225, 109, 830×461) — bottom edge **y = 570**. The three price nodes sit at
**y = 571–601**, one pixel below the fold, with the bet bar painted over them
(`document.elementFromPoint(918, 586)` → `DIV.fl__bet`). Across viewports:

| Viewport | Body bottom | Price rows | Result |
|---|---|---|---|
| 1920×1080 | 801 | 699–729 | ok |
| 1366×768 | 616 | 572–602 | ok |
| 1280×800 | 647 | 573–603 | ok |
| **1280×720** | **570** | **571–601** | **clipped** |

1280×720 is a mainstream laptop size. The confirm line ("Press again to take a
$100.00 launch") does state the cost, so no money moves wrongly — but the panel
where the player chooses a tier does not show what any tier costs.

### F7 — The displayed RTP is a config label, not the pack.

*Checklist:* 101. The rules table, the paytable fine print and every buy card
read **96.50%** for all eight modes, sourced from `pct(GAME.targetRtp[0])`
(`MenuModal.svelte:529`, `:556`, `:567`, `:573`). Running `npm run sim` at this
commit prints the engine's own closed-form figure:

```
EXACT, for the measured figures to be checked against:
  TOTAL        96.3984%
```

0.10 percentage points, and the team knows — `src/ui/rtpDisclosure.test.ts:20-24`
records the game once shipping "96.50% in RULES, 96.40% in ABOUT". The fix made
them agree on the label rather than on the pack.

### F8 — Spacebar is not bound to bet.

*Checklist:* 41. **Steps.** Click a neutral area of the canvas, press Space.
**Expected.** A spin. **Actual.** Balance unchanged at $1,000.00 after six
seconds. Items 42 and 43 pass only because the key does nothing anywhere.

### F9 — No UI guide, and the rules name a button that does not exist by that name.

*Checklist:* 54, and reviewer item 6.5 from the Mummy's round. The menu has four
tabs — RULES, PAYTABLE, SETTINGS, ABOUT — and no controls section
(`MenuModal.svelte` `<h2>` list: How to play, Expanding Wilds, Free Spins,
Feature Enhancer, Bonus Enhancer, Buying a round, Felix's Flight, Turbo and stop,
The 40 paylines, Harvest payouts, Spin speed, Sound, The numbers, Fair play).

The rules say *"The BUY button on the control bar starts either round"*. There is
no button labelled BUY: the control is an unlabelled arch carrying the studio paw
(`ControlBar.svelte:271-274`, `barLayout.ts:117` "BUY tile outboard left").

### F10 — Refresh mid-spin loses the round and returns to the intro.

*Checklist:* 32, 33, 35. **Steps.** Press SPIN, reload 900ms later.
**Expected.** No dialog, correct resume, bet preserved. **Actual.** No dialog —
zero `beforeunload` handlers in the codebase, which is item 34 clean — but the
game returns to the intro screen with the demo wallet reset. There is no round to
resume because no round was ever booked. Consequent on B1.

### F11 — Base-game non-zero hit rate is 1 in 10.1.

*Checklist:* 98 — "around 1-in-3 to 1-in-8 base; over 1-in-20 is a reject risk."
My run: 9.9246% (1 in 10.1). Outside the guidance band, inside the reject line.
It is the win floor doing it: 20.37% of spins land a winning line and half of
those are struck out.

### F12 — Minor.

- `console.log` × 6 and `console.warn` × 17 in production chunks (item 63).
- `assets/audio/reel_stop_thud.mp3` is byte-identical (md5
  `c15f84267fb73a5143d250959df758a5`) to
  `/home/user/tiki-taka-madness/sound_effects/REEL STOP THUD - Dull, Dry Thump Hit 02    [004868].mp3`.
  Studio reuse, not a web-sdk sample; a hygiene note, not an approval breach.
- A source folder named `slots assets` sits at the repo root. Not shipped —
  `filename-law` only walks `dist/` — but it is one rename away from being a
  CDN 403 if anything ever globs it.

---

## 4. What passed, and it is a real list

I do not want the length of section 3 to bury this. Measured against the built
artefact:

- **Sub-path serve, full click-through: zero 4xx/5xx**, zero uncaught exceptions
  from the game's own chunks, across intro, doors, base game, menu, all four
  tabs, buy panel, launch panel, autoplay panel, free spins and the duel.
- **Request count plateaus with cache disabled.** Parked on the intro: 217
  requests in the first 60s window, then delta 0, 0, 0 across three more. Zero
  URLs fetched more than once. Item 58 clean, and T9 with it.
- **Zero external origins.** The only absolute URLs in the bundle are framework
  error strings (svelte.dev, w3.org, pixijs.com). No fonts, no CDN, no analytics.
- **Filename law clean.** 0 filenames with spaces, 0 with capitals, across 889
  files.
- **Zero assets byte-identical to a web-sdk sample game.** One hash matched
  across 826 dist assets and 2,401 SDK assets, and it is the studio's own Catnip
  logo.
- **Popout S is a genuine compact layout.** At 400×225 the bar re-stacks into two
  rows and every control sits inside the viewport; selection is pure geometry
  (`barPortrait.ts:219 useCompactBar(fitScale, vw, vh)`), no `pointer:coarse`
  anywhere near it. This is the trap that caused a previous rejection and it is
  closed properly.
- **The page never scrolls.** `scrollHeight === clientHeight` and `scrollY`
  pinned at 0 at 400×225, 480×360, 390×844, 834×1194 and 1280×720, including with
  the menu open.
- **Per-mode table present** — eight rows of mode / price / RTP / max win, plus a
  MAX WIN 50,000× on every buy card. Item 47 and the C6 finding both closed.
- **Confirmations.** Autoplay has a full panel with spin count and stop
  conditions before START; the 250× Super buy turns the button into "PAY $250.00"
  with "Press again to pay $250.00 and start Super Free Spins. Escape cancels."
  Items 44 and 45 clean.
- **Max win reachable.** My sim hit the 50,000× cap 20 times in 200,000
  three-wreath rounds; rounds land 1 in 451, so roughly 1 in 4.5M spins. Well
  inside the 1-in-20,000,000 requirement.
- **1,131 tests pass across 70 files** (`npm test`, 558s, exit 0).
- **No emoji anywhere in the bundle.**
- **No duplicate audio hashes and no silence** — the failure that cost Slot O'
  Verse a 1.33 is not repeated here.

---

## 5. Playing it, and what it is

**A session.** Twenty-two spins at $1.00, default speed, about 4.6s a cycle. The
board is handsome and the farmer at the left has real presence. It is also very
quiet: a press, five thuds, a music bed. Nothing anticipates, nothing teases, and
with the 1.5× floor swallowing half the winning boards there are long runs where
symbols visibly line up and the game says nothing at all. By the twentieth spin I
was waiting for it to end rather than wanting another. The free-spins round is a
different and better game — gold frame, dusk sky, a hanging wooden spin counter,
and the duel is a genuine beat with the rival standing in a darkened reel holding
a multiplier.

**Creativity.** Strip the theme and the sentence is: *a 40-line slot with a
wild-reel free-spins round, sold alongside a physics side-game.* The slot half of
that is unremarkable. The other half is not — Felix's Flight is a slingshot
launched by dragging, a ladder of coins that climbs by scene, a drill through six
bands of earth with chests and fossils and a mother lode at the bottom, and it
shares the cabinet, the wallet and the menu with the reels. The mechanics are
named and a player could describe them to a friend: Feature Enhancer, Bonus
Enhancer, the duel, the mother lode. The identity holds on every surface I opened
— board, bar, rules, paytable, buy panel, loading screen. The title is not
confusable and carries no banned token. This is the axis Clawbyte scores best on
and it scores well here; it is why my creativity axis is 2.33 against a
compliance axis of 0.33.

**Motion.** The dusk transition, the tractor wipe, the gold frame and the duel
all read as authored beats rather than defaults, and the free-spins gate waits
for the player rather than a timer. I could not measure clip windows
frame-accurately (see section 7), so I make no claim about abruptness in either
direction.

---

## 6. What I would tell the studio

**One change: wire the RGS you have already written.** Replace the demo wallet in
`SlotApp.svelte` with `createRgsClient(readStakeLaunch())`, and drive
`setCurrency()` and `setSocial()` off that authenticate response. The client in
`src/stake/rgs.ts` is better than most shipped ones — bounded retry, `play` opted
out of resend, an authenticate probe for the ambiguous timeout, both jurisdiction
field placements, bet levels clamped to `minBet`/`maxBet`. It is finished. It is
just not plugged in. That one wire turns a demo into a game, makes the KWD/JPY
decimal rules testable, arms the 124-line social scrub that currently ships
nowhere, and gives replay something to replay. Nothing else on my list moves my
score as far.

---

## 7. What I could not verify

- **Frame rate and worst-frame duration.** No GPU; Chromium on SwiftShader. The
  whole cabinet measured 2–6fps at every phase including idle, and the
  **unthrottled run was slower than the 4×-CPU-throttled one** in four of seven
  phases — proof the numbers are the software rasteriser and container
  contention, not the game. I quote no fps figure. Performance at phase
  transitions is **unproven**, and given P2 cost this studio a 1.67 with no
  comment attached, it needs a real GPU pass before submission. What I can
  defend, GPU-independent: 43MB and 889 files in the artefact, 217 requests
  before playable, ~13.4s from navigation to a usable intro on this container.
- **Animation clip windows against authored lengths (Stage 4, P3).** Needs
  frame-accurate capture; at 2–6fps I cannot tell a snap from a dropped frame.
- **KWD, JPY and any non-USD currency (items 16–19).** No path exists in the
  build. Would have needed `setCurrency` wired to a launch parameter or an
  authenticate response.
- **Social mode on any surface (items 2–15).** The scrub is not in the bundle.
  Would have needed `setSocial` wired.
- **Replay in any form (items 73–77).** No implementation exists.
- **Bet levels against real RGS ladders (item 29), live tile, Provably Fair,
  older Android and iOS hardware (items 104–111).** Platform-side, not testable
  in a sandbox.
- **Safari ≤17 containing-block anchors (item 112, T21).** I did not run a
  position-anchor sweep; the game is largely Pixi-drawn, but `MenuModal`,
  `BuyPanel`, `FlightLaunchPanel` and `RoundGate` are DOM and F6 shows the DOM
  layout has fold problems. Worth a `verify_pos_anchors`-style pass.
- **A natural free-spins trigger.** I reached the feature through `?force-event`
  and say so; 22 natural spins produced none, which is consistent with the
  measured 1-in-451.
