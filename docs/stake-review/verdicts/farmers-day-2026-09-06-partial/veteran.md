SCORE: 1.33

# Vegan Spins / Farmers Day — reviewer #1

Reviewed at `53826d5`. Built with `npm run build` (exit 0, `filename-law: 681 files
in dist/, all lawful`), served from a sub-path at
`http://127.0.0.1:8099/games/vegan-spins/` and driven in Chromium via Playwright.
No GPU in this container — SwiftShader software raster — so no frame-rate figure
here is one I would defend, and I have said so where it matters.

## Why 1.33 and not 1.67

This game cannot take a bet: the built bundle contains zero references to
`/wallet/authenticate`, `/wallet/play`, `/wallet/end-round`, `rgs_url` or
`sessionID`, it deals its own boards from a local `mulberry32`, and it pays from a
`$state` balance that resets on reload — and it makes no sound at all, which its
own menu admits to the player in writing. The craft underneath is real and in
places excellent, which is why it is not lower; but a slot with the wallet
unplugged, no audio, and its own reel-builder live on the game URL is a progress
report, not a submission, and everyone who worked on it has written that down in
four separate files.

## Blockers

1. **There is no RGS. The game is a demo wallet on a client-side RNG.**
   `src/stake/rgs.ts` is 516 lines of correct-looking wallet code with **zero call
   sites**: `grep -rn "createRgsClient\|readStakeLaunch\|readReplayLaunch\|fetchReplayBook\|createUnlaunchedRgs"
   src/` returns only the definitions inside `rgs.ts` itself. In the built
   artefact, each of `/wallet/authenticate`, `/wallet/play`, `/wallet/end-round`,
   `/bet/event`, `/bet/replay`, `rgs_url`, `sessionID` matches **0 files** in
   `dist/assets/*.js`; the only `fetch(` calls in the bundle are asset loaders.
   What ships instead is `src/SlotApp.svelte:1467` `createDemoFlightRgs(...)`,
   whose own comment at `:1459` reads *"Swapping this one line for
   `createRgsClient(launch)` is the whole of what Gate 4 asks of the flight"*, and
   `src/SlotApp.svelte:224` `let balance = $state(untrack(() => startingBalance))`
   — `startingBalance = 1000 * MONEY_SCALE` at `:114`. Boards are evaluated on the
   client: `src/SlotApp.svelte:240` `evaluateSpin(paidBoard ?? deal.grid, bet)`.
   The studio's own `README.md:202` says it plainly: *"That is the seam to wire a
   real RGS back in."* Everything Stage 6 asks for — bet levels from
   `authenticate`, affordability, no play on insufficient balance, no end-round on
   a zero win, an idempotency guard — is unreachable because the call never
   happens. Confirmed live: balance moved $1,000.00 → $998.00 → $997.50 across
   spins with no network traffic (request count flat at 483 across 20 spins,
   11 of which were lazy chunks).

2. **Zero audio in the shipped artefact, and the game says so on screen.**
   `find dist -type f \( -iname '*.mp3' -o -iname '*.ogg' -o -iname '*.wav' -o
   -iname '*.m4a' -o -iname '*.aac' \)` → nothing. The only `.webm` files are the
   two door-preview videos. No `AudioContext`, `new Audio(`,
   `createBufferSource` or `decodeAudioData` anywhere in `dist/assets/*.js`; no
   audio dependency in `package.json`. `src/game/sound.svelte.ts:5` states the
   position outright — *"nothing here plays anything"* — and
   `src/ui/MenuModal.svelte:1124` prints it to the player: **"This game has no
   audio yet"**. So: no spin start, no reel stop, no win tier, no anticipation, no
   feature entry or exit, no retrigger, no button click, no rollup, no session
   music. The mute control mutes nothing. This is the single defect that has cost
   this studio the most stars and it is at its maximum here.

