# Wild Wanted — reviewer 2 (enthusiast)

SCORE: 2.33

## Why 2.33 and not 2.67

There is a real idea in this game and three fully-built scenes to house it — a
saloon, a bank vault you blow open with banked dynamite, and a desert street
where you shoot a stack of crates with a wheel-drawn number of bullets — and I
wanted to buy the vault again, which is the only test I actually trust. It is
not a 2.67 because I could not stop hearing *Mummy's Riches*: 52 of the 53 cues
in the shipped sound sheet are that game's Ancient Egypt pack at byte-identical
sprite offsets, so the outlaw enters his biggest feature to a mummy's roar,
shoots symbols to a sword swoosh, and breaks a crate in a Wild West shooting
gallery to the sound of a rock — there is not one gunshot anywhere in Wild
Wanted, and the base game lands all five reels on a single thud.

---

## How I ran it

Served the committed artefact
`/home/user/wildwanted-/web-sdk/apps/wild-wanted/build` (index.html md5
`1a4e4b1e4bd89852a1ef6a5a3b4d9bd6`, 6,820,548 bytes) over
`python3 -m http.server 8931`, driven with Playwright Chromium 1194 under
SwiftShader (`--use-angle=swiftshader`), no GPU.

That committed build is a **`--mode preview` build** — it contains the mock RGS
(`grep -c 'preview mock' index.html` → 1) and the 5.1 MB `previewBooks` pool, so
it plays standalone. That is what I played, and I say so wherever it matters.

Cue capture is a hook on `AudioBufferSourceNode.prototype.start` recording the
buffer offset of every sound the game actually starts, mapped back to a name
through `build/assets/audio/sounds.json`. It cannot be fooled by a broadcast
that never reaches the mixer.

Feature rounds were forced by re-writing `mode` on the outgoing
`/wallet/play` body after boot, so the shipped mock served a real book from the
real pool for that mode (`PLAYS [{"mode":"burstbonus",...}]`). I did not
hand-author any board.

**Test-run contamination, declared.** At 10:58 a stray `pnpm exec vite build`
was running in this container and overwrote `build/` with a production-mode
build. Three of my early runs (`explore`, `explore2`, `dbg`) hit that build,
which correctly has no mock and therefore died on `POST https://wallet/authenticate`
with a "Sorry, something went wrong" overlay. I killed the process, restored the
committed artefact with `git checkout HEAD -- web-sdk/apps/wild-wanted/build`
(`git status --porcelain` clean, md5 re-verified above) and re-ran everything.
No number below comes from the contaminated window. That accident was also
useful — see finding 12.

## Stage 0 — instrument proven

Booted to the loading splash in ~3 s and to an enabled PLAY button at
**17.6 s** (`BOOT_TO_PLAY_MS 17589`, SwiftShader). Screenshot
`shots/s0-30000.png`: the Wild Wanted wordmark, `MAX WIN 10,000×`, three carved
WANTED-poster cards naming BURST BONUS / FREE SPINS / SUPER FREE SPINS, a bull
skull on a post. Zero console errors, zero 4xx/5xx. It is the game.

---

## Blockers

These are the two findings I think could cost every reviewer a notch and drag
the panel average hard. Neither is a certain reject on its own.

1. **The FREE SPINS buy advertises a maximum win its own weight table cannot
   pay.** The $100 card reads `MAX WIN 10,000×` (screenshot
   `shots/ui2-paw.jpg`), the confirm copy reads *"Wins climb to the 10,000x
   max"* and *"Up to 10,000x"*
   (`web-sdk/packages/state-shared/src/constants.ts:234-292`, `maxWin: 10000` at
   line 292), and the rules table prints `FREE SPINS | 100× | 96.0% | 10,000×`.
   The shipped weights top out at **5,000×**:

   ```
   $ python3 … library/publish_files/lookUpTable_bonus_0.csv
   bonus  top payouts x: ['5,000x', '5,000x', '5,000x', '5,000x', '5,000x']
   base / boost / burstbonus / superbonus  top payout: 10,000x
   ```

   Every other mode reaches 10,000×. This one cannot, and it is claimed at the
   point of sale on a 100× purchase. That is displayed ≠ actual on money.

