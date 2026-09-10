# Vegan Spins — reviewer 1 (veteran)

**Build reviewed:** `StuidoCLAW/Farmers-Day` @ `a1d44403b35dd222a6d4fb3eaab33012fe347f46`
**Private extraction:** `/tmp/claude-0/-home-user-HUO/8a8b4e92-4a7e-5384-aa95-b96521497d2e/scratchpad/wt/veteran`
**Built with:** `npm run build` (exit 0; `filename-law: 889 files in dist/, all lawful`)
**Served from:** my own copy at `.../wt/veteran-work/game/vegan-spins/` on port 8317, behind a mock
Stake RGS I wrote (`.../wt/veteran-work/server.mjs`) serving books from a pack I generated
myself (`npx vite-node math-sdk/games/vegan_spins/tools/build_slot_pack.mts --rounds 4000 --seed 7`).
I did not build or serve from `/home/user/farmers-day`. Note: another agent was serving on
port 8099 from `scratchpad/serve/` during my run; every figure below was re-taken on 8317
against my own tree after I found that.

SCORE: 1.33

## Why 1.33 and not 1.67

1.67 is for a game that is finished except for polish — this one has no platform layer at
all: it never authenticates, never sends a play request, and pays itself out of a hardcoded
$1,000 held in a Svelte `$state`, so Stake's first two PreChecks fail on the first click and
everything downstream of authenticate (currency, social mode, jurisdiction switches, bet
levels, replay, round resume) is dead code with it. What keeps it off 1.00 is that the game
underneath is real, substantial work — the board, the rules screen and the eight-mode 96.50%
pack are the best-finished things I have seen out of this studio — but a build that ships a
working outcome-forcing cheat panel over a wallet it mints itself is not a submission, it is
a preview.

## Blockers

1. **The game never contacts the RGS.** No `/wallet/authenticate`, no `/wallet/play`, no
   `/wallet/end-round` anywhere in the shipped bundle:
   ```
   $ for s in /wallet/authenticate /wallet/play /wallet/end-round /bet/event /bet/replay; do
       printf "%-22s %s\n" "$s" "$(grep -l -- "$s" dist/assets/*.js)"; done
   /wallet/authenticate
   /wallet/play
   /wallet/end-round
   /bet/event
   /bet/replay
   ```
   (all five blank). `src/stake/rgs.ts` is complete, careful and **never called** —
   `createRgsClient` has exactly one occurrence in the whole of `src/`, inside a comment at
   `src/SlotApp.svelte:1698`. Live confirmation: a 22-spin session against my mock RGS
   produced **733 HTTP requests and zero to any wallet endpoint** (`/__requests` log), while
   the balance moved from $1,000.00 to $1,012.50 on screen.
   Fails checklist PreChecks 1 and 2.

2. **Outcomes come from a client-side PRNG and money from a local demo wallet.**
   `src/SlotApp.svelte:129` — `const source: Rng = untrack(() => rng ?? mulberry32(seed));`
   `src/SlotApp.svelte:954` — `const r = playRound(scatters, bet, source);`
   `src/SlotApp.svelte:117` — `startingBalance = 1000 * MONEY_SCALE`
   The studio says so itself at `src/SlotApp.svelte:216-223`: *"A DEMO WALLET… nothing is
   wagered anywhere, no round is booked, and `$stake/rgs` is where the real one arrives."*
   Felix's Flight is explicitly on `createDemoFlightRgs` (`src/SlotApp.svelte:1706`).

3. **A working outcome-forcing panel ships in the production build**, on a game that mints
   its own money. `src/ui/ForcePanel.svelte:47-57` gates on
   `import.meta.env.DEV || q.has("force") || q.has("force-event")`. Verified live on the
   built artefact: `…/index.html?force-event` then backtick opens *"FORCE — Force an event —
   real stops, not fake screens"* with `5 → 8 SUPER spins`, `Expanding Wild — the duel`,
   `Eggs — a board of wilds` (screenshot `wt/veteran-work/shots/f-panel.png`). Six more dev
   surfaces are reachable on the same production build, all verified loading with zero
   errors: `?build-ew`, `?build-egg`, `?build-fs`, `?type`, `?frame-size`, and the routes
   `/wild-preview/`, `/impact-preview/`, `/felixs-flight/` (`vite.config.ts:62-72` names the
   last three as deliberate).

