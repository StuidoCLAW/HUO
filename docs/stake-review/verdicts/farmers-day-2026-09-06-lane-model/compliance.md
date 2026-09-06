# Vegan Spins — reviewer #3 (compliance and correctness)

SCORE: 0.67

**Why 0.67 and not 1.00.** Stake's 1-star band is "games of lower polish that still meet
publishing requirements", and this build does not meet them: it never contacts the RGS at
all — `src/stake/rgs.ts` is dead code, and the shipped slot spins on a client-side RNG,
scores itself against a client-side paytable and pays out of a self-granted 1,000-unit
demo wallet — so there is no configuration in which a real bet can be placed or a real win
credited. Three further absences each independently fail approval on Stake's own written
rules (no disclaimer, no bet replay, a social-mode scrub that is wired to nothing), and the
game ships with zero audio files in the repository, so this is not one blocker to work off
a fix list but four stacked on a silent build.

---

## 1. Blockers

### B1 · The game never talks to the RGS. Every spin is a client-side invention.

`src/stake/rgs.ts` (516 lines, a competent live client) is imported by exactly one file, for
one constant and one type:

```
$ grep -rn 'stake/rgs' --include=*.ts --include=*.svelte src/
src/game/jurisdiction.svelte.ts:19:import { NO_LIMITS, type JurisdictionLimits } from "$stake/rgs";
src/SlotApp.svelte:218:   * anywhere, no round is booked, and `$stake/rgs` is where the real one
```

`createRgsClient`, `readStakeLaunch`, `authenticate`, `play` and `endRound` have zero call
sites. Confirmed by endpoint grep — no file outside `src/stake/` issues a request to any
wallet path:

```
$ grep -rn "wallet/authenticate\|wallet/play\|wallet/end-round" --include=*.ts --include=*.svelte src/ | grep -v '^src/stake/'
(only comments in FelixFlight.svelte, FlightApp.svelte, SlotApp.svelte)
$ grep -rn "fetch(" --include=*.ts --include=*.svelte src/
src/engine/spriter/SpriterPlayer.ts:67   src/stake/rgs.ts:338   src/stake/rgs.ts:505
```

What runs instead, at `src/SlotApp.svelte:114` and `:224`:

```
startingBalance = 1000 * MONEY_SCALE,
let balance = $state(untrack(() => startingBalance));
```

and `src/SlotApp.svelte:694-706` — `pull()` debits `balance -= spinStake`, draws its own
stops from a local `mulberry32` source, and pays what the local evaluator says. Felix's
Flight spends the same wallet through `createDemoFlightRgs` (`src/SlotApp.svelte:1467`,
`src/stake/flightRound.ts:264`), a demo client that ships in the production bundle.

The file's own comment states the position plainly (`src/SlotApp.svelte:214-221`): *"A DEMO
WALLET… nothing is wagered anywhere, no round is booked."* The studio's plan agrees —
`docs/SUBMISSION-PLAN.md:312` "RGS never exercised against a live `rgs_url`", `:465` Gate 4
"a complete round settles against a live RGS" is unticked.

Note the doc-versus-code divergence that rule 1 exists for: `src/stake/rgs.ts:276-285`
asserts that an unlaunched production build "renders a fatal notice rather than mounting the
game". It does not. `src/main.ts:69-71` mounts `SlotApp.svelte` unconditionally, and the
demo wallet grants 1,000 units to anyone who opens the URL.

**Fails checklist 20, 22, 24, 26, 27, 28, 30, 31, 32, 33, 36** and Stake's RGS requirement
doc in full ("Player must be able to use all bet-levels returned within RGS auth/ response").

### B2 · Social mode is unreachable, and every restricted word ships.

`setSocial()` has no callers anywhere in the source:

```
$ grep -rn "setSocial" --include=*.ts --include=*.svelte src/
src/game/social.svelte.ts:25:export function setSocial(on: boolean): void {
```

so `isSocial()` is permanently `false`. Worse, the swap helpers are wired to nothing either
— `socialLabel()`, `betWord()` and `buyWord()` (`src/game/social.svelte.ts:43,48,112`) have
zero call sites in any rendered component; the single consumer of the module is a currency-
code swap in `src/game/money.svelte.ts:65`, itself dead because the flag can never arm.