2. **The soundtrack is another shipped game's, in full.** `sounds.json`'s own
   `source` map, which ships in the artefact
   (`build/assets/audio/sounds.json`), names the origin of every cue:

   - `bgm_main` — *"BASE GAME MUSIC - Percussive **Ancient Egypt** Ambience Theme"*
   - `bgm_superfreespin` — *"**MUMMY** FEATURE MUSIC - Creepy Tense Orchestral Theme"*
   - `sfx_superfreespin` — *"**MUMMY VOICE** - Angry Roar Attack - Humanoid Creature - 02"*
   - `sfx_scatter_stop_1..5` — *"**ANCIENT EGYPT** SPECIAL REEL STOP"*
   - `sfx_winlevel_small..substantial` — *"**EGYPT** WIN TUNE - Achievement Payout Level 1-4"*
   - `sfx_sword_swing` — *"**Sword** Swoosh"*; `sfx_wild_explode` — *"**STONE** SYMBOL EXPLOSION"*
   - `sfx_btn_spin`, `sfx_bomb_explosion`, `sfx_reel_stop_1..5`,
     `sfx_anticipation`, `sfx_anticipation_start` — *"engine sprite (**Stake
     scaffold**)"*

   I did not take the labels on trust. Decoding both sheets in Chromium and
   correlating each sprite region against Mummy's Riches'
   (`/home/user/mummysriches/web-sdk/apps/mummy-madness/build/assets/audio/sounds.mp3`):

   ```
   ww cues 53 · mummy cues 52 · IDENTICAL offset+length: 52
   bgm_main            corrWithMummy=0.999   sfx_reel_stop_4     corr=1.000
   bgm_superfreespin   corr=0.996            sfx_btn_spin        corr=1.000
   sfx_scatter_stop_1  corr=0.999            sfx_btn_general     corr=1.000
   sfx_mummy_roar_c    corr=0.999            sfx_anticipation    corr=0.996
   ```

   Every cue except one correlates ≥ 0.983. The single exception is
   `bgm_burst` (92,250 ms, peak 1.0, rms 0.290) — one new music loop for the
   crate round, appended to the end of the sheet, and easily the best thing in
   it. Seven of the cues you hear on literally every spin are the Stake sample
   game's own. Nothing is silent; everything is somebody else's.

---

## Findings, ranked by what they cost me

**1. There is no gunshot in a game about shooting.** The Burst Bonus is a man
with a rifle firing at a stack of crates. A crate break broadcasts
`sfx_bomb_explosion` + `sfx_multiplier_explosion_a/b`
(`src/components/BurstCrates.svelte:172-181`) — Stake-scaffold thud and *"STONE
SYMBOL EXPLOSION - Big Rock Impact Burst"*. The dynamite throw in Super Free
Spins broadcasts `sfx_sword_swing`
(`src/components/DynamiteThrow.svelte:333`), and my capture confirms it fires on
essentially every SFS spin (`sfx_sword_swing@90925, @98768, @108560, @118191,
@138953, @145639, @156191`). The best moment in the game is the outlaw shooting
a crate apart and it sounds like a boulder.

**2. The base game lands five reels on one thud.** Twenty consecutive base
spins, fixed 8-second observation window each:

```
SUMMARY spins=20  spins_with_0_reelstops=0  spins_with_5=0  mean=1.05
S0 1 sfx_btn_spin,sfx_reel_stop_1,sfx_scatter_stop_1,sfx_winlevel_small,sfx_winlevel_nice
S7 1 sfx_btn_spin,sfx_reel_stop_1
S19 1 sfx_btn_spin,sfx_reel_stop_1
```