4. **Advertised max win is outside Stake's reachability gate in two modes.**
   `src/game/wincap.ts:86` — `export const CAP_PER_STAKE = 1 / 25_000_000;`. Measured off the
   pack I generated: `base` 1 in 25,000,048 and `felixBase` 1 in 25,000,343. Checklist:
   *"Advertised max-win is achievable (hit-rate 1 in 20,000,000 or more frequent)."*
   The other six modes pass (featureEnhancer 1 in 10.4M down to superFreeSpins 1 in 100k).

5. **Disclaimer is one of the seven required points.** ABOUT tab renders exactly
   *"Malfunction voids all pays and plays."* (`shots/m-about.png`). Missing: connection
   requirement, reload-to-finish, expected-return-over-many-plays, not-a-physical-device,
   and — the one that matters here — *"Winnings are settled according to the amount received
   from the Remote Game Server and not from events within the web browser."* The screen
   instead tells the player the opposite: *"Every spin's outcome is drawn from the game's
   random source at the moment SPIN is pressed."* That is accurate, and that is the problem.

## Findings, ranked by what they cost

1. **Social mode can never arm.** `setSocial()` has zero call sites outside its own module.
   Launched with `?social=true`, the intro and rules still render: `MAX WIN 50,000× STAKE`,
   *"3 tools **pay** 8 free spins"*, *"**Buy** a launch whenever you like"*, *"The **money**
   **buys** how FAR he gets"*, `PAYTABLE`, `40 **paylines**`, *"multiples of the line **bet**"*.
   Full hit list from the scrubbed output: `stake, pay, pays, paying, payout, paytable,
   payline, paylines, bet, buy, buys, money, cash`. The `socialLabel()` swap table at
   `src/game/social.svelte.ts:73-101` is thorough and entirely dead.

2. **Currency parameter ignored.** `setCurrency()` is called once, at module load with its
   own default (`src/game/money.svelte.ts:90`). Launched `&currency=JPY`, the bar reads
   `BALANCE $1,000.00 / BET $1.00` (`shots/cur-JPY.png`). JPY has no minor unit; both the
   symbol and the two decimals are wrong. Same for KWD (3 minor units).

3. **Money display rounds rather than floors.** `fmtCash` hands straight to
   `Intl.NumberFormat` with default `halfExpand` (`money.svelte.ts:110-118`). Measured:
   `$0.125 → "$0.13"`, `$1.005 → "$1.01"`, `KWD 1.2345 → "KWD 1.235"`. The game shows more
   than the round paid.

4. **No replay support of any kind.** `readReplayLaunch` / `fetchReplayBook` never called;
   `replay=true` absent from `dist/`. All four Replay Support checklist lines fail.

5. **Spacebar is not bound to the bet button.** No handler in `SlotApp.svelte`; the only
   space keys in the game are in `FelixFlight.svelte:6611`, `RoundGate.svelte:231` and two
   preview pages. `noSpacebar()` exists at `jurisdiction.svelte.ts:63` and is read by nothing.

6. **The bonus world is silent, and so is every feature.** Audio call sites in the whole
   game: `WinCelebration.svelte` (3), `ReelLayer.svelte` (2), `SlotApp.svelte` (spin press,
   anticipation loop, ui click). Nothing in `FelixFlight.svelte`, `FlightApp.svelte`,
   `DuelScene.svelte`, `ShotScene.svelte`, `EggFx.svelte`, `TractorWipe.svelte`,
   `AubergineFall.svelte`, `FreeSpinTracker.svelte`. So: no cue for free-spins trigger, exit
   or retrigger; none for the farmer's shot, the hen's eggs, or the expanding-wild duel; and
   the entire Felix's Flight — sling pull, release, coin collect, frenzy, shield, toadstool
   hit, ground impact, landing, payout — makes no sound at all.

7. **The Settings tab tells the player the game has no audio.** Hard-coded, unconditional,
   in the shipped bundle (`src/ui/MenuModal.svelte:1206`, present verbatim in
   `dist/assets/slotapp-jk75g4yi.js:250`): *"This game has no audio yet — these settings are
   remembered, and apply the day sound lands."* Thirteen cues and a music bed ship. This is
   scaffolding left in the product.

