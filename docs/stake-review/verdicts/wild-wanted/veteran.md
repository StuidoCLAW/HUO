# Wild Wanted — reviewer 1 (veteran)

SCORE: 1.67

**Why 1.67 and not 2.00.** The art, the maths and the compliance work are all at
2.33 level, and I built the production artefact myself to check rather than take
the repo's word for it — it is clean. But the sound design of this game does not
exist: 52 of its 53 cues are Mummy's Riches' Egyptian bank, unchanged, playing
under a saloon, and the studio's own source says so in as many words. A build
that is waiting on a sound pass is not a finished game, and the rules screen and
the buy cards state an RTP and a max win the shipped maths pack does not have.

---

## Stage 0 — instrument

Launched the committed artefact at 287fca0 with Playwright/Chromium (software
rendering, SwiftShader, no GPU). `python3 -m http.server` over
`web-sdk/apps/wild-wanted/build/`, screenshot at 25 s: Wild Wanted splash, logo,
`MAX WIN 10,000×`, three feature cards, PLAY. Confirmed it is the game.

Two builds were exercised and they are not the same artefact:

- **The committed `build/` is a `--mode preview` build** (6,820,548 B
  `index.html`; console on load prints `[rgsMock] installed — PREVIEW (base mode
  synthesised from previewBooks, no backend)`). All play-through below is on
  this build, driven by that mock RGS and by its `window.__wwForce` hook. I did
  not play a live RGS session and do not claim to have.
- **I ran `node tools/build_production.mjs` myself** to get the real submission
  artefact (1,711,905 B `index.html`, `bundle.b_ySrsp9.js`). Every compliance
  and cleanliness claim below that says "production" was measured on that.

---

## Blockers

None. Nothing here drags a panel average toward 1.0. The two number errors below
are hard reviewer items but they are corrections, not rejections.

I checked the one thing that would have been a blocker and it holds up. The
mock RGS in `src/hooks.client.ts` monkeypatches `window.fetch` and synthesises
`/wallet/authenticate`, `/wallet/play`, `/wallet/end-round` and `/bet/replay/`,
with force hooks (`__wwForce`, `__wwForceIndex`, `__wwSymbolWin`, `?forceBook=`).
It is live in the committed preview build. It dead-code-eliminates from the
production build — verified, not assumed:

```
grep -rlF -- '<tok>' build/   # after tools/build_production.mjs
rgsMock, previewBooks, devMock, wwForce, DebugPanel,
'POSITION DEBUG', __WW_AUDIT__, __PIXI_APP__  →  all zero hits
tools/verify_stake_clean.mjs → PASS — no dev routes/tokens, filename law OK
```

This is the opposite of the Slot O' Verse outcome and the studio deserves the
credit for it.

---

## Findings, ranked by what they cost me

### 1. The audio is another game's, entire, and the repo knows it

`build/assets/audio/sounds.json` holds 53 sprite regions. **52 of them sit at
byte-identical offsets and lengths to Mummy's Riches'
`mummy-madness/build/assets/audio/sounds.json`.** Only `bgm_burst` is new.

Decoded both `.ogg` files in Chromium and fingerprinted every region
(8-bin normalised RMS envelope per cue):

```
identical-audio regions 52, differing 0, only-in-wild-wanted 1
mean rms ratio ww/mm = 0.9513      (a uniform re-encode level offset)
```

The manifest's own `source` field names what each cue is:

- `bgm_main` → `"BASE GAME MUSIC - Percussive Ancient Egypt Ambience Theme - Loop"`
- `bgm_freespin` → `"FREE GAMES MUSIC - Ancient Egypt Feature Theme Full Version"`
- `sfx_door_drag` → `"Huge Stone Door Open - Big Rock Concrete Block Drag"`
- `sfx_mummy_roar` ×4, `sfx_mummy_step` ×2, `sfx_sword_swing`, `sfx_wall_smash`

That is the base-game music of a Wild West cowboy slot. Twelve of those cues are
for the mummy mechanics deleted on 2026-09-02 and they still ship.

`src/game/soundCatalogue.ts:101-104` states it plainly:

> "(A 'THE MUMMY HIMSELF' group listed the donor's roar pool, footfalls and
> tomb-door drag here. Nothing asks for those regions since the mummy mechanic
> was deleted on 2026-09-02; they stay packed in the sprite, which **is still
> Mummy's Riches' audio until the sound pass replaces it**.)"

10.5 MB — `sounds.mp3` 5.83 MB plus `sounds.ogg` 4.66 MB, 23% of the 45 MB
build — is the wrong game's sound.

