# Vegan Spins / Field Day — reviewer #3 (inspector)

**Target:** `/home/user/farmers-day`, StuidoCLAW/Farmers-Day @ `53826d5`
**Date:** 2026-09-06
**Protocol:** all ten stages run. Build: `npm run build` → exit 0, `filename-law: 862 files in dist/, all lawful`.
**Instrument:** dist copied to a sub-path (`/games/vegan-spins/`) behind a `Cache-Control: no-store`
logging static server on :8099; Chromium via Playwright at `/opt/pw-browsers`, software rendering
(SwiftShader, no GPU). Boot screenshot taken and confirmed as the game before anything else was judged.

SCORE: 1

## Why 1 and not 1.33

The build does not contact the Remote Game Server in any configuration — `createRgsClient()` has
zero call sites and the production bundle contains zero occurrences of `wallet/play`,
`wallet/authenticate`, `wallet/end-round`, `rgs_url` or `sessionID` — so the slot spins on a
client-side RNG and pays out of a `let balance` seeded with a hardcoded 1,000, while a mock wallet
and a player-reachable force panel ship alongside it; that is my blocker line, not a long list.
1.33 is the band for "the list is long enough that you doubt anyone tested this", and that is not
what this is — 902 tests pass, the maths returns 96.5000% across all eight modes with 0.0000pp
spread, and four of the studio's six highest-transfer traps are properly closed — which is exactly
why I stop at 1 rather than going below it.

---

## Blockers

**B1 · The game never contacts the RGS. Money is invented in the browser.**
*Violates:* Stage 6 (all bullets); §3 items 20–37 and 73–77; `approval-rgs-requirements`.
*Steps:*
```
grep -rn "createRgsClient" /home/user/farmers-day/src/    # only its own definition + 2 comments
cd /home/user/farmers-day/dist && grep -ho "wallet/[a-z-]*" assets/*.js | sort -u
cd /home/user/farmers-day/dist && grep -ho "rgs_url\|sessionID" assets/*.js | sort | uniq -c
```
*Expected:* the wallet lifecycle present in the shipped bundle.
*Actual:* all three commands return nothing. `src/stake/rgs.ts` is a competent 516-line wallet
client that nothing imports, so Rollup tree-shook it out entirely. The slot resolves outcomes in
`src/game/slots/resolveSpin.ts` from a local RNG and debits
`src/SlotApp.svelte:114` `startingBalance = 1000 * MONEY_SCALE` → `:224` `let balance = $state(...)`.
The source says so itself at `:212-220`: *"What it is not is a real wallet: nothing is wagered
anywhere, no round is booked."* Launched with `?sessionID=…&rgs_url=…` the game ignores both and
boots its demo. Consequences that are therefore all unreachable rather than merely wrong: bet levels
from `betLevels`, `defaultBetLevel`, round restore on `round.active`, end-round idempotency,
`/bet/replay`, and every jurisdiction flag.

