# Vegan Spins — reviewer #2 (plays it, sound on, throttled)

SCORE: 1.33

## Why 1.33 and not 1.67

I played this for the length of a review session with the sound turned up and
heard nothing at all — not a spin, not a reel stop, not the MEGA WIN, not the
Super Free Spins fanfare — and when I opened the settings tab to check my own
speakers the game told me in its own words that it has no audio, under two
volume sliders that move and do nothing. Everything above the silence is real
and better than this studio's last three games — the win ladder is proportional
and skippable, one-shot clips are windowed off their authored lengths rather
than a flat hold, and the art is the best thing here — but a slot that spins in
silence is a slot that is not finished, and no amount of good animation climbs
back over that.

## Blockers

1. **The game ships completely silent. Not placeholder audio — no audio.**
   Verified against the built artefact, not the source:

   ```
   $ find dist -type f \( -iname '*.mp3' -o -iname '*.ogg' -o -iname '*.wav' \
       -o -iname '*.m4a' -o -iname '*.aac' -o -iname '*.opus' -o -iname '*.flac' \) | wc -l
   0
   $ grep -c -rE "AudioContext|new Audio\(|createOscillator|decodeAudioData|createBufferSource" dist/assets/*.js
   0
   $ grep -c -rE "<audio|createElement\(['\"]audio" dist/
   0
   ```

   No audio dependency either — `package.json` carries `pixi.js` and nothing
   else at runtime; no `@pixi/sound`, no `howler`. No `data:audio` URI anywhere.
   The only media in `dist/` is `door_view_slot.webm` and `door_view_flight.webm`,
   both **VP8 video-only** (no `A_VORBIS` / `A_OPUS` track marker), plus an
   unreferenced 3.5 MB `assets/FsSymbol.mp4` (avc1, video-only) that nothing in
   `src/` points at.

   This is worse than the corpus precedent. Into The Slot O' Verse shipped
   eleven cues of which nine were the same 4,044-byte file of digital silence,
   and one reviewer scored it **1.33**. Space Odyssey scored **1.33** for the
   same axis. This game ships **zero** cues, so there is not even a silent file
   to hash.

   `src/game/sound.svelte.ts:1-7` states it outright:

   > *"THE MIXER — what the game will be allowed to make a noise with. Orrin,
   > 1 September: 'do the sound controls now — we do have no audio currently but
   > this will change.' … **nothing here plays anything**"*

2. **The sound controls are live controls that control nothing, and the product
   says so on screen.** `src/ui/MenuModal.svelte:1054-1130` renders a master
   On/Off, independent Music and Effects channels, two volume sliders and a live
   percentage readout. `gainOf()` (`sound.svelte.ts:143-144`) folds four rules
   into one number that no caller consumes. Beneath them,
   `MenuModal.svelte:1124-1129` prints to the player:

   > *"This game has no audio yet — these settings are remembered, and apply the
   > day sound lands."*

   The honesty is decent engineering and it is the worst possible thing for a
   reviewer to read: it removes any chance I blame my own machine.
   `docs/QA-LOG-2026-08-26.md:307` logged this as S3-2 against autoplay *and*
   sound. Autoplay has since been built (`src/game/slots/autoplay.ts`,
   `src/ui/AutoplayPanel.svelte`, stop conditions, jurisdiction gate at
   `SlotApp.svelte:2354-2364`). Sound has not.