Exactly one reel-stop cue per spin, never five, on all twenty. Inside Free
Spins and Super Free Spins five fire per spin
(`sfx_reel_stop_1@95796 ×5`, `@85187 ×5`, `@104717 ×5`). Same renderer, same
session shape — the asymmetry points at the game, not at my box, though I
cannot fully exclude the software renderer collapsing the authored 155 ms base
stagger (`SPIN_OPTIONS_DEFAULT.reelSpinDelay: 155`,
`src/game/constants.ts:208`) into one frame where the feature's 205 ms
(`SPIN_OPTIONS_FEATURE`, line 235) survives. What is not ambiguous:
`sfx_reel_stop_2`, `_3`, `_4`, `_5` exist in the sheet, each ~240 ms with real
amplitude (peak 0.29–0.34), and appear **zero** times anywhere in `src/`
outside the type union and the debug catalogue. Only
`sfx_reel_stop_1` is wired (`src/game/stateGame.svelte.ts:217`). Five reels,
five authored samples, one used.

**3. The win tiers do not escalate at the top.** Measured from the decoded
sheet: `bgm_winlevel_mega` and `bgm_winlevel_superwin` are the same 12,310 ms
region (offset 149481, peak 1.0, rms 0.20309 — identical). `sfx_winlevel_substantial`
and `bgm_winlevel_big` are the same 8,894 ms region. `sfx_scatter_reveal` and
`jng_intro_fs` are the same 3,281 ms region, so the feature-entry jingle is the
scatter-reveal sting. A mega win and a superwin sound identical.

**4. "Lowest chips gone" is not true on screen.** The loading splash promises
*"SUPER FREE SPINS — Lowest chips gone"*, and the rules say *"The weakest chips
are removed: the two lowest-paying symbols do not appear on those reels at
all."* The strip agrees — `math-sdk/games/wild_wanted/reels/SFR0.csv` counts
`{L1:40, L2:35, L3:29}` with no L4 and no L5. My Super Free Spins board at
**FREE SPINS 10 OF 12** (`shots/superbonus2-12-t113865.jpg`) has the orange J
chip and the green 10 chip on it — L4 (`royal_j`, sampled dominant colour
`240,144,0`) and L5 (`royal_10`, `48,144,48`), per
`docs/ASSET-MANIFEST.md:125`. The shipped superbonus books carry them too
(`L4: 746`, `L5: 206` occurrences in the `superbonusBooks` segment of
`previewBooks.ts`). A rules claim contradicted by the board in front of me.

**5. Displayed RTP is a config label, not the pack.** The rules table prints
`96.0%` for all six modes; it is generated from `config.betModes[*].rtp`
(`src/components/MenuModal.svelte:283-296`, `rtpPct = (m.rtp*100).toFixed(1)`),
which is hardcoded `0.96` in `src/game/config.ts:141-207`. The shipped weight
tables give **96.500%** for every mode:

```
base 96.500 · boost 289.500/3 · enhancer 2895/30 · bonus 9650/100
burstbonus 5790/60 · superbonus 24125/250   → all exactly 96.500%
```

Understated in the player's favour, but still displayed ≠ actual on the number
Stake checks first.

**6. The identity stops at the canvas edge.** The board, the saloon, the vault
and the crate yard are all bespoke and coherent. Every modal is stock SDK: the
Bonus Buy shop is generic dark-blue chrome with blue BUY buttons
(`shots/ui2-paw.jpg`), and the settings sheet is `MASTER 75% | MUSIC 75% |
SOUND 75% | GAME INFO` with no theming at all. There is a wooden, rope-bound,
bullet-holed plaque language established in-game and none of it reaches the
surfaces where the player spends money.

**7. The payline set was lifted from a named competitor.** `game_config.py:51-64`:
*"Jake, 2026-08-22: 'I want to use the exact same paylines as Gold cash free'
… tools/extract_paylines.py, which reads the competitor's paytable screen, and
docs/goldcash-40-paylines.txt for the captured output. All forty were …"*. Line
geometry is not much of an asset, but Stake grades this axis on originality and
this is the opposite of it.

**8. The anticipation is the sample game's rig.** `assets/spines/anticipation/anticipation.atlas`
and `.json` are byte-identical to
`graveyard-shift/web-sdk/apps/price/static/assets/spines/anticipation/` (md5
`a76d3375…` and `d16c92a9…`). The texture was replaced; the skeleton was not.
Its sound (`sfx_anticipation`, `sfx_anticipation_start`) is the scaffold's too.
The single most important tease beat in a slot is stock, top to bottom.