The consequence is visible in the source of the two screens a reviewer opens first. The
control bar draws the literal string:

```
src/ui/ControlBar.svelte:529   putReadout("bet", "BET", betText, r.betX, r, r.wBet, 0);
src/ui/ControlBar.svelte:765   makeText(txt, "betLabel", "BET", 0, 0, labelStyle(12));
```

and the rules screen renders, unscrubbed: `Paytable` (`MenuModal.svelte:192,198`),
`{LINE_COUNT} paylines` (`:538`), `Each line pays…` (`:544`), `It pays no cash` (`:550`),
`Max win is the highest total payout` (`:595`), `the BUY panel` (`:662,676,702,719`),
`Buy {o.label}` (`:490`).

This is trap T1 (the studio's own recorded "killer"), plus round 4.6 and round 6.6, and it
is a stronger failure than either: the mechanism is not under-inclusive, it is absent.

**Fails checklist 2, 3, 4, 5, 6, 7, 9, 11, 12, 14.**

### B3 · No disclaimer. Stake's own doc says this alone fails approval.

`approval-disclaimer.svx` (vendored at `graveyard-shift/docs/stake-engine/`): *"Games
submitted without a disclaimer in the rules/info popup will not pass approval."* Seven
points are required. The build carries one sentence, at `src/ui/MenuModal.svelte:1162`:

```
<p class="menu__fine">Malfunction voids all pays and plays.</p>
```

Missing: internet requirement, disconnection recovery, expected return over many plays,
display accuracy, payout source, copyright/TM notice. A repo-wide grep for
`Disclaimer|Responsible|18+` returns nothing else.

The payout-source point is not merely absent but contradicted. `MenuModal.svelte:1156-1159`
tells the player *"Every spin's outcome is drawn from the game's random source at the moment
SPIN is pressed"* — an accurate description of B1 and the opposite of what the required
clause must say.

**Fails checklist 56.**

### B4 · No bet replay.

`readReplayLaunch()` and `fetchReplayBook()` (`src/stake/rgs.ts:139, :502`) are never
called; `setReplayMode()` (`src/game/jurisdiction.svelte.ts:37`) is never called; there is
no replay surface, no replay HUD and no `?replay=true` branch in `src/main.ts`. A replay
URL loads the ordinary demo game with a fresh 1,000-unit balance.

**Fails checklist 73, 74, 75, 76, 77, 109.**

---

## 2. Findings

Ranked by what each cost me.

**F1 · Currency is never read from the launch parameters — every session renders USD.**
`setCurrency()` (`src/game/money.svelte.ts:75`) is called exactly once, at module load with
its own default (`:90`). `readStakeLaunch()` parses `currency` (`src/stake/rgs.ts:133`) and
nothing consumes it. A JPY or KWD session shows dollar signs and dollar amounts.
*Checklist 19.*

**F2 · The formatter behind it reproduces reviewer finding 3.2 verbatim.** When it is
wired, `money.svelte.ts:82-85` builds `Intl.NumberFormat` with no fraction-digit pins,
which the comment defends explicitly. Measured:

```
$ node -e '…new Intl.NumberFormat("en-US",{style:"currency",currency:c})…'
USD  bal 10000000000 -> $10,000,000,000.00 | bet 0.4 -> $0.40   | 147.7 -> $147.70
KWD  bal 10000000000 -> KWD 10,000,000,000.000 | bet 0.4 -> KWD 0.400 | 147.7 -> KWD 147.700
JPY  bal 10000000000 -> ¥10,000,000,000        | bet 0.4 -> ¥0        | 147.7 -> ¥148
```

`KWD 0.400` and a `¥0` bet are the exact strings Stake wrote up against Graveyard Shift.
`¥148` for 147.70 rounds money UP — the C8 "money shouldn't round" finding. *Checklist 16,
18.*

**F3 · Per-frame `<img>` src swaps, up to 1,200 assignments per second.**
`src/ui/WinCelebration.svelte:273` runs `setInterval(() => { frame += 1 }, COIN_SPIN_MS)`
with `COIN_SPIN_MS = 80` (`src/game/coinShower.ts:57`), and `:338` swaps each petal's src
off that counter:

```
<img src={shower.frames[(frame + p.foff) % shower.frames.length]} alt="" />
```

`MAX_PETALS = 96` (`src/game/flowerShower.ts:75`). With DevTools "Disable cache" ticked —
the protocol the reviewer used to raise "the game is sending a high number of invalid
requests" — that is 96 × 12.5 = 1,200 requests per second for the duration of every big
win, each cancelling the last. Trap T9(a) reproduced at roughly six times Graveyard Shift's
volume. *Checklist 59.*

**F4 · Debug rigs ship in the production build, three ways.**
`npm run build` emits `dist/wild-preview/index.html`, titled *"Expanding wild — reel
builder"*, as a first-class page (`vite.config.ts:35-45` argues for it deliberately).
`src/main.ts:60-69` mounts four more builder rigs off the main URL — `?build-ew`,
`?build-egg`, `?build-fs`, `?type`. And the outcome-forcing dev panel arms on any build:

```
src/ui/ForcePanel.svelte:50-55
  const enabled = import.meta.env.DEV || (… q.has("force") || q.has("force-event"));
```

Verified present in the shipped chunk: `grep -l "force-event" dist/assets/*.js` →
`dist/assets/slotapp-iw9e00ee.js`. *Checklist 88.*

**F5 · Hit-rate and probability figures in player-facing copy.** The rules screen prints
them in two places. `src/ui/MenuModal.svelte:680-682`: *"free spins arrive about **1 in
{…}** spins instead of 1 in {…}"*; `:666-667`: *"free spins land **{ENHANCER_BOOST_CLAIM}× as
often**"*. The About tab adds three more (`:1140-1146`): *"lands 3 or more about 1 spin in
{…}"*, *"once in {…} spins"*. Item 57 and trap T12's inverse rule name "5× more likely" and
"1 in 20 chance" as violations by construction. *Checklist 57.*

**F6 · No spacebar-to-bet.** Stake's frontend requirement: *"The spacebar must be mapped to
the bet button."* A repo-wide search finds space handling only in `FelixFlight.svelte:6355`
(dismiss a payout card), `RoundGate.svelte:231` (Enter/Space on a button, correct) and
`src/dev/PaylinePreview.svelte:44`. Nothing binds it to spin. The jurisdiction getter
`noSpacebar()` exists with nothing to gate. *Checklist 41.*

**F7 · Insufficient funds does nothing at all.** `src/SlotApp.svelte:695` —
`if (!settled || !canAfford || inFreeSpins) return;`. The spin button stays lit and
answers with silence: no message, no notice, no request. Round 3.5 asked for a clickable
button *and* an "Insufficient Funds" message; this build supplies the first half and drops
the second. (The autoplay panel does better — `AutoplayPanel.svelte:153` relabels to "Not
enough balance" — but greys the button while doing it.) *Checklist 24.*

**F8 · Bet ladder is a hardcoded literal.** `src/game/config.ts:97`:
`BET_STEPS_DISPLAY = [0.2, 0.5, 1, 2, 5, 10, 20, 50]`. `SlotApp.svelte:205` derives the
bet straight from it. `rgs.ts` contains careful clamping logic for `betLevels` /
`minBet` / `maxBet` / `stepBet` (`:381-401`) that nothing reaches. On a JPY session
(min ¥10) every rung is below minimum. *Checklist 20, 22, 29.*

**F9 · Jurisdiction flags are inert.** `setLimits()` (`jurisdiction.svelte.ts:49`) has no
callers, so every flag is permanently permissive. Independently, `noTurbo()`,
`noSpacebar()` and `minRoundMs()` are honoured in **no** component
(`grep -rn "noTurbo()\|minRoundMs()" src/ --include=*.svelte` → empty); only
`noAutoplay()` and `noBuyFeature()` are read. *Checklist 37.*

**F10 · 90.05% of base spins pay nothing — on Stake's written rejection line.** From the
repo's own simulator, `npx vite-node scripts/math-sim.mjs`, seed 20260828, 4,000,000 base
spins:

```
nothing   3,602,142   90.0536%
under 1×          0    0.0000%   never
4,000,000 spins   RTP 67.7220%   hit rate 9.9465%
```

Stake's math doc: *"A reasonable portion of simulations should yield paying results (e.g.,
90,000 non-paying results out of 100,000 may be grounds for rejection)."* 90.05% is that
number. The paid hit rate of 1-in-10.05 also sits outside the checklist's 1-in-3 to 1-in-8
band; the line game alone hits 1-in-4.9 and the win floor eats the difference. *Checklist
98, and Stake math requirements.*

**F11 · The declared RTP is not the model's RTP, and 28.3 of its points are a literal.**
The rules table prints `96.50%` for all eight modes (`MenuModal.svelte:448` etc., from
`GAME.targetRtp`), while the game's own exact model returns **96.3984%** (sim header,
above). Of that, `FEATURE_GAIN = 0.282916` — 28.29 points, 29% of the whole return — is a
hardcoded constant at `src/game/slots/rtp.ts:247`, and `simulate()` (`:483-530`) does not
model the shot or the eggs at all, which is why the same script measures the base at
67.72%. The repo's cross-check cannot check 29% of its own headline. *Checklist 101.*