3. **Every player-visible event has nothing attached.** I drove each of these in
   the built bundle and mapped it to its cue. The cue column is empty in all
   twenty cases:

   | Event | Where I hit it | Cue |
   |---|---|---|
   | Boot / loader | Catnip splash, 400-image warm | — |
   | Intro card flip, NEXT | `IntroScreen.svelte` | — |
   | PLAY plaque press | intro → door picker | — |
   | Door pick (two live video previews) | `SLOT_DOOR_VIEW` | — |
   | SPIN press | control-bar canvas | — |
   | Reel ramp / blur | `spinMotion.ts` | — |
   | Each of 5 reel stops | left-to-right land | — |
   | Near-miss anticipation | `nearMissTease.ts`, forced "2 — near miss" | — |
   | Scatter (wreath) land | `scatter.ts` | — |
   | Line-win highlight + per-line parade | `winCycle.ts` | — |
   | Win rungs 2-5 (meter only) | `WIN_LADDER` levels 2-5 | — |
   | BIG / SUPER / MEGA / EPIC / MAX banner | forced 5× Red chilli → MEGA WIN | — |
   | Coin shower | `coinShower.ts` | — |
   | Free Spins entry plaque | forced 5 scatters → "SUPER FREE SPINS WON" | — |
   | Free Spins / Super Free Spins ambience | night-sky mode | — |
   | Expanding-wild duel: shot, egg, KO stars, verdict | `DuelScene.svelte` | — |
   | The shot (1/3/6 crops) | `theShot.ts` | — |
   | The eggs / board of wilds | `theEgg.ts` | — |
   | Tractor wipe | `tractorWipe.ts` | — |
   | Feature exit / return to base | `featureReturn.ts` | — |

   The two that hurt most are the free-spins entry and the MEGA WIN. Both are
   otherwise well staged — and both play out in total silence.

4. **The slot has no published maths pack, and the repo's own test says so.**
   `npm test` at HEAD: **1 failed | 901 passed | 1 skipped (903)**. The failure
   is `src/game/slots/mathPack.test.ts:43`, "index.json modes vs config.ts
   BET_MODES":

   ```
   $ python3 -c "import json; print([m['name'] for m in
       json.load(open('math-sdk/games/vegan_spins/library/publish_files/index.json'))['modes']])"
   ['felixBase', 'felixEnhanced', 'felixSuperEnhanced']
   ```

   The five modes the cabinet actually charges for — `base`, `bonusEnhancer`,
   `featureEnhancer`, `freeSpins`, `superFreeSpins` — are absent from the pack.
   Only Felix's Flight has one. Correspondingly the slot is not wired to the
   RGS: `$stake/rgs` is imported by nothing in the app, and
   `SlotApp.svelte:214-221` is explicit — *"A DEMO WALLET … nothing is wagered
   anywhere, no round is booked, and `$stake/rgs` is where the real one
   arrives."* Every number I saw came from a client-side simulation.

5. **A debug menu ships in the production build.** `?force-event` on the built
   bundle opens a plain-DOM force panel with 21 buttons — scatter triggers, line
   wins, the duel, the shot, the eggs (`src/ui/ForcePanel.svelte:46-52`,
   `src/game/slots/force.ts:308-348`). I used it for this entire review, which
   is the point: I did not have to build anything. `vite.config.ts:66-70` also
   ships `wild-preview` as a build input, described in its own comment as "a
   debug rig — and a deliberate one". Slot O' Verse's dev-gated code reaching
   the production bundle is the standing precedent for how this reads.

## Findings

6. **Boot fetches 400 images before the PLAY button is pressable.** Measured on
   the built bundle over localhost, so no network latency is included:

   ```
   PLAY-ready : 23.0 s / 23.7 s / 27.8 s   (three runs, no CPU throttle)
   requests   : 465  (html 1, js 28, css 7, png 400, webp 9, json 10, fonts 4)
   bytes      : 19.1 MB
   ```

   Reading the IHDR of exactly those 400 PNGs: **134.7 megapixels — 514 MB of
   RGBA if all resident**. `swipe.png` at 2171×1399 is fetched five separate
   times. Across `dist/` there are **271 byte-identical duplicate PNGs in 67
   hash groups** (`find dist -name '*.png' -exec md5sum {} + | sort | uniq -c -w32`)
   — the same `__status_effect_01__ko_*` frames copied into nine rig folders,
   each one its own request and its own decode. `dist/` totals 60 MB.

   A repeatable single main-thread long task of **3,528 / 3,426 / 3,721 ms**
   lands during boot in all three runs. That is the shape of the Mummy's Riches
   3.7 s frozen frame. I cannot claim it survives on a real GPU — see §"could
   not verify" — but the request and pixel counts are hardware-independent and
   they are what I would open first.

   Ruled out as the cause: rig JSON parsing. All 21 MB of it parses in **174 ms**
   with no WebGL context in the page (worst single file 10 ms,
   `broccoli_friendly.anim.json`). The cost is image decode and upload, not
   parse.