**9. The base session is thin — with a caveat that cuts in the game's favour.**
Thirty base spins gave me one anticipation, four scatter stops and two win
jingles; twenty more gave two win jingles. That is the preview pool, and
`previewBooks.ts` says so in its own header: *"zero 93.538% … SMOKE-RUN BOOKS …
RATES BELOW ARE INDICATIVE, NOT THE SHIPPED ODDS"*. The shipped weights are
much healthier — **non-zero 1 in 5.27** in base, 1 in 4.52 in boost. So I am
discounting my own dead run. What I am not discounting: across all fifty base
spins I never once wanted the next one. Everything I wanted was in the buy menu.

**10. German translates the headings and not the body.** `?lang=de` renders
`FREISPIELE`, `SUPER-FREISPIELE`, `BURST-BONUS` — and leaves the feature copy in
English: *"Shoot the crates. Every hit pays a multiplier of your bet."*,
*"The outlaw shoots symbols and turns them wild."*

**11. Idle is not quite a plateau.** With the game parked at idle for 60 s I
counted **20 further requests** after boot (boot itself: 290). Not the
per-frame `<img>` swap Stake calls out, but it is not zero and I did not
attribute them.

**12. The committed build is a preview build.** `build/` is force-tracked
(`.gitignore:6-9`, *"Vercel serves the prebuilt bundle directly"*) and it
carries the mock RGS, the 5.1 MB preview book pool and the `__mmCueLog` /
`__WW_ENTRANCE__` / `__WW_BOSS_CLIP__` / `__WW_BURST_OUTRO__` globals. That is
the deployed demo, not necessarily the Stake upload — see the credit below.

---

## What is genuinely good, and I want it on the record

- **Burst Bonus is a real invention.** A wheel draws 4–8 shots, you shoot
  crates, a break pays and damage wastes the bullet, AUTO SHOOT takes the rest
  if you want out, and the rules honestly tell you the prize order was fixed at
  purchase. That is a named mechanic a player can describe to a friend, which is
  precisely what Stage 3 asks for. `shots/burstbonus2-06-t59719.jpg`,
  `-10-t109380.jpg` — a sheriff's office, a mine head-frame, `SHOTS LEFT 6 OF 6`
  on a wooden sign, `CRATE TOTAL 3X`, coins spilling from a broken crate.
- **Three feature scenes, all built.** Saloon (`shots/bonus2-09-t134344.jpg`),
  bank vault with a caged gold pile that gets blown apart across the round
  (`shots/superbonus2-05` intact → `-12` smashed), crate yard. Free-spin
  counters are in-world objects — a poster on the saloon wall, a padlock tag on
  a wall of deposit boxes. Nobody phoning this in builds three scenes.
- **The maths is clean.** All six modes at exactly **96.500%**; base non-zero
  **1 in 5.27**; 10,000× reachable in base at **1 in 1,000,000**, in superbonus
  at 1 in 4,000, in burstbonus at 1 in 16,667. Mode costs 1/3/30/60/100/250
  match `index.json`, `config.ts` and the shop cards exactly. No payout gaps.
- **Three real turbo tiers, and they are reasoned.** `reelSpinDelay` 155 → 50 →
  0, the anticipation extra-hold cut to **zero** at double bolt
  (`src/game/stateGame.svelte.ts:325-330`), and a documented fix for a
  ladder-inversion bug where double bolt was slower than single. Speed is
  respected here, which is more than the studio's last two managed.
- **The production build is clean.** I built it (accidentally, then
  deliberately re-checked the artefact) and grepped it: `preview mock` 0,
  `devMockAuth` 0, `previewBooks` 0, `__WW_AUDIT__` 0, `POSITION DEBUG` 0,
  `__mmCueLog` 0 — all dead-code-eliminated, 6.7 MB bundle down to 1.6 MB.
  `COMPLIANCE.md`-style claims verified against the artefact for once, and they
  held.
