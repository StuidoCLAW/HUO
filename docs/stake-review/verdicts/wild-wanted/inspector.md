# Wild Wanted — reviewer #3 (inspector)

SCORE: 1.67

**Why 1.67 and not 2.00.** The rules screen prints "FREE SPINS · 100× · 96.0% · 10,000×" on a
mode whose own published lookup table cannot pay above 5,000× and whose measured RTP is 96.5% —
two displayed-vs-actual numbers on the most expensive thing a player can buy, and my 2.00 band is
explicitly reserved for lists with nothing on them that touches money. The rest of the list is
long but not fatal — a whole soundtrack borrowed from Mummy's Riches, a preview build committed
as the deliverable, a live rig byte-identical to a web-sdk sample, one rendered mechanic missing
from the rules — and none of it is why I could not give this a 2.

**Instrument.** Served the artefact committed at `287fca0`
(`web-sdk/apps/wild-wanted/build`, index.html md5 `1a4e4b1e4bd89852a1ef6a5a3b4d9bd6`) from a
sub-path `http://127.0.0.1:8670/wild-wanted/v1/`, Chromium 1194 headless, SwiftShader, no GPU.
Booted, pressed PLAY, saw the game (screenshot `shots/play/boot-25000.png`, then the reels at
`shots/sess/after-base.jpg`). Played base, boost, DOUBLE SCATTER and BURST BONUS rounds to
settlement. Note on method: a concurrent process rebuilt `build/` in the working tree at 10:58
during my run, so from that point I worked from `git archive 287fca0` extracted to a private
directory. Every citation below is against that extraction or against the repo source at
`287fca0`.

---

## Blockers

None. Nothing here can move money wrongly, and the game ran in every configuration I put it in —
1280×720, 400×225, 480×270, 390×844, 844×390, USD, KWD, `?social=true&lang=de`. Money reconciled
exactly on every round I could settle: BURST BONUS at a $1 bet debited 60 and credited 105 for a
net `dBal: +45` (`scratchpad/sess3.log`), DOUBLE SCATTER debited exactly 30. Zero console errors,
zero failed requests, zero 4xx/5xx across a played session.

---

## Findings, ranked by what they cost me

### 1. FREE SPINS advertises a 10,000× ceiling the shipped maths cannot reach (5,000×)