To be fair to it: the audio is *wired* well. A forced free-spins entry produced,
in order, sprite offsets `279117` (anticipation bed), `187517 / 190518 / 193518`
(three ascending scatter stops), `206305` (trigger sting), `209425` (splash
fanfare), `49000` (feature bed). That is a properly authored feature-entry chain.
It is simply another studio's samples playing it.

### 2. The one original cue is clipped

`bgm_burst` decodes to a peak of **1.0291** — above 0 dBFS. It is compensated in
`sounds.json` with `"bgm_burst": {"volume": 0.55}` and `soundCatalogue.ts:32`
records why ("mastered far hotter than the rest of this pack"). Turning a track
down in the sprite is not the same as mastering it.

### 3. FREE SPINS advertises a max win its own pack cannot pay

The buy card and the rules table both print **MAX WIN 10,000×** for the 100×
FREE SPINS mode (screenshot `z-jpy-buy.png`; `src/game/config.ts:156`
`max_win: 10000` → `MenuModal.svelte:264,294,699`).

The shipped weights top out at half that:

```
math-sdk/games/wild_wanted/library/publish_files/lookUpTable_bonus_0.csv
  max payout 500000 / 100 = 5,000×      (every other mode reaches 10,000×)
library/stats_summary.json  "bonus": { "max_win": 500000.0 }
```

`tools/verify_maxwin_sync.mjs` reports
`PASS — ... bonus=10,000x ...` because it compares `config.ts` to
`game_config.py` — two mirrors of the same wrong number. It never reconciles
against the simulated pack. That is the same "the document asserts the opposite
of the artefact" failure the studio has been bitten by before, wearing a gate.

`MenuModal.svelte:249-250` even carries the correct fact in a comment — "The
caps DIFFER by mode — 10,000× everywhere except Buy Free Spins, which caps at
5,000×" — and then reads 10,000 out of config anyway.

### 4. Displayed RTP is 96.0%; the pack is 96.5%

`config.ts:30,141,148,155,177,195,206` all carry `rtp: 0.96`.
`MenuModal.svelte:283` prints `(m.rtp * 100).toFixed(1)` → **96.0%** on every
row of the per-mode table.

Computed from the six shipped `publish_files/lookUpTable_*_0.csv`, weight-mean
payout ÷ mode cost:

| mode | cost | RTP |
|---|---|---|
| base | 1 | 96.50% |
| boost | 3 | 96.50% |
| enhancer | 30 | 96.50% |
| burstbonus | 60 | 96.50% |
| bonus | 100 | 96.50% |
| superbonus | 250 | 96.50% |

`library/stats_summary.json` agrees: `"rtp": 0.965` in all six. Displayed ≠
actual on the number Stake checks, in a game whose own config comment says
"Stake checks displayed == actual".

### 5. The identity stops at the edge of the reels

The board, frame, backgrounds, plaques, splash cards and loading screen are
properly themed and well drawn — wooden frame with bullet holes, rope logo,
sheriff-star plaques, a saloon interior for free spins, a Spriter-rigged outlaw
who reacts.

Then:

- **The control bar is stock SDK.** Navy-blue glossy pill, blue circular spin
  button, blue turbo/autoplay chips, blue paw tile — on screen for the whole
  session, against a warm cartoon desert (`ses2-spin09.png`, `v3-menu.png`).
- **The BONUS BUY panel is stock SDK.** Charcoal cards, dotted dark backdrop,
  royal-blue BUY buttons, no wood, no rope, no parchment
  (`z-jpy-buy.png`). This is the screen where a player decides to spend 250×
  their bet, and it is the SDK default with symbol thumbnails dropped in. The
  three splash cards selling those same features are fully themed; the menu they
  sell is not.
- **The menu sheet is stock SDK** — dark navy panel, blue sliders (`v3-menu.png`).
- The buy CTA is a **cat paw** (`src/game/assets.ts:226-234`, the studio mark).
  It is the one thing on screen that belongs to no Wild West vocabulary.

### 6. BIG WIN starts at 15×

`src/game/winLevelMap.ts:83-84`: "level 5 is 5x-15x and level 6 (15x+)". On a
10,000× game. First forced free-spins round, first spin, $1.00 bet: a
full-screen rope-and-sheriff-star plaque reading **BIG WIN $24.00**, gold rays,
coin shower and a PRESS ANYWHERE TO CONTINUE gate (`f-superCage-30000.png`). The
ladder has ten tiers and the ceremony is good; its entry point is set so low the
escalation stops meaning anything inside a ten-minute test.