7. **The expanding-wild duel does not tier on turbo.** `SlotApp.svelte:2241`
   passes `beatScale={duelScale}`, and `duelScale` (`SlotApp.svelte:144-146`) is
   `import.meta.env.DEV ? … : 1` — a dev-only URL knob, pinned to 1 in every
   build a player touches. `duelMs()` (`expandingWild.ts:1537-1541`) over
   `DUEL_BEATS` (`:1483-1530`) sums to **5,017 ms when the rival wins and
   5,417 ms when the hen does**, identical at turbo off, single and double. It
   is a cosmetic beat that gates what the wild reel is worth, and it is the one
   beat in the game that ignores the turbo switch. This is the exact complaint
   that came back about Graveyard Shift after launch.

   Everything else does tier, and is tested for it: spin (`TURBO_SCALE =
   [1, 0.5, 0.28]`, `spinMotion.ts:692`), aubergine fall, round gate, screen
   shake, tractor wipe, win parade, camera push.

8. **Text is occluded on the first screen the player sees.** On the middle intro
   card, the subtitle "& SUPER FREE SPINS" (`IntroScreen.svelte:271`, rendered
   at `:863`/`:874`) is cut horizontally through the middle of its glyphs by the
   symbol canvas the `.intro-card__actor` spacer reserves
   (`IntroScreen.svelte:1353-1361`). At 1280×800 the visible text reads
   "& SUPER FREE" with the lower half sheared off and "SPINS" gone entirely.
   `.intro-card__sub` (`:1344-1352`) carries no stacking context and the canvas
   is drawn over it. Screenshot: `06-card-zoom.png` at 3× scale. It is the card
   that describes the game's headline feature.

9. **No keyboard binding on the bet button.** `grep -c -E "keydown|keyup"
   src/SlotApp.svelte src/ui/ControlBar.svelte` returns **0**. Spacebar does
   nothing. `docs/QA-LOG-2026-08-26.md:317` logged this as S3-3 and it is still
   true at HEAD. Every spin in a long session is a mouse trip to the bar.

10. **The balance credits before the win is announced.** On the forced 5× Red
    chilli round, at the moment the per-line parade began the bar already read
    `BALANCE $1,362.00` with `WIN $0.00` (`win-03.png`); the MEGA WIN plaque and
    the `WIN $363.00` readout arrived about ten seconds later (`win-08.png`).
    The money reconciles exactly — 1000 − 1 + 363 — and formats to 2dp with no
    rounding, so this is presentation order, not a money bug. It still tells the
    player the outcome before the game does.

### What is genuinely good, and is holding this off 1.00

- **Win presentation is proportional and skippable.** A ten-rung ladder from
  `zero` to `MAX WIN` with present durations 0 → 32 s and thresholds measured
  rather than guessed (`winBanner.ts:59-110`). A minimum win moves the meter
  only; 362× raised a wooden MEGA WIN plaque, a coin shower and a farmer cheer,
  with "TAP TO CONTINUE" and a global `pointerdown` skip (`SlotApp.svelte:1277`).
  This is the P4 lesson actually applied.