3. **Developer tooling ships in the production build, on the live game URL.**
   `dist/wild-preview/index.html` is titled *"Expanding wild — reel builder"* and
   is a routable page. Four builder flags are live on the main entry —
   `src/main.ts:60-68` gates `?build-ew`, `?build-egg`, `?build-fs` and `?type`
   with no `import.meta.env.DEV` guard, and they survive minification
   (`grep -l "build-ew" dist/assets/*.js` → `main-h6qq45v4.js`). Loading
   `.../vegan-spins/?build-ew` in the production build returns a drag-to-position
   editor: *"Drag the ring to move him, the knob above his head to resize him.
   Arrow keys nudge by 0.001…"*. The `vite.config.ts` comment says why it is
   there: *"the expanding wild is still being built"*. A shipped feature that is
   still being built is not a shipped feature. (Credit where due: the `?force`
   panel IS properly DEV-gated — `ForcePanel` matches 0 files in dist.)

4. **Social-casino mode cannot be turned on, in any way.**
   `setSocial()` in `src/game/social.svelte.ts:25` has **zero call sites**;
   `?social=true` is never read (`grep -rn 'get("social")' src/` → nothing);
   `setLimits()` (`src/game/jurisdiction.svelte.ts:49`) and `setReplayMode()`
   (`:37`) likewise have none, because `authenticate` is never called. Verified in
   the browser: `.../vegan-spins/?social=true` renders the buy modal with
   **"BONUS BUY", "BUY", "BET", "PRICE", "PER SPIN"** unchanged. The elaborate
   word-swap table in `social.svelte.ts` — which cites real approval findings — is
   dead code. Jurisdiction flags `noTurbo`/`noAutoplay`/`noSpacebar`/
   `noBuyFeature`/`minRoundMs` are permanently permissive.

5. **No bet replay at all.** `readReplayLaunch()` and `fetchReplayBook()` are never
   called; `?replay=true` does nothing. Every Stage 7 replay requirement — loads
   the requested event, currency/language/amount params, replay-again, bet cost
   shown with multiplier — is unimplemented.

## Findings

Ranked by what they cost me.

1. **Placeholder and clipped art on four of five paid-mode cards.** The Bonus Buy
   modal (`x-buypanel.png`, 1500×900): Feature Enhancer's card art is the farmer
   plus **a featureless grey ellipse** — same blob in portrait
   (`x-portrait-intro.png`); Felix's Flight is **a dotted green arc with a dot**,
   a wireframe where every other card has art; Bonus Enhancer's third FS tile is
   **cropped by the card edge**; Super Free Spins' WILD stack is **cut through
   mid-tile top and bottom**. These are the cards that ask for $2.40, $30, $100,
   $250 and $1.

2. **The Bonus Buy modal is a different product from the game around it.** The
   board, intro, HUD and rules are hand-painted wood, sky and cartoon vegetables;
   the modal is flat charcoal with **purple/magenta gradient CTAs** that appear
   nowhere else. Stage 3 asks whether the identity holds across every surface. It
   holds everywhere except the one screen that takes money.

3. **Max-win figures disagree with the game's own engine.** The rules screen and
   every buy card quote **MAX WIN 50,000×** for all eight modes, Felix's three
   launches included. `src/ui/BuyPanel.svelte:93` states the rule and the number
   it is meant to show: *"PER MODE, NEVER THE GLOBAL WINCAP. Felix's Flight tops
   out at 9,257x, not at the game's 50,000x, and a card that quotes the global
   figure is telling the player a mode can reach something it cannot —
   displayed-not-actual, which is the failure this whole panel is supposed to
   prevent."* `src/game/config.ts:117` agrees (9,257×). The panel does the exact
   thing its own code says it exists to prevent.