Same frame: the HUD win field reads `WIN $0.00` while the plaque reads $24.00.
It settles to $24.00 afterwards (`f-superCage-60000.png`), but the two disagree
on screen during the presentation.

### 7. Non-English locales leave the first screen half-translated

`?lang=de` renders:

> "MAX WIN 10,000× BURST-BONUS **Shoot the crates. Every hit pays a multiplier of
> your bet.** FREISPIELE **The outlaw shoots symbols and turns them wild.**
> SUPER-FREISPIELE **Lowest chips gone. Blow the vault and take the gold.** PLAY"

Titles translate, descriptions and PLAY do not. The three description strings
are absent from `src/i18n/messagesMap/de.ts` (grep count 0 for each). Three of
six visible strings, on the game's first screen, in every non-English locale.

The same file still carries copy for mechanics that were cut — `'The Brute slams
the floor and deals a fresh board.'`, `'Sticky wilds level up and the multiplier
never resets.'`, `'EXPANDING WILD'` — which ships in the production bundle and
tells you the locale pack was never re-cut for this game.

### 8. Handlers for deleted mechanics ship in the production bundle

`mummySmash`, `mummyNudge`, `mummyWildLevelUp`, `pyramidDescend`, `wildExpand`
and `bombDetonate` are live in the minified `bookEventHandlerMap` in the
**production** `index.html` and `bundle.b_ySrsp9.js`. The maths pack's own
readme (`math-sdk/games/wild_wanted/readme.txt:44`) says this is deliberate and
names the consequence:

> "The FRONT END STILL HANDLES BOTH, deliberately... So a stray event does not
> error in the client — it REPLAYS, animating a mechanic the maths never ran.
> The verifier is the only thing between that and a reviewer."

A client that will happily animate a mechanic the server cannot produce is a
liability held shut by a lint rule.

### 9. 26.8 MiB and 230 requests before the game is playable

Production build, served locally, time from navigation to the PLAY button
becoming enabled:

```
[BOOT production] ms-to-PLAY-enabled=71905  requests=230  bytes=28,071,310 (26.8 MiB)
[BOOT preview]    ms-to-PLAY-enabled=56986  requests=229  bytes=33,126,981 (31.6 MiB)
```

Total build 45 MB / 422 files. Largest: `sounds.mp3` 5.83 MB + `sounds.ogg`
4.66 MB (both shipped), `assets/rig` 15 MB (three near-identical outlaw Spriter
rigs at ~1.3 MB of SCML each), `assets/symbols` 8.3 MB.

Requests do **not** plateau on a 60 s park: 209 → 326 while sitting idle on the
board. Every one of those 117 is a distinct asset requested once
(`background-portrait.webp`, `connect-wild-vault.webp`, `building-saloon.webp`
…), so this is a long lazy-preload tail, not the per-frame `<img>` churn the
checklist warns about. It is still a game that is downloading itself for over
80 seconds.

### 10. 22 assets byte-identical to Mummy's Riches

Fonts, OFL licences, the Catnip loader mark and the SDK's spin/turbo/autospin
glyphs are legitimately shared. These are not:

```
symbols/wild_cell_bg.webp
symbols/connect_wild_frame.webp
symbols/connect_wild_plaque.webp
win/mountain_of_coins.webp
frame/tile-dark.webp
coins/coin.png + coin.json
spines/anticipation/{anticipation.json,.atlas,.webp}
```

The anticipation animation, the wild cell backing and the big-win coin art are
the previous game's.

### 11. Composition clips at 16:9

At 1280×720 the outlaw's arm is cut by the right edge of the viewport and the
SALOON / BANK signage is cut on both sides (`ses2-spin09.png`). It may be an
intentional lean-in; it reads as unframed.

---

## What is genuinely finished, and I want it on the record

- **Maths.** Six modes, all six at exactly 96.5%. Base non-zero hit rate
  1-in-5.27, boost 1-in-4.52 — both inside Stake's band. Max win 10,000×
  reachable at 1-in-7,964,000 in superbonus and 1-in-20,600,000 in enhancer. No
  payout gap. Mode costs (1/3/30/60/100/250) match the buy cards and the rules
  table exactly. Reels generated for this game, wild and scatter forced to
  singles so near-misses are not manufactured.
- **Money handling.** No balance capping of bet levels
  (`stateBet.svelte.ts:51-53`); affordability is `betAmount × costMultiplier ≤
  balanceAmount` (`BonusCards.svelte:43-44`); the buy button is deliberately not
  disabled on a shortfall, it opens a shortfall dialog (`:50-51,61`). Round
  restore gated on `resumeRound.active === true`
  (`Authenticate.svelte:34`). Balance and bet floored to exactly 2 dp in every
  currency, wins 2–4 dp floored, never rounded up — with the $147.70/$147.69
  scar written into `utils-shared/amount.ts:90-99`. Confirmed live:
  `?ccy=JPY` renders `¥100,000.00` and `¥250.00`.