- **Animation completeness — the P3 disease is not here.** `SpriterPlayer`
  carries `ended`, `onEnd`, `onLoop` and a `loopOverride`
  (`src/engine/spriter/SpriterPlayer.ts:171-176, 369-389`), so a one-shot stops
  and holds its final pose instead of restarting. `banter.ts:189` derives its
  window from the clips — `Math.max(lengthOf(fromClip), answerAfterMs +
  lengthOf(toClip))` — rather than a flat hold, and the duel derives FX playback
  speed and end time from the clip's own duration (`DuelScene.svelte:615-617`).
  `docs/ANIMATIONS.md:7-12` even names the Spriter default-true `looping` trap
  and tells call sites to force `loop: false`.
- **The twentieth consecutive loss holds.** Twenty forced no-win spins and the
  grid never became twenty copies of one idle: `banter.ts` runs nudge-and-answer
  pairs between neighbouring vegetables, the farmer idles in the field, and the
  cabinet stays alive (`dead-20.png`).
- **Clean console.** No page errors and no failed requests across boot, intro,
  door pick, slot entry, six spins, a forced feature and a forced MEGA WIN.
- **No emoji in the shipped bundle** — grep over `dist/**/*.{js,css,html}` for
  the pictographic ranges returns nothing.
- **The art and the Super Free Spins entry are the best thing in this
  catalogue.** The night-sky mode swap, the wheat, the godrays and the
  CONGRATULATIONS plaque are a proper feature entry (`fs-05.png`).

## The one-notch lift

**Ship audio.** Not the full bus — the five cues that stop the game reading as
unfinished: a base music loop, a spin start, a reel stop, one win cue that
switches on the `WIN_LADDER` rung already computed in `winBanner.ts`, and a
free-spins entry fanfare, all taking their gain from the `musicGain()` /
`sfxGain()` the mixer already returns. That single change moves me from 1.33 to
1.67 on its own. Nothing else on this list comes close — I would trade every
other fix here for the reels making a noise.

## What I could not verify

- **Frame rate on hardware a reviewer would own.** This container has no GPU.
  Every backend I tried — default, `--use-gl=egl`, explicit SwiftShader —
  resolved to `ANGLE (Google, Vulkan 1.3.0 (SwiftShader Device (Subzero)),
  SwiftShader driver)`. A trivial WebGL clear ran at 58 fps there; the real Pixi
  stage ran under 2 fps *unthrottled*, which makes every wall-clock frame time I
  captured worthless — the precise trap `mummysriches/tools/browser.mjs` warns
  about ("two rounds of confident nonsense"). So I have **no defensible fps
  figure and no worst-frame figure for the phase transitions**, and I have not
  scored the game as though I did. I would have needed a machine with a real
  GPU. What I could measure hardware-independently — 400 images and 134.7 MP
  before PLAY, 271 duplicate PNGs — is in finding 6, and a reviewer on a 2019
  laptop will feel that even with a working GPU.
- **Whether the repeatable ~3.5 s boot long task survives on real hardware.**
  Image decode is CPU work and would partly survive; upload would not. Untested.
- **Portrait, mobile and Popout S (400×225) layouts.** Driven at 1280×800 only.
- **Mid-round refresh and resume.** There is no served round to resume — the
  slot runs on the demo wallet — so there was nothing to interrupt.
- **Real RGS behaviour**: bet levels from `authenticate`, non-USD currency
  formatting, replay. Not wired, so a reviewer will find the same absence and
  score it as absent.
- **Felix's Flight.** I entered through the Vegan Spins door and stayed there
  for the session; the flight game behind the second door is unreviewed.

### How I drove it

Built with `npm run build` (clean, `filename-law: 862 files in dist/, all
lawful`), served `dist/` over a local static server, and driven headless with
playwright-core 1.63.0 against `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.
The perf probe is a port of `mummysriches/tools/_perf_probe.mjs` — rAF deltas
plus `PerformanceObserver` longtasks bucketed by phase, with
`Emulation.setCPUThrottlingRate`. Instrument proved with screenshots at every
step: Catnip loader, intro cards, door picker, slot idle, forced 5-scatter
entry, forced MEGA WIN, twenty dead spins.