Checklist items 47, 48 and 101. Defect corpus C6; lessons round 6.3 ("each mode must have its own
RTP and maximum win information displayed"), raised against Mummy's Riches and re-raised here.

**Steps.** Open the game → hamburger → GAME INFO → RULES → read the MODE/PRICE/RTP/MAX WIN table.
**Expected.** The FREE SPINS row states the cap the `bonus` pack can actually pay.
**Actual.** It states `FREE SPINS · 100× · 96.0% · 10,000×`
(rendered text captured at `shots/comp/social-kwd-menu.txt`, and visible in
`shots/comp/social-kwd-RULES.jpg`).

The published maths says otherwise, in two independent places:

- `math-sdk/games/wild_wanted/library/configs/config_fe_wild_wanted.json:36-42` —
  `"bonus": { "cost": 100.0, ..., "rtp": 0.965, "max_win": 5000 }`
- The pack itself. Maximum payout over all 200,000 rows of
  `library/publish_files/lookUpTable_bonus_0.csv` is **5,000×**, against 10,000× in every other
  mode's table:

  ```
  lookUpTable_base_0.csv        maxPay=10000.0x   max-win 1 in 1,000,000
  lookUpTable_bonus_0.csv       maxPay= 5000.0x   max-win 1 in 5,000
  lookUpTable_boost_0.csv       maxPay=10000.0x
  lookUpTable_burstbonus_0.csv  maxPay=10000.0x
  lookUpTable_enhancer_0.csv    maxPay=10000.0x
  lookUpTable_superbonus_0.csv  maxPay=10000.0x
  ```

The front end's own copy is fed from `web-sdk/apps/wild-wanted/src/game/config.ts:177`
(`max_win: 10000` under `bonus`), read by `MenuModal.svelte:266` (`capBonus`) and printed at
`:498-505`. The splash badge takes `Math.max` of the same six values
(`IntroScreen.svelte:755`) and prints **MAX WIN 10,000×** directly above the FREE SPINS card. The
figure is on the buy card and the confirm dialog as well —
`packages/state-shared/src/constants.ts:295,338` carries `mode: 'bonus' … maxWin: 10000` — so the
player is shown the wrong ceiling at the moment they are asked to pay 100× the bet for it.

Two things make this worse rather than better. First, the mechanism designed to carry exactly this
exception is present and was written knowing the answer — `MenuModal.svelte:249-251` says in
terms: *"The caps DIFFER by mode — 10,000x everywhere except Buy Free Spins, which caps at
5,000x — so no single headline number is correct."* The number fed into that mechanism is
nevertheless 10,000. Second, the gate that is supposed to catch this runs in `build:stake` and
cannot: `tools/verify_maxwin_sync.mjs:30-36` reads `state-shared/constants.ts` and
`game/config.ts` and compares them **to each other**. It never opens the maths pack, so it passes
while both front-end copies are wrong together. That is the lessons file's own rule failing again
— a trap with a build check that checks the wrong pair.

### 2. Displayed RTP is 96.0%; the pack is 96.5%

Checklist 101 ("Displayed RTP reconciled to the actual simulated pack, not a stale config label")
and 47.

**Steps.** Same table.
**Expected.** 96.5%.
**Actual.** `96.0%` on all six rows (`shots/comp/social-kwd-menu.txt`).

`config.ts:30,141,148,155,176,194,205` all carry `rtp: 0.96`; `MenuModal.svelte:283` renders
`(m.rtp * 100).toFixed(1)`. The published `config_fe_wild_wanted.json` carries `"rtp": 0.965`
seven times, and I recomputed it from the tables rather than trusting either file: summing
`weight × payout / totalWeight / cost` over each published lookup table gives **0.965000** in all
six modes, to six decimal places. The studio's own maths note agrees
(`docs/AUDIT-2026-09-04-SFS.md`: "96.50% in all six modes"). The game under-declares its own
return by half a point on every mode.

Everything else in the maths is clean and I want that on the record: all six modes are within
0.000% of each other (checklist 96), base non-zero hit rate is 1-in-5.27 (98), base max win is
1-in-1,000,000 (97, against a 1-in-20,000,000 requirement), and every spin count in the rules
matches `game_config.py:667-670` — 3 Scatters → 10 spins, 4 → 12, retrigger 3 → +5, 4 → +6, with
the revolvers on reels 1/3/5 exactly as `BR0.csv`/`BST0.csv` place them. Maths is not this game's
problem; the two labels stuck on the front of it are.

### 3. The soundtrack is Mummy's Riches' Ancient Egypt pack, unchanged

Stake's frontend requirement on unique audio; checklist 84's sibling. The studio's own gate calls
this a blocker and the pipeline does not run it.

**Steps.** Inventory `build/assets/audio/`. There are two files: `sounds.mp3` (6,113,950 bytes,
md5 `0fd10c9ab8834b4cec793084a8557bce`) and `sounds.ogg`, plus `sounds.json`. 53 cues.
**Expected.** A Western pack.
**Actual.** 52 of the 53 cues sit at byte-for-byte identical sprite offsets and lengths to
Mummy's Riches' sheet (`mummysriches/web-sdk/apps/mummy-madness/build/assets/audio/sounds.json`);
the only new region is `bgm_burst` at offset 289800 for 92,250 ms.

I did not take the offsets on trust. Decoding both sheets in Chromium and comparing PCM per cue,
the mean absolute difference relative to Mummy's is **0.054–0.33** — the signature of a
re-encode, not of different audio. The same comparison against a genuinely different pack (the
web-sdk `lines` sample) returns **0.99–2.51** on the same cues. Full table at
`scratchpad/audio-report.json`.

The sheet says so itself. `sounds.json`'s `source` map, shipped in the build:

- `bgm_main` → "BASE GAME MUSIC - Percussive **Ancient Egypt** Ambience Theme - Loop"
- `bgm_superfreespin` → "**MUMMY FEATURE MUSIC** - Creepy Tense Orchestral Theme - Loop"
- `sfx_winlevel_small..substantial`, `bgm_winlevel_mega/epic/max` → "**EGYPT** WIN TUNE …" ×9
- `sfx_scatter_stop_1..5` → "**ANCIENT EGYPT** SPECIAL REEL STOP …" ×5
- `sfx_superfreespin`, `sfx_mummy_roar[_b/_c/_d]` → "**MUMMY VOICE** - Angry Roar Attack" ×5
- nine further cues → "engine sprite (Stake scaffold)"

26 of 53 cues are explicitly Egypt- or mummy-sourced. **Zero** are Western-sourced.
`src/game/soundCatalogue.ts:101-104` states the position plainly: *"they stay packed in the
sprite, which is still Mummy's Riches' audio until the sound pass replaces it."*

The studio wrote the check for this and left it out of the build:

```
$ node tools/audit_audio_origin.mjs
NAMED FOR THE DONOR GAME (6) — "mummy riches":
  sfx_mummy_roar  sfx_mummy_roar_b  sfx_mummy_roar_c
  sfx_mummy_roar_d  sfx_mummy_step  sfx_mummy_step_b
audit_audio_origin: FAIL — 1 finding(s), worst BLOCKER — 53 keys, 0 unreachable
$ grep -c audit_audio_origin web-sdk/apps/wild-wanted/package.json
0
```

`CLAUDE.md:183` lists "**DONOR AUDIO** … the whole sheet is the donor's; Stake rejects reused
audio by name" as a standing blocker. It is still standing.

To be fair to the studio on the axis that has actually cost it stars: **this is not silence.**
Every cue has real amplitude (peak 0.24–1.05, no cue below 0.005), all 53 are reached from source,
and a reviewer with headphones hears a complete, well-produced soundtrack. It is simply a
different game's.

### 4. The committed and deployed artefact is a preview build with a mock RGS in it

Checklist 88 ("Dev hooks, debug routes, mock RGS and preview payloads absent from the built
bundle — grep by name") and 89. Trap T17.

**Steps.** Load `http://127.0.0.1:8670/wild-wanted/v1/` and open the console.
**Actual.** `[rgsMock] installed — PREVIEW (base mode synthesised from previewBooks, no backend).`
The wallet is a $100,000 literal (`src/hooks.client.ts:39`). Grepping the shipped bundle by name:

| token | occurrences in `_app/immutable/bundle.BZqrh6NY.js` |
|---|---|
| `__WW_AUDIT__` | 1 |
| `devMockAuth` | 1 |
| `previewBooks` | 1 |
| `showcase` / `antreel` / `bossgold` | 1 each |
| `preview mock` | 1 |
| `COPY SFS (all layouts)` | 1 |

Adding `?debug=1` renders a **POSITION DEBUG** authoring panel over the game with 60-odd
controls — layer nudgers, a device-size list, COPY VALUES, RESET ALL (captured in the DOM dump of
`rev/net.mjs`). `tools/verify_stake_clean.mjs:71` greps `build/` for
`__WW_AUDIT__, devMock, rgsMock, previewBooks, DebugPanel, POSITION DEBUG` and exits 1 — the
studio's own clean gate would reject this artefact, and `tools/zip_stake_upload.mjs:51-53`
confirms this is deliberate: *"build/ NOW HOLDS THE PRODUCTION ARTIFACT, NOT THE PREVIEW. Before
committing, restore it: pnpm build:preview."*

I have weighted this as hygiene, not as a money defect, and I want to say why. Unlike Slot O'
Verse — where a compliance document asserted a gate that was not in the code — the gate here is a
real static build-mode flag (`import.meta.env.MODE === 'preview'`, `src/devParams.ts:35`), the
build announces itself on the console, and the production path exists in tooling. What it costs
is that **there is no production artefact in this repo at `287fca0`** — no `dist/`, no zip — so
the thing that would actually be submitted is a build nobody can inspect, including me.

What is not merely hygiene: `vercel.json` names this directory as `outputDirectory`. Anyone handed
the deployed URL is playing a fake wallet.

### 5. The application ships twice, 6.7 MB of it on a no-store document

Loading. Checklist 87/88 territory; the closest recorded relative is C11 (request volume).

**Steps.** `ls -l build/` and `ls -l build/_app/immutable/`.
**Actual.** `index.html` is **6,820,548 bytes**, of which the inline `<script>` beginning at
offset 89,619 is byte-for-byte identical to `_app/immutable/bundle.BZqrh6NY.js`
(**6,730,680 bytes**) — verified by slicing the file and comparing (`seg == j → True`).
The separate copy is **never requested**: a full boot issues 263 unique requests and not one of
them is under `_app/` (`scratchpad/shots/reqs.txt`). So the upload carries 6.7 MB of dead payload
(12.5% of a 54 MB archive), and the live 6.7 MB sits inside a document that `vercel.json` marks
`no-cache, no-store, must-revalidate` — re-downloaded on every load and every mid-round refresh,
which is a thing Stake reviewers do deliberately. Fifteen `assets/wwfont/*.webp` glyphs are also
each requested three times in one boot.

I could not defend a frame-rate number here (see below), but bytes are bytes.

### 6. A live rig is byte-identical to a web-sdk sample game

Checklist 84 / T15 — the item Graveyard Shift was pulled up on.

```
a76d3375e4e7a05731edf3d4ba4e6fa2  assets/spines/anticipation/anticipation.atlas
d16c92a94ef846724ae2e69c87a3d50c  assets/spines/anticipation/anticipation.json
```

Both md5s match `graveyard-shift/web-sdk/apps/lines/static/assets/spines/anticipation/` exactly
(345 KB of skeleton data). All three files in that folder are requested at boot
(`scratchpad/shots/reqs.txt`), so the scatter-anticipation animation is the sample game's rig
with a re-skinned texture over it — live, not dead.

Credit where it is due: I hashed all 417 shipped assets against three sample games and this is the
only pair that matched, and against Mummy's Riches only 22 match — fonts, the Catnip loader glyph,
spin/turbo/autospin icons, the progress bar, coins and the big-win coin mountain. The 633
byte-identical donor files `CLAUDE.md:183` records as of 2026-09-01 have genuinely been worked
down. The art is this game's own.

### 7. A rendered mechanic that is not in the rules

Checklist 53 / T12 / defect C16 ("an extra-spin feature fired that was not in the rules").

**Steps.** Open the intro splash. The FREE SPINS card reads *"The outlaw shoots symbols and turns
them wild."* Now open GAME INFO → RULES → FREE SPINS.
**Expected.** An entry for it.
**Actual.** The FREE SPINS section is one paragraph about spin counts and retriggers and says
nothing about the outlaw or the shot
(rendered text, `shots/comp/social-kwd-menu.txt`). `grep -n "shoot" MenuModal.svelte` returns
lines 551 and 561 only, both about BURST BONUS crates.

The beat is not decoration. `src/game/shootWildsBeat.ts:15-25` specifies the whole choreography —
aim, muzzle flash, frame jolt, blast sheet, wild revealed under it — and it is wired through
`ShotBlasts.svelte:90` and `bookEventHandlerMap.ts:54`. The board visibly changes. Round 4.8's
ruling applies: if the player can see it happen, it needs a rules entry.

### 8. The spin button is clipped below the fold at Popout S

Checklist 69 / T13 — the trap behind this studio's previous "really hard to play" rejection.

**Steps.** Set the viewport to 400×225, traverse the Pixi stage for nodes with
`eventMode === 'static' && cursor === 'pointer'`, compare `getBounds()` to the viewport.
**Actual.** 3 of 9 interactive nodes fall outside. Two are the BANK and SALOON scene props at the
frame edges — that is framing, not a defect. The third is the primary spin control at
`y=174, h=59` → bottom edge **233 in a 225-high viewport**, an 8 px clip. Same node at 480×270
(bottom 280) and at 844×390 landscape (bottom 403). Its centre stays inside, so it remains
clickable.

I want to be accurate about the severity, because T13 was catastrophic and this is not: at 400×225
the compact layout is a genuine re-stack, the whole control bar is inside the viewport, the board
is legible and the game is playable (`shots/layout/popoutS.jpg`). This is the primary control
losing its bottom arc, not a row of dead buttons.

### 9. Nits

- Unminified CSS with internal developer commentary ships in `index.html`, including the phrase
  *"The donor game's 'ZombieMummy2' bandage face"* — read straight out of `document.body.innerText`
  during my compliance run. Nobody will see it, but it is in the upload.
- Three capitalised basenames in the artefact (`bundle.BZqrh6NY.js`, `style.CLtj3ii3.css`,
  `style.eu72C58p.css`) against T10's all-or-nothing filename law. All three are unreferenced;
  `build_production.mjs` prunes the two CSS files on the production path and this preview build
  did not.
- The disclaimer's trademark line reads "TM and © 2026 **Engine**." where Stake's template says
  "Stake Engine" (`MenuModal.svelte:1021`). The copyright point is covered by the adjacent
  `© 2026 Stake Engine` line, so it is cosmetic.

---

## What passed, checked rather than assumed

Trap T1 first, as instructed. The repo is a single squashed commit so there is no fork date in
git; I established it from the fix sites instead, and **the round-3 and round-4 SDK fixes are all
present**:

- Social predicate ORs the platform signal — `state-shared/src/stateUrl.svelte.ts:32-33`,
  `getUrlSearchParam('social') === 'true' || stateConfig.jurisdiction.socialCasino === true`.
- Invalid `?lang` validated against `locales`, unknown → `'en'` — `:52-58`. Social forces `'en'` — `:53`.
- `correctBetAmount` snaps **down** to a provided level with no balance cap —
  `state-shared/src/stateBet.svelte.ts:46-64`.
- Insufficient funds keeps the button clickable and raises a message — `ButtonBet.svelte:33-36`.
- Win and balance formatters split, both floored — `utils-shared/amount.ts:119` and `:182`.
- End-round idempotency latch set before the await — `createPrimaryMachines.ts:60-65`.
- Zero `beforeunload` in source (`grep` over `packages/*/src` and `apps/wild-wanted/src` → 0). The
  single occurrence in the bundle is SvelteKit's own router guard, which only cancels if a
  `beforeNavigate` handler asks it to.

Measured in the browser:

- **KWD, 3 minor units:** `KWD 100,000.00` / `KWD 0.00` / `KWD 1.00` — exactly 2 dp on Balance and
  Bet (`shots/comp/social-kwd-hud.jpg`). This is the item that cost Tiki Taka and Mummy's.
- **Social:** `?social=true&lang=de` renders English, and the scrub fires — "Pick your **spin**",
  "40 fixed **lines**", "highest **winning** symbol", "instantly triggered from the menu". I
  scanned 10,988 characters of **scrubbed output** across all four menu tabs for the full
  restricted set with derivatives (`paytable|payline|paylines|paying|payout|pays|pay|wager|gambl|
  jackpot|staked|cash|real money|bet|bets|buy|buys|bought|purchas|money`): **zero hits**. The bet
  field is labelled PLAY, not BET.
- **Spacebar with the info menu open:** 0 `/wallet/play` requests over four presses (T8).
- **The page never scrolls.** `scrollHeight === clientHeight` and `scrollY` pins at 0 at
  1280×720, 400×225, 480×270, 390×844 and 844×390. `canvas { display: block }` and
  `touch-action: manipulation` are both present. The literal `html { overflow:hidden; height:100% }`
  rule is not — `body` carries the overflow instead — but the measured result is correct at every
  size, so I am not filing it.
- **Sub-path serve:** zero 4xx/5xx, zero external origins requested, zero console errors across
  boot, a played session and the social/KWD/German pass.
- **Disclaimer:** all seven required points present (`MenuModal.svelte:1021`), no links anywhere,
  zero anchor tags in the bundle (R7).
- **Filename law:** zero filenames with spaces; zero capitalised basenames under `assets/`.
- **Turbo:** the three-tier ladder is implemented as doctrine rather than a boolean
  (`game/turbo.ts:35`, `tierPick`), which is the P4 lesson closed properly.

---

## Stages 2, 3 and 4 — what it is actually like

**Playing it.** I settled base, boost, DOUBLE SCATTER and BURST BONUS rounds. The DOUBLE SCATTER
buy did what its card promises: 30× charged, two scatters dealt, a third landed and it opened
Free Spins, which ran to 10 of 10 and paid 11.00× (`shots/sess/HANG-enhancer-1.jpg`). BURST BONUS
charged 60 and paid 105. The base game is a plain 40-line grind — the twentieth spin feels exactly
like the first — but the shelf above it is the reason to stay: six modes, two of which you reach
by **tapping a building on the street and walking into its scene**, which I have not seen on a
Stake slot before. Did I want another spin? In the base game, no. To see what the Bank looked like
from the inside, yes.

**Creativity.** Strip the theme: *a 5×4 fixed-payline slot with scatter free spins, a wild-heavy
super round and a buy-only pick-and-shoot bonus.* That sentence describes a lot of games. What
makes it not just that sentence is the shelf and the navigation — BURST BONUS and DOUBLE SCATTER
are named mechanics a player could describe to a friend, and the building-entry idea gives the buy
menu a place rather than a modal. The identity holds on the board, the frame, the scenes and the
character, all of which are strong original cartoon art with a proper saloon interior and a
costume change per feature. It cracks in three places: the low symbols are poker chips stamped
10/J/Q/K/A plus a fanned poker hand, which is the most generic set available and fills most of the
board; the HUD is the stock dark-glass SDK bar; and the bonus-buy affordance is a **cat's paw** in
a Western. And then everything you hear is Egyptian. Title is unique, no banned tokens.

**Motion.** What I could judge from stills and source is good — the shoot-to-wild beat is properly
choreographed and tiered on turbo, `SpriterPlayer` has `settleMs` and it is used at six sites,
`playMode="once"` appears on the scatter rig. What I could not judge is whether any one-shot's
display window is shorter than its clip, which is the P3 disease. Say so plainly: at roughly one
rendered frame per second under SwiftShader, frame-diffing a 190 ms bounce is not a measurement,
it is a guess, and I do not file guesses.

---

## What I would tell the studio

**Fix the FREE SPINS row.** Set `config.ts` `bonus.max_win` to 5000 and `rtp` to 0.965 across all
six modes so the rules table matches `config_fe_wild_wanted.json`, and rewrite
`tools/verify_maxwin_sync.mjs` to read the maths pack as the third input rather than comparing two
front-end files to each other. That single change takes the game out of the "displayed ≠ actual"
category, which is the only thing on my list that I treat as disqualifying rather than expensive,
and it is the one that moves me a notch on its own. The audio is the bigger job and the bigger
prize, but it is not the thing holding the score at 1.67.

---

## What I could not verify

- **Frame rate and worst-frame duration (stage 5).** No GPU; SwiftShader renders roughly once per
  second. My round wall-clocks (base 36–58 s, a 10-spin free-spins round 242 s) are measurements
  of this container, not of the game, and I quote no fps figure. Entry-phase stalls of the kind
  that took Mummy's Riches to 1.67 are **unproven either way** here. Needed: a CPU-throttled probe
  on real hardware, `tools/perf_probe.mjs` being the studio's own worked example.
- **Animation-window discipline (stage 4).** For the same reason. Needed: frame capture at real
  frame rate, per one-shot, window versus authored clip length.
- **The production build.** There is no production artefact at `287fca0` and I did not run
  `build:stake` — a concurrent process was already building in that working tree and I would have
  contaminated it. So every statement I make about dev hooks, the mock RGS and the duplicated
  bundle is about the committed preview build, which is also what `vercel.json` deploys. Whether
  the submission zip is clean is unproven; `verify_stake_clean.mjs` exists and would tell you in
  seconds.
- **SUPER FREE SPINS and the cage award, and the FREE SPINS (100×) buy.** My session settled base,
  boost, enhancer and burstbonus; the 250× round was still running when I closed the file. The
  dynamite/cage mechanic is therefore assessed from source and rules copy only.
- **Replay.** `?replay=true` needs an RGS round the preview mock answers only through its own
  handler; I did not reach a real replay surface, so checklist 73–77 (replay-again, currency and
  language parameters, "BONUS 1 USD, 250 USD REAL COST", Popout S fit) are unproven. `ReplayModal`
  does compute `betAmount × costMultiplier` (`:57-59`); whether both figures are rendered I did
  not see.
- **Mid-spin refresh (checklist 35).** I confirmed zero `beforeunload` handlers in source but did
  not execute the refresh matrix; resume behaviour is unproven.
- **Live-only items.** Bet-level templates per currency (29), the game tile (105), older Android
  and iOS hardware (110), and the `?lang=zzinvalid` boot, which I read in source
  (`stateUrl.svelte.ts:52-58`) but did not run in the browser.