**F12 · The math pack does not exist as an artefact.** `npm run verify:math`:

```
math pack → upload
  ✗ no pack at …/math-sdk/games/vegan_spins/library/publish_files
    run `npm run math:pack` first — it is a build artefact and is not committed.
```

`npm run math:pack` did not complete in 10 minutes in my session. There are no books, no
lookup tables and no `index.json` to diff against `config.ts`. *Checklist 100, and the
math-upload requirement.*

**F13 · Max-win headroom is thin against Stake's stated bar.** `docs/MAXWIN-50000.md:21`
puts the 50,000× cap at **1 in 19.6 million base spins**. The checklist threshold is
1-in-20,000,000 or better, so it passes by 2% — but Stake's own math doc says the cap
"must be realistically obtainable (typically more frequent than 1 in 10,000,000)". This
sits between the two numbers, which is a conversation with an analyst rather than a pass.
*Checklist 97.*

**F14 · A mode that cannot reach the advertised ceiling, correctly disclosed but worth
noting.** Felix's three tiers cap at `MAX_SKY_WIN` 9,257× against the game's 50,000×
(`src/game/config.ts:113-120`). The rules table handles this properly — per-mode caps, read
from `FLIGHT_MODES` (`MenuModal.svelte:497-506`) — which is finding 6.3 closed. The residue
is commercial, not compliance: three of eight purchasable modes cannot reach the number on
the tile.