4. **Hit-rate and probability numbers in player copy.** Rules screen: *"free spins
   arrive about 1 in 4 spins instead of 1 in 451"*, *"free spins land 3× as
   often"*; the menu's "The numbers" section prints scatter frequencies
   (`src/ui/MenuModal.svelte:1138-1145`); the intro card reads *"The rival goes
   from about one spin in thirty to one in ten."* Stage 7 bars all of these.

5. **The book contract is typed against the previous game.**
   `src/stake/bookEvents.ts:10` imports `SymbolId` from `$game/symbols`, and
   `src/game/symbols.ts:63-88` is Into The Slot O' Verse's symbol set — *Space
   Dog* (`symbol_8_dog_2.png`), *Outlaw*, *War Mech*, *Beast*, *Portal*, *Wild
   Mech* and four royals. The RGS event contract for a vegetable slot is defined
   in terms of a space cowboy's symbols.

6. **The published maths pack uses two different money scales for the same
   fields.** Slot books store money pre-multiplied by 1e6 — `books_freeSpins.jsonl`
   id 1, `lut ×81`, carries `freeSpinEnd.totalWin: 81000000` and
   `setTotalWin.amount: 81000000` — while Felix books store the documented
   bet-relative float (`books_felixSuperEnhanced.jsonl` id 8740:
   `setTotalWin.amount: 50000.0` for a ×50,000 round).
   `src/stake/rgs.ts:186-190` declares both fields bet-relative and multiplies
   them by `betUnits` at `:206`. Nothing breaks today only because no served book
   is ever consumed; the day the RGS is wired, a ×81 free-spins round presents as
   £81,000,000 at a £1 stake. `scripts/build-math-upload.mjs` checks names, costs
   and row alignment but never checks scale.

7. **A payout hole in base play.** Bucketing `lookUpTable_base_0.csv`: the base
   mode pays continuously to 4,270× (`[2500,5000)` at 1-in-143,143) and then
   **nothing at all until 50,000×** at 1-in-25,000,048. The two buy modes are
   smooth to the cap (`freeSpins` fills `[25000,49999)` at 1-in-14,349), so the
   hole is base-specific. Base max win at 1-in-25.0M is also outside the 1-in-20M
   guideline; base hit rate is 1-in-8.56, just outside the 1-in-3 to 1-in-8 band.

8. **59.8 MB build, 465 requests before the PLAY button.** 35.7 MB of it images,
   of which **8.76 MB is byte-identical duplicates** — 755 image files, 484 unique.
   The pattern is Spriter status-effect frames exported once per rig
   (`dist/assets/scml/{aubergine,avocado,broccoli,carrot,chilli,farmer,peppers,
   raddish,tomatoes}/effects/confused/__status_effect_01__ko_0NN.png`, nine
   byte-identical copies of each frame at 36 KB). 56 of those frames are also
   byte-identical to files in `mummysriches` (32) and `spaceodyssey` (22) — a
   shared rig library rather than an SDK sample, but worth knowing.

9. **No spacebar binding.** No window `keydown` anywhere binds space to the spin
   (`src/SlotApp.svelte` has none; the only global handlers are modal-scoped or in
   `FelixFlight.svelte`/`WinCelebration.svelte`). Stage 7 asks for spacebar bound
   to bet and dead behind modals; it is simply absent, so `noSpacebar()` guards
   nothing.

10. **`html` overflow is `visible`, not `hidden`.** Measured on the live page:
    `getComputedStyle(document.documentElement).overflow === "visible"`; only
    `body` is hidden. Nothing scrolled at any size I tried
    (`scrollWidth === clientWidth` at 1500×900 and 400×225), so this is a latent
    deviation rather than a live bug — but it is the belt the checklist asks for
    and the braces are missing.

11. **Portrait entry is fragile.** At 430×932 the intro's PLAY button stays
    `disabled` for ~15 s and I could not get a click to land on it inside 8 s
    afterwards across two attempts. Software raster is a fair share of that 15 s
    and I will not pin the number on the game — but the button is the first thing
    a phone player touches and I did not get through it.