- **Social and locale.** `?social=true` rewrites "Every hit **pays** a multiplier
  of your **bet**" to "Every hit **wins** a multiplier of your **spin**"; zero
  banned tokens in the rendered output, splash or board. `?social=true&lang=de`
  renders English. `?lang=zzinvalid` loads English with **zero console errors**.
  The scrub table covers inflected forms, not just lemmas, and excludes `stake`
  with a stated reason.
- **The Mummy's Riches capping defect is fixed.** The board's win-beat cap is
  derived per winning symbol via `winBeatMsFor` rather than a global number;
  `tools/verify_win_beat_cap.mjs` PASSES and prints what the old global cap would
  have done to each of the six authored beats.
- Turbo genuinely tiers three ways on `turboLevel`, not on a boolean
  (`src/game/turbo.ts`, `verify_spin_tiers` PASS).
- Production build served from a sub-path: **zero 4xx/5xx**. Zero external
  origins in the bundle. No spaces or capitals under `assets/`. `<title>` present.
  `canvas { display: block }`, page never scrolls at 1280×720, 414×896 or
  400×225.
- **Zero console errors and zero uncaught exceptions** across boot, twenty base
  spins, a forced free-spins round, a forced cage round, the menu, the buy panel,
  five locale/social permutations and three currencies.

---

## What I would tell the studio

**Cut a Wild West sound pack and delete the twelve mummy regions from the
sprite.** One change. The base bed, the five reel stops and the win ladder are
what a reviewer hears for nine minutes of a ten-minute session, and right now
they hear Egypt. Everything else in this build is already at the level I would
score 2.33; the audio is the only thing keeping it at "waiting on a pass". Fix
that and I move a notch, and I would not need to see anything else changed to
do it.

---

## What I could not verify

- **Frame rate.** No GPU; SwiftShader software rendering. My rAF loop recorded
  161 frames in 300 s. That number is my container, not the game, and I will not
  quote an fps figure from it. Long tasks ran 1.0–2.7 s in the base game and
  2.1–4.7 s in free spins — the ~1.5× relative degradation at feature entry is
  the only performance signal I would defend, and only as a relative one.
  Someone needs to run this on real silicon, and on a low-end phone, before
  anybody says it is fast.
- **Reel-stop stagger.** Audio instrumentation showed four or five
  `sfx_reel_stop_1` starts inside the same millisecond. At 0.5–2 fps the game
  fast-forwards several staggered timers into one tick, so I cannot separate
  "the reels stop together" from an artefact of my environment. Worth a look on
  a real machine — and note that only `sfx_reel_stop_1` ever fired; the other
  four variants in the sprite were never used in any run.
- **Live RGS.** Everything I played went through the preview build's mock. I did
  not observe a real `authenticate`, a real bet-level list, an insufficient-funds
  path, autoplay's affordability stop, or a double-pay idempotency guard against
  a live wallet. Those are read from source above, not exercised.
- **BURST BONUS and the enhancer round.** Never reached. `hooks.client.ts:281`
  says `burstbonus` books are "Empty until `extract_preview_books.py` is re-run",
  so a burst buy in preview cannot play a crate round at all. The mechanic on the
  first splash card is the one I could not see.
- **Popout S (400×225) in play.** Page does not scroll and the canvas fits
  exactly, but the entire in-game UI is PIXI-drawn — the board dumps zero HTML
  controls — so I could not traverse the stage and compare control bounds against
  the viewport. Unproven ground.
- **Replay.** `?replay=true&mode=bonus&event=3` was cut short when my run was
  interrupted; I did not see a replay play back, and I did not test
  replay-again or the bet-cost display.
- **Refresh mid-spin / mid-count-up.** Same interruption. `beforeunload` in the
  bundle is SvelteKit's router and only fires `preventDefault` on a cancelled
  navigation, so I expect no dialog — but I did not watch a resume happen.
- **Sample-game asset overlap.** `web-sdk/apps/` contains only `wild-wanted`;
  there is no SDK sample game in this repo to hash against. The Mummy's Riches
  comparison above is the closest I could get.
- **Audio in a real session.** Chromium ran with `--mute-audio`. I instrumented
  `AudioBufferSourceNode.start()` and mapped every offset back to the sprite, so
  I know exactly which cue fired and when. I did not listen to it.