**F15 · `html` is missing `overflow: hidden`.** `src/app.css:52-67` sets `height: 100%` on
`html, body, #app` but puts `overflow: hidden` on `body` alone, and there is no global
`canvas { display: block }` — every canvas rule is container-scoped
(`ControlBar.svelte:866`, `ReelLayer.svelte:1817`, and eight more). Body overflow does
propagate to the viewport in practice, so this is a latent rather than live failure of T14,
but it is the exact configuration that produced a 4px scroll in the audit that wrote the
rule. *Checklist 64.*

**F16 · WebGL context-loss recovery is on one surface only.** `webglcontextlost` is
handled at `src/ui/FelixFlight.svelte:1992` and nowhere else; the slot stage, which owns
the main renderer, has none. *Checklist 92.*

**F17 · One `console.log` in the shipped bundle**
(`dist/assets/money.svelte-jjixxsjr.js`). Minor, but item 63 is binary.

---

## 3. What passed, and it is not a short list

Recording these because the build is not sloppy — it is unfinished in one specific
direction, and the hygiene work around the hole is genuinely good.

- **Filename law**: `node scripts/filename-law.mjs dist` → *"862 files in dist/, all
  lawful"*. Rollup hashes pinned to base36 so even generated names stay lowercase
  (`vite.config.ts:52`). *Checklist 78, 79.*
- **Zero `beforeunload` handlers** in source or bundle. *Checklist 34.*
- **Zero web-sdk sample assets.** Hashed all 804 media/JSON files in `dist` against the six
  sample apps in `web-sdk/apps/`: 0 collisions. (Two files are byte-identical to Mummy's
  Riches — `catnip.webp`, a studio mark, and `spin.webp`, a UI glyph — which is studio
  reuse, not the prohibited case.) *Checklist 84.*