8. **The free-spins symbol reads "FREE SPIN8".** The terminal `S` closes into an 8 at the
   emblem's rendered size — persistent across a 1.4s sample (`shots/wv-0.png`, `wv-6.png`,
   230ms apart ×10). Same on the trigger plaque: *"CONGRATULATION8"* (`shots/ff-03.png`,
   `ff-07.png`). The face itself is fine — the `?type` specimen renders `HARVEST TIME`
   correctly — so this is a size/kerning fault in `farmType.ts`'s stroked centre lines at
   small caps, on the single most important symbol in the game and on the first card a
   player sees.

9. **Chance figures in player copy.** ABOUT: *"Free spins lands 3 or more about 1 spin in
   451"*, *"once in 1,048,576 spins"*. RULES: *"free spins arrive about 1 in 4 spins instead
   of 1 in 451"*. Intro card: *"about one spin in thirty to one in ten"*.

10. **Identity holds on the board and nowhere else.** The reels, the frame, the dusk plate
    and the farmer are confident, cohesive, hand-drawn work. The loading screen is the studio
    splash (`shots/boot-nosession.png`), the control bar is Wild Wanted's byte-for-byte with
    a hue swap (`src/ui/bar/barTheme.ts:1-10`, `src/main.ts:9-13`), the menu button is the
    studio paw, and the rules/settings/about modal is the same dark chrome with green pills
    (`shots/c-menu.png`). Two thirds of the surfaces a reviewer sees are not this game's.

11. **Twelve of the thirteen shipped sound effects are byte-cut from Tiki Taka Madness.**
    Confirmed by hash: `reel_stop_thud.mp3` = `c15f8426…` = Tiki's *REEL STOP THUD - Dull,
    Dry Thump Hit 02*; both rollups likewise. 15 shipped assets in total are byte-identical
    to sibling-game files, three of them from inside `web-sdk/apps/*/static/` trees
    (`lilitaone.ttf`, the paw `pad.webp`, the `catnip.webp` loader mark). The mixing work in
    `sfx.ts` is real and measured; the material is not this game's.

12. **The maths pack is the strongest part of the build.** It is generated from the shipped
    modules rather than reimplemented (`build_slot_pack.mts:24-33`), which is the right
    architecture and is rare. All eight modes solve to exactly 96.500%; base non-zero hit
    rate 1 in 8.56 (just outside the checklist's "3–8", well inside "not > 20"); the RULES
    table agrees with the pack mode-for-mode on price, RTP and 50,000×. `src/game/config.ts`
    still carries a stale comment claiming Felix caps at 9,257× and *"does NOT reach the
    50,000×"* — the pack and the rules screen both say otherwise, and they are right.

13. Clean where it counts: zero `beforeunload`, zero 4xx/5xx across every screen, console
    clean on every route including `?lang=zzinvalid`, no external fetch origins, page does
    not scroll, filename law passes on 889 files, buy confirmation and autoplay confirmation
    both present, sound disableable from the UI.

## What I would tell the studio

Wire `createRgsClient(readStakeLaunch())` into `SlotApp` — authenticate on boot, `play` on
SPIN, `end-round` on settle — and delete `mulberry32` and `startingBalance` from the round
path. That one change is worth more than everything else on this list put together: it
turns eight dead compliance systems (currency, social, jurisdiction, bet levels, replay,
round resume, insufficient funds, idempotency) back on at once, and it is the difference
between a game and a demo.

## What I could not verify

- **Frame rate.** No GPU; SwiftShader only. My in-page probe recorded a 717ms median frame
  and a 1,728ms worst frame during free-spins entry — those numbers describe the container,
  not the game, and I will not quote them as a finding. Boot to reels-ready measured 11.0s
  at 1280×720 on software rendering; also not defensible as a real-hardware figure.
- **The 60-second request plateau** on each screen with cache disabled (Stage 8). Not run.
- **Popout S playability.** The intro adapts correctly at 400×225 (`shots/popS-2slot.png`),
  but I could not land a click on the door picker at that size, so the slot itself and its
  control bar at Popout S are unproven. Portrait at 420×860 loaded clean.
- **Ten wins per mode reconciled against the rules table.** I checked base wins only.
- **A valid non-English locale still translating.** `?lang=zzinvalid` loads in English with a
  clean console; I did not test `?lang=de` because there is no locale system to test.
- **Max-win and hit-rate figures at production sim counts.** My pack was 4,000 rounds per
  slot mode, not the 800,000 the builder defaults to; the Felix tables are the committed
  generator's own full run. The `CAP_PER_STAKE` finding does not depend on the sample — it
  is a declared constant — but the 1-in-8.56 base hit rate might move at full counts.