- **Layout.** Popout S 400×225 playable with every control in frame
  (`shots/lay-popoutS.jpg`); portrait 430×932 is a genuinely different layout
  with a radial control cluster, not a squashed desktop
  (`shots/lay-portrait.jpg`). `scrollWidth == clientWidth` and
  `scrollHeight == clientHeight` in all three; zero console errors in all three.
- **Filenames.** Three capitalised names in 424 files, all vite content hashes;
  zero spaces; zero capitals in any asset or folder.
- **Copy.** Zero emoji-range characters in the built `index.html`. Full
  seven-point disclaimer, translated. Sound disableable from the UI. Rules cover
  every mechanic including the Plunger, the revolvers, the dynamite bank, the
  cage and AUTO SHOOT, with no hit-rate or probability numbers. `?social=true`
  rewrites *"Every hit pays a multiplier of your bet"* → *"Every hit **wins** a
  multiplier of your **spin**"* with zero restricted words in the rendered
  splash. `?lang=zzinvalid` loads English with zero console errors.

---

## What I would tell the studio

**Make the six sounds this game actually needs, starting with a gunshot.**

Not the whole sheet — six cues: the five reel stops as a rising set (the slots
already exist and are already loaded), the spin press, the wild-shot, the crate
break, the scatter stop, and the feature-entry sting. If the outlaw's shot were
a revolver crack with a shell casing, and a crate broke into splintering wood
and a ricochet off the mine head-frame, and five reels landed on five rising
thuds instead of one, this game would sound like the thing it looks like and I
would be at 2.67. You have already proved you can do it: `bgm_burst` is 92
seconds of bespoke music and it is the best cue in the build. Everything else
you hear belongs to *Mummy's Riches*.

---

## What I could not verify

- **Frame rate and worst-frame duration.** No GPU; SwiftShader. Every wall-clock
  figure in this review is inflated and I have not quoted an fps number
  anywhere. My own screenshots cost 15–20 s each at 1280×720, which is why the
  first feature run reported a 142 s round. Pacing conclusions above are drawn
  from the authored constants (`src/game/constants.ts:185-322`), not a
  stopwatch. Perf at phase transitions — boot, feature entry, feature exit, big
  win — is **unproven ground**.
- **Whether the base reel-stop asymmetry is the game or the renderer.** I have
  20/20 base spins at one cue and every feature spin at five under an identical
  renderer, which is strong, but a 60 fps box would settle it in one run.
- **Big-win and max-win presentation.** No round I played escalated past
  `sfx_winlevel_standard`. I never saw a 500× or a 10,000× presented, so
  "is win presentation proportional" is unproven.
- **The Stake upload itself.** `pnpm build:stake` produces the shipping zip via
  `build_production.mjs` + `zip_stake_upload.mjs`; no zip exists at 287fca0. I
  reviewed the committed preview build plus a production-mode build I made
  myself. The post-processing steps in `build_production.mjs` (orphaned-CSS
  prune, etc.) are unverified.
- **Social-mode scrub of the rules and buy modals.** My social run only reached
  the loading splash before the rules click; I scanned the splash (clean) and
  the normal-mode rules (contains `pay/pays/paytable/bet/buy` as expected in
  real-money mode). **The scrubbed rules and shop text in social mode are
  unverified**, as are baked sprites and the bitmap alphabet, which cannot be
  scrubbed at all.
- **Session and replay.** I did not test refresh mid-spin, mid-count-up or
  mid-feature, `beforeunload` handlers, round restore, or the replay route.
  Unproven.
- **RGS money integrity in anger.** I read the call sites
  (`packages/rgs-requests/src/rgs-requests.ts` — authenticate / play /
  end-round, plus `balanceUpdate` and `roundActive` CustomEvents for the lobby)
  and confirmed the bet levels come from the authenticate response, but the
  mock is the only wallet I had. Insufficient-funds behaviour, max-bet snapping,
  the idempotency guard and autoplay's affordability stop are **unverified**.
- **`books_*.jsonl.zst`** are referenced by `library/publish_files/index.json`
  and are not in the repo, so I reconciled odds from the weight tables only.