**B2 · A mock wallet ships in the production bundle.**
*Violates:* §3 item 88; trap T17; evidence rule 1 (this is the Slot O' Verse `COMPLIANCE.md` failure).
*Steps:* `cd /home/user/farmers-day/dist && grep -ho "demo wallet[^\"']*" assets/*.js | sort -u`
*Actual:* `demo wallet: a round is already open`, `demo wallet: insufficient balance`,
`demo wallet: not a flight mode`, plus the `demo-flight` round-id prefix. Source:
`src/stake/flightRound.ts:264` `createDemoFlightRgs`, wired at `src/SlotApp.svelte:1470`.

**B3 · A force/cheat panel is reachable by any player in the production build.**
*Violates:* §3 item 88; trap T17.
*Steps:* load `http://<host>/games/vegan-spins/?force-event`, click PLAY, pick the Vegan Spins door,
click the `FORCE` tab on the right edge.
*Actual:* a panel offering `3 → 8 spins`, `4 → 10 spins`, `5 → 8 SUPER spins`, `5 × Aubergine`,
`Expanding Wild — the duel`, `The shot — 6 crops`, `Eggs — a board of wilds`. I forced a
5-of-a-kind and the balance went 1,000.00 → 1,047.00 on a $1.00 stake (screenshot `aub-5600.png`).
Gate: `src/ui/ForcePanel.svelte:47-55` — `import.meta.env.DEV || q.has("force") || q.has("force-event")`.
The comment names the deployed URL it is meant to be visited with. `vite.config.ts` additionally
ships `wild-preview` as a build input and calls it "a debug rig, and a deliberate one".

**B4 · The game is completely silent, and its own Settings tab says so.**
*Violates:* Stage 1 in full; §3 item 55; DEFECT-CORPUS P1 (the axis that cost a real reviewer's 1.33).
*Steps:*
```
find /home/user/farmers-day -path ./node_modules -prune -o -type f \
  \( -iname '*.mp3' -o -iname '*.ogg' -o -iname '*.wav' -o -iname '*.m4a' -o -iname '*.opus' \) -print | wc -l
grep -rn "AudioContext\|new Audio(\|createBufferSource\|decodeAudioData\|<audio" /home/user/farmers-day/src/
```
*Actual:* `0` audio files in the repository and in `dist/`; zero playback APIs anywhere.
`src/game/sound.svelte.ts:6-8` states the position outright: *"we do have no audio currently…
nothing here plays anything"*. The build nonetheless ships a full mixer — master switch, Music and
Effects channels, two volume sliders — and the Settings tab tells the player:
*"This game has no audio yet — these settings are remembered, and apply the day sound lands."*
Every event in the protocol's map has nothing against it: spin start, each reel stop, every win
tier, anticipation, near-miss, feature entry/exit, retrigger, button click, the duel, the shot, the
eggs, big-win rollup, session music. Slot O' Verse scored 1.33 from a real reviewer for shipping
*placeholder* cues; this ships none.

**B5 · The disclaimer is one sentence of the seven required points.**
*Violates:* §3 item 56; `approval-disclaimer.svx` ("Games submitted without a disclaimer in the
rules/info popup will not pass approval").
*Steps:* open the menu → About. *Actual:* the whole disclaimer is
`src/ui/MenuModal.svelte:1162` — "Malfunction voids all pays and plays." Missing: internet
requirement, disconnection recovery by reload, expected return over many plays, display accuracy /
not a physical device, payout source, copyright/TM.
Worse, the adjacent FAIR PLAY copy (`:1158-1161`) asserts the *opposite* of the required payout-source
point — *"Every spin's outcome is drawn from the game's random source at the moment SPIN is pressed"* —
which is true of this build and is precisely what Stake requires a game to deny.

---

## Findings

Ranked by what they cost me.

**F1 · Social/sweepstakes mode is entirely unwired; restricted terms render in the clear.**
§3 items 2–12; traps T1, T2; defects C3, C7.
`src/game/social.svelte.ts` holds a careful 20-entry swap table with the morphology trap already
solved (`PAYTABLE`, `PAYLINES`, `PAYING`, `\bPAID\b`, `PAYOUT`…). `setSocial()` and `socialLabel()`
have no call sites outside that file. Proof against the artefact, not the source:
`cd dist && grep -ho "setSocial" assets/*.js | wc -l` → `0`, and the swap-table literals
`PAYTABLE`/`PAYLINES` are absent from the bundle too — the whole module was tree-shaken. Meanwhile
the rendered rules and paytable carry PAYTABLE, PAYOUTS, PAYING, payout, BUY panel, BUY button,
BUYING A ROUND, Buy Free Spins, BET. Neither social signal (`?social=true`, `config.jurisdiction.socialCasino`)
is read anywhere. This is the trap the lessons file says is not closed until a build check fails on it.

**F2 · Currency: Balance and Bet are not 2dp outside USD, and money rounds up.**
§3 items 16, 18; trap T4; defects C4, C8.
`src/game/money.svelte.ts:82-88` builds one `Intl.NumberFormat` with no fraction digits and no
`roundingMode`; `fmtCash` (`:109`) and `fmtMoney` (`:125`) are the only formatters, used for balance,
bet and win alike. Reproduction:
```
node -e 'for(const c of ["USD","JPY","KWD"]){const f=new Intl.NumberFormat("en-US",{style:"currency",currency:c});
console.log(c,f.format(1000),f.format(1))}'
USD $1,000.00 $1.00   JPY ¥1,000 ¥1   KWD KWD 1,000.000 KWD 1.000
node -e 'const f=new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"});console.log(f.format(147.705))'
$147.71
```
KWD Balance/Bet render 3dp and JPY 0dp against the required exactly-2dp; and `147.705 → $147.71`
is money rounding **up**, which is C8 in the other direction ("$147.70 shown as $147.69" was the
original; this build will show more than the player holds).
Aggravating: I could not test any of this in the running game because **`setCurrency()` is never
called** — the only call is the module's own default at `:90`. The game runs in USD and nothing else.
That is the category I cannot forgive: a configuration I could not test because the game will not
run in it. Items 17, 19 and 29 are unproven for the same reason.

**F3 · Hit-rate and probability numbers in player-facing copy — four instances.**
§3 item 57; trap T12's inverse rule, which names this exact shape as a violation.
Rules tab: *"free spins arrive about 1 in 4 spins instead of 1 in 451"*; *"free spins land 3× as often"*.
About tab: *"Free spins lands 3 or more about 1 spin in 451"*; *"All 5 starts SUPER — once in
1,048,576 spins"*. Reproduce: menu → Rules, menu → About.

**F4 · No spacebar binding of any kind.**
§3 item 41. I pressed Space twenty times on the idle board: the board, the balance ($1,000.00) and
the win ($0.00) were byte-identical before and after (`sess-final.png`). `grep -rn "keydown"
src/` finds handlers only in modals, the flight and the dev panels — none on the bet action.
Items 42 and 43 are moot in consequence, not passed.

**F5 · No UI guide.** §3 item 54; Round 6.5. Menu tabs are Rules / Paytable / Settings / About;
`grep -n "UI GUIDE\|BUTTON GUIDE\|GUIDE" src/ui/MenuModal.svelte` → nothing. Six controls on the
bar (menu, paw, ±, spin, turbo, autoplay) have no explanation anywhere.

**F6 · Insufficient funds is a silent no-op with no message.**
§3 item 24; round 3.5. `src/SlotApp.svelte:695` — `if (!settled || !canAfford || inFreeSpins) return;`.
The button stays clickable (correct) but nothing at all happens and no message exists in the UI;
`grep -rn "nsufficient" src/` finds only autoplay's stop reason at `:2020`. A dead button that
looks alive is worse than a greyed one.

**F7 · Max win disagrees between the client, the rules table and the maths pack.**
§3 item 48; trap T11; defect C6.
`src/game/config.ts:125` `wincapMult: 50_000`, rendered as a single game-wide pill on the first
screen the player sees — `src/ui/IntroScreen.svelte:834`, "MAX WIN 50,000× STAKE" — sitting directly
above the Felix's Flight card (screenshot `s0-boot.png`). `src/ui/BuyPanel.svelte:93` says
*"Felix's Flight tops out at 9,257x, not [the global wincap]"* and `config.ts:117` agrees. The
published pack disagrees with both: every Felix lookup table tops out at exactly 50,000×
(`sort -t, -k3 -nr lookUpTable_felixBase_0.csv | head -1` → `26430,19987,5000000`, ÷100). Three
answers in one build. Credit where due: the Rules tab does carry a correct per-mode PRICE/RTP/MAX WIN
table, which closes the *shape* of C6 even though the numbers in it disagree with the buy panel.

**F8 · Advertised max win is not reachable at 1-in-20,000,000.**
`approval-checklist.json` item 51; §3 item 97. Computed from the published weights:
base `1-in-25,000,048`, felixBase `1-in-25,000,344`. This is designed in —
`src/game/wincap.ts:85` `CAP_PER_STAKE = 1 / 25_000_000`. Two of eight modes miss the requirement.

**F9 · Payout gap below the maximum in the three Felix modes.**
§3 item 99. Distinct payouts, top of ladder: felixBase `50,000 / 445.92 / 442.5 / 436.08` — a 112×
jump with nothing between; felixEnhanced 25.6×; felixSuperEnhanced 25.4×; base 11.7×. The four
slot buy/enhancer modes are smooth (1.0–3.0×), so this is specific to Felix and reads as a 50,000×
cap grafted onto a distribution that naturally tops out near 2,000×.

**F10 · No internationalisation at all.** §3 item 39. No locale catalogs, no `translate()`, no
`?lang` read in the app; every string is an English literal. `?lang=zzinvalid` does load cleanly with
zero console errors (item 38 passes, by not reading the parameter), but item 39 fails outright and
item 40 has no mechanism.

**F11 · No session, so no resume; mid-spin refresh loses the round and resets the wallet.**
§3 items 30–33, 35. Steps: enter the slot, raise the bet twice, click SPIN, reload after 700ms.
*Actual:* **no browser dialog** (item 34 genuinely passes — zero `beforeunload` in the tree), but the
game returns to the intro screen with balance back at $1,000.00 and the bet back to default, and the
in-flight round is gone.

**F12 · 23.84 MB and 502 files before the game is playable.**
Stage 5 / §3 item 61. Measured from the server log across a full boot. On this container the
door screen appeared 27.4s after load and the board 41.6s; those wall-clock figures are
software-rendering-inflated and I do not offer them as a verdict, but the byte and file counts are
hardware-independent.

**F13 · MEGA and EPIC win presentations run 20s and 26s, in silence.**
`src/game/winBanner.ts:67-68` `presentDuration: 20 * SECOND` / `26 * SECOND`. Skippable
(`WinCelebration.svelte:299,312`), which saves it from being worse. DEFECT-CORPUS P4.

**F14 · Cosmetic.** The intro's centre card overlaps its own subtitle — "FREE SPINS" with
"& SUPER FREE…" clipped behind the icon plate (`s0-boot.png`, card 2). At 390×844 the control-bar
canvas measures 402px wide at x=-6 in a 390px viewport, overhanging both edges.

---

## What passed, and it is not a short list

I weight rather than only count, so this matters to the number I gave.

- **Maths.** RTP `96.5000%` in **all eight** modes, spread `0.0000pp` (§3 item 96 — computed from
  the published lookup tables, not read off a config label, so item 101 passes too). Mode costs in
  `index.json` match the rules text exactly (item 100). Base non-zero hit rate 1-in-8.56 — a shade
  outside the 3–8 guidance, nowhere near the 1-in-20 reject risk.
- **Requests.** With cache disabled and 60s parked on intro, doors, and idle board: 591 → 591 → 591
  → 592 after five spins. Plateaus dead. Zero 404s, zero 4xx/5xx, zero console errors in every run.
  Items 58–62 and 87 pass — this is T9/C11 properly closed.
- **Popout S.** 400×225 gets a real re-stacked two-row bar with enlarged controls, all inside the
  viewport, board legible, no scroll (`pS4-game.png`). Selected by pure geometry —
  `src/ui/bar/barPortrait.ts:219` `useCompactBar(fitScale, vw, vh)` — with `pointer:coarse` used
  only to grow touch targets in `chrome.css:649`. Item 67/70 pass. This is T13, the studio's previous
  rejection cause, closed correctly.
- **Filename law:** `find dist -name '* *'` → 0; zero capitalised basenames or directories; the
  build enforces it (`scripts/filename-law.mjs`). Items 78–81.
- **Zero assets byte-identical to any web-sdk sample** — 809 game assets hashed against 1,065 web-sdk
  assets, intersection empty (item 84).
- **Zero external origins** in the bundle; the only absolute URLs are library error strings (item 85).
- **Zero `beforeunload`** (item 34); `touch-action: manipulation` present (item 46); no emoji
  anywhere in source or bundle.
- **902 tests pass across 54 files** (`npm test`, 378.80s).

## Stage 2 — I played it, and this is the part no list carries

About 45 spins at $1.00, plus every feature via the force panel. The base game is a dead-spin
machine — 88.32% of base weight pays nothing, computed from the weights — and it plays in total
silence at roughly 1.9s a spin. Nothing acknowledges a spin except a number changing in a bar: no
reel-stop report, no anticipation on two scatters, no near-miss beat, no click. The art is genuinely
good and the farmer idles and reacts, but by spin twenty I was not waiting to see what landed, I was
waiting for it to end. The forced 5-of-a-kind at 48× produced cyan rings and a counter and that was
the whole event. A silent slot is not a slot with a missing feature; it is a slot with a missing
half.

## Stage 3 — creativity

Strip the theme and the sentence is "a 5×4, 40-line line-pay slot with a scatter free-spins round
and an expanding wild" — which describes a great many games on the platform. What is not generic:
the farmer's **shot** converting crops on the settled board before it pays, the hen's **eggs** as
per-line positional multipliers, and the **duel** for a wild reel with a 250× rung — three named
mechanics a player could describe to a friend, resolved in a fixed and defensible order
(`resolveSpin.ts`). Felix's Flight is a second surface with its own control scheme. The identity
holds on every surface I opened — intro, door picker, board, bar, all four menu tabs — rather than
being themed on the reels and generic elsewhere. Title carries no banned token and is not confusable.
This is the axis the studio is good at and it is good here.

## Stage 4 — motion

The win ladder is real craft: nine levels, and a win *climbs* through the tiers beneath it rather
than opening on its final one (`winBanner.ts:208-223`) — that is the kind of detail Stake's 3-star
language is about. Turbo scales every duration and leaves top speed alone (`spinMotion.ts:694`).
Against that: the 20s/26s top-tier holds, and I could not verify one-shot display windows against
authored clip lengths (below).

## What I would tell the studio

**Wire `createRgsClient(launch)` into `SlotApp` and delete the demo wallet and the force panel from
the production build.** The source already says this is one line —
`src/SlotApp.svelte:1459`: *"Swapping this one line for `createRgsClient(launch)` is the whole of
what Gate 4 asks."* Until it is done, this is not a Stake game, and roughly forty checklist items
cannot even be run against it, let alone passed. Do that and my score moves off the blocker line
immediately.

## What I could not verify

- **Frame rate.** No GPU; Chromium fell back to SwiftShader. I will not quote fps. What I can
  defend: `PerformanceObserver` long tasks at every phase transition peaked at 910ms (boot), 936ms
  (PLAY→doors), 972ms (door→board) and 1,185ms (after six spins) — many long tasks, but **no
  multi-second frozen frame** of the Mummy's-Riches 3.7s kind. On this hardware I cannot separate
  the game's main-thread work from software rasterisation, so treat that as unproven ground and
  re-run `_perf_probe.mjs THROTTLE=6` on real hardware.
- **Every wallet, replay and jurisdiction item (§3 20–37, 73–77, 104).** Not testable: there is no
  RGS client in the build to test.
- **All non-USD currency behaviour (items 16–19, 29).** Not testable at runtime: `setCurrency()` is
  never called. F2 is proven from the formatter's construction, not from the running game.
- **Social mode end-to-end (items 2–14).** Not testable: no signal is read. F1 is proven from the
  bundle's contents.
- **One-shot animation windows vs authored clip length (Stage 4 / P3).** I would have needed the
  baked rig timings alongside each display window; `npm run docs:animations` exists and I did not
  have budget to cross-reference it against every call site. Unproven, not passed.
- **Item 112 / T21 (`position:absolute` anchored only by `filter`).** Not run — no equivalent of
  `verify_pos_anchors.mjs` exists in this repo and I did not port one.
- **Bonus-buy dialogs and autoplay confirmation (items 44, 45).** I reached the buy panel's copy
  through the rules text and `BuyPanel.svelte` but did not drive the confirm flow to a purchase.