- **Zero external origins.** The only absolute URLs in the bundle are framework error-message
  strings (`svelte.dev/e/…`) and XML namespaces. Fonts are bundled locally. *Checklist 85.*
- **Sub-path safe.** Served `dist/` from `/vegan-spins/v1/` — index, entry chunk and a deep
  rig asset all 200. `import.meta.env.BASE_URL` handled per-document at
  `src/engine/basePath.ts`. *Checklist 86, 87 (static portion).*
- **The compact layout is done properly.** `src/ui/bar/barPortrait.ts:194-221` selects it on
  pure geometry — a measured legibility floor plus `vh > vw` — and the comments state
  outright *"no pointer test"*. `COMPACT_MIN_H` is derived from the 400×225 pop-out by name
  (`:255-270`). This is the single trap most likely to bite a bespoke frontend and it is the
  best-handled thing in the repo. *Checklist 67, 68, 70.*
- **Per-mode RTP and max-win table**, built from the owning modules rather than typed
  (`MenuModal.svelte:437-506`) — finding 6.3 closed by construction. *Checklist 47.*
- **No links anywhere** (R7), **no emoji** in source or bundle, **no manual bet entry**,
  **autoplay behind a confirmation panel** with stop conditions written by the same module
  the loop obeys (`AutoplayPanel.svelte:147`). *Checklist 23, 44, and R7.*
- **902 tests pass** across 54 files (`npx vitest run`, 574s), including played-out
  verification that the wincap is reachable from every free-spins round.
- Turbo has three tiers and the win presentation scales on them (`SlotApp.svelte:1135,
  1325`). *Checklist 102.*

---

## 4. The one-notch lift

**Wire `createRgsClient` into `SlotApp.svelte` and route every spin through
`authenticate` → `play` → `endRound`, taking the bet ladder, the default bet, the currency
and the jurisdiction limits from the authenticate response.**

One change, and it is the one that decides the review. It converts B1 into a pass and takes
F1, F8 and F9 with it — and, more to the point, it turns the artefact from "an offline demo
of a slot" into "a Stake game with a fix list", which is the difference between a score
below the publishing bar and one on it. The client is already written and already correct;
`src/SlotApp.svelte:1459` names the swap. Nothing else on this page moves my score a whole
step on its own.

---

## 5. What I could not verify

No browser was available in the sandbox — no Playwright, Puppeteer or headless Chrome, and
`scripts/pw/` ships harnesses with no runtime behind them. So I drove the build from source,
the production bundle and the repo's own simulators, and I did not see a frame of the game.
A reviewer will see it, and everything below will be scored as they find it:

1. **Frame rate on ordinary hardware, and under CPU throttle.** P2 in the defect corpus —
   the axis behind an unexplained 1.67 — and I have no measurement. `FelixFlight.svelte` is
   ~7,000 lines and the flight loads scene tiles with bare `await Assets.load` in sequence
   (`:2016-2205`); there is no concurrency gate of the kind Graveyard Shift needed. Untested.
2. **Animation completeness.** P3, the "some animations end abruptly" finding. Window-versus-
   clip-length auditing needs film.
3. **Popout S in practice.** The geometry gate reads correctly and its unit tests pass, but I
   could not walk the Pixi stage at 400×225 and compare interactive bounds against the
   viewport, which is what item 69 actually asks for.
4. **Request plateau with cache disabled.** F3 is derived from the source and the constants;
   I could not run the 60s park.
5. **The maths pack.** `npm run math:pack` did not finish in 10 minutes, so I could not diff
   the published books against `config.ts`, confirm the eight mode costs, or check the
   0.5% inter-mode spread on served weights rather than on declared targets. The sim figures
   above come from `scripts/math-sim.mjs`, which models the base and enhancer only.
6. **Audio.** Nothing to verify — `find` over the whole repository returns **zero** `.mp3`,
   `.ogg`, `.wav` or `.m4a` files. The game states it itself, in the product, at
   `MenuModal.svelte:1124`: *"This game has no audio yet."* Recorded as absent, which is how
   it will be scored.