12. **Repo hygiene: a directory named `slots assets`** (with a space) at the repo
    root. It does not reach `dist` — the built tree is clean, 0 files with a space
    or a capital, and no baked manifest references one — so it is not a CDN risk
    today. It is the exact shape `build-math-upload.mjs:34` was written about.

### What passed, and passed well

Said once so the studio can tell craft from noise.

- **The maths.** All eight declared modes return **96.5000%** — a spread of
  0.0000% — computed from the published lookup tables against
  `payoutMultiplierScale: 100`. `index.json` modes and costs match `config.ts`
  exactly. The two buy modes fill every payout band to the cap. 50,000× is
  reachable in all eight.
- **The test suite.** `npx vitest run`: **54 files, 902 passed, 1 skipped**, 533 s
  — several of them full RTP simulations, not unit stubs.
- **The build and the CDN law.** 0 filenames with spaces or capitals in `dist`,
  0 in baked manifests, 0 external origins fetched, 0 `beforeunload` handlers,
  0 4xx/5xx serving from a sub-path, and the request count **plateaus flat at 0**
  over 60 s parked on the board.
- **The compact layout works.** 400×225 selects a genuine two-row bar with every
  control inside the viewport (`w-popoutS.png`) — better than most first
  submissions manage.
- **`?lang=zzinvalid`** loads in English with zero console errors.
- **The base game looks good.** Bespoke logo, bespoke bitmap face, a hand-built
  control bar, a farmer standing beside the reels, a proper world change into free
  spins, a two-press buy confirmation, and turbo tiers that actually gate the
  cosmetic beats (`turbo: 0|1|2` at `SlotApp.svelte:1135`, consumed by
  `paradeMsFor`, `countUpMs`, `PUSH_TIER`).

## What I would tell the studio

Wire `createRgsClient()` in. One line at `SlotApp.svelte:1467` is what your own
comment claims it costs, and until it is done nothing else on this list can be
assessed — bet levels, affordability, insufficient funds, end-round idempotency,
replay, social mode and every jurisdiction flag are all downstream of a call that
never happens. Do that and the audio, and you have a 2 in front of the number.

## What I could not verify

- **Frame rate.** No GPU; Chromium composited in SwiftShader. My measurements —
  p50 1,133 ms and worst 2,383 ms over 20 base spins, worst 3,816 ms through the
  free-spins buy, with 107 long tasks — are not defensible as this game's fps and
  I am not quoting them as such. What I will say is that at 59.8 MB and 465 boot
  requests there is a real budget problem underneath whatever the hardware added,
  and that Mummy's Riches took a 1.67 for exactly this class of hitch. Re-measure
  on a throttled real device before submitting.
- **Motion completeness.** I could not audit one-shot clip display windows against
  authored lengths (Stage 4's "a 1000 ms hold on a 1200 ms clip is a snap") — the
  software renderer tore every transition badly enough that I could not tell a
  snap from a dropped frame. Several mid-spin captures showed clipped symbols
  which I have **not** counted against the game for that reason.
- **Bet-mode coverage.** I played base and bought Free Spins. I did not reach
  Feature Enhancer, Bonus Enhancer, Super Free Spins or Felix's three launch
  tiers, and I did not see an expanding-wild duel, the farmer's shot, the hen's
  eggs or a retrigger. Forcing them needs `?force`, which is correctly DEV-gated,
  so I would have been reviewing the dev build rather than the artefact.
- **Currency behaviour.** `money.svelte.ts:82` uses `Intl.NumberFormat` with the
  currency's own minor units and has a 4dp sub-cent path, which is the right
  shape — but I only ever saw USD, because the currency comes from an
  `authenticate` response the game never requests. KWD (3dp) and JPY (0dp) are
  untestable until the RGS is connected.
- **Autoplay.** Not exercised; its stop-on-affordability rule reads against a
  demo balance and would need the RGS to mean anything.
