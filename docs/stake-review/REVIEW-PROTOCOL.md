# The review protocol

**Every reviewer runs all of this, every time.** There are no lanes. The three
reviewers differ in temperament — what they weigh, what they forgive, what they
cannot forgive — not in what they look at. Any stage you skip is a stage nobody
covered, because your colleagues are not covering it for you.

If a stage cannot be run in your environment, say so explicitly under "what I
could not verify" and score that ground as unproven. Do not quietly drop it.

Compiled from Stake's own approval documents and seven rounds of real reviewer
contact. Sources in `CALIBRATION.md`; the findings behind each stage are in
`DEFECT-CORPUS.md`.

---

## Stage 0 — Prove your instrument, on a copy that is yours alone

**Work from your own extraction of the target, never the shared checkout.** Your
two colleagues are reviewing the same repository at the same time, and building
or serving from a shared working tree means one reviewer's `vite build` silently
overwrites the artefact another is measuring. This has happened: on the Wild
Wanted panel two reviewers independently caught the build directory changing
underneath them mid-run.

So before anything else:

```bash
mkdir -p <your-own-dir> && git -C <target-repo> archive <commit> | tar -x -C <your-own-dir>
```

Cite everything against that extraction, and record the commit and the path in
your review. If you must use a shared artefact, hash it before and after and say
so. A number measured on a tree someone else was writing to is not evidence.

Then get the game running and **take one screenshot**. Confirm it is the game.

A reviewer that never saw the screen reports a clean bill of health, which is
worse than no review. If you genuinely cannot run it — no browser, no GPU, a
build that will not complete — say so in one line at the top of your verdict and
review the artefacts directly. Never imply you played something you did not.

Record: how you launched it, what you saw, what you could not reach.

## Stage 1 — Audio

The highest-yield stage. It has cost this studio more stars than everything else
combined, and it is quick.

- Inventory every audio file **in the built artefact**, not just the source.
- **Hash them.** Identical hashes across differently-named cues is placeholder
  audio, not coincidence. Slot O' Verse shipped nine cues sharing one md5.
- Check peak amplitude, or failing that file size. A 4KB "cue" next to a 50KB one
  is silence.
- Grep the shipped bundle for playback at all: `AudioContext`, `new Audio(`,
  `createBufferSource`, `decodeAudioData`, `<audio`, and any audio dependency.
- **Map every player-visible event to the cue that fires for it** and list the
  ones with nothing: spin start, reel stop per reel, each win tier, anticipation,
  near-miss, feature entry, feature exit, retrigger, button click, tumble,
  bonus purchase, big-win rollup, session music.
- Check the mute control actually mutes something.

## Stage 2 — Play a full session

Not a demo. Play it the way a reviewer with ten minutes and a job to do plays it.

- Every bet mode and every buy tier at least once.
- Trigger every feature. Use forced events or a mock book if that is the only way
  in, and say that you did.
- Sit through a long dead run and judge what holds you there.
- Play past the point of novelty: what does the twentieth spin feel like?
- Then answer plainly: did you want another spin, or were you waiting for it to end?

## Stage 3 — Creativity and identity

- Strip the theme away and write the underlying mechanic in one sentence. How many
  games on Stake already are that sentence?
- Is there a **named mechanic** a player could describe to a friend?
- Does the identity hold across every surface — board, HUD, rules, loading screen,
  buy dialogs, menus — or is it themed on the reels and generic everywhere else?
- Is the title confusable with an existing game on two or more of name, logo,
  character, theme, mechanics? Banned tokens: Megaways, Xways, Enhanced RTP,
  Gates of, Bonanza.

## Stage 4 — Motion and presentation

- Every one-shot clip: is its display window at least as long as its authored
  length? A 1000ms hold on a 1200ms clip is a snap. This capped Mummy's Riches.
- Does anything cut back to idle in a single frame rather than blending?
- Is win presentation proportional — does a minimum win and a 500× win get
  different treatment?
- Can the player skip, or does the game hold them hostage?
- Does every cosmetic beat that gates an outcome tier on turbo (off = full,
  single = snappy, double = instant)?

## Stage 5 — Performance

- Measure at **phase transitions**, not steady state: boot, first spin, feature
  entry, feature exit, big-win presentation, return to idle.
- Throttle the CPU. `mummysriches/tools/_perf_probe.mjs THROTTLE=6` is the worked
  example — port it rather than inventing one.
- Report **worst-frame duration**, not just mean fps. Mummy's Riches held ~50fps
  in gameplay and still took a 1.67 for a 3.7-second frozen frame at feature entry.
- Count assets and bytes loaded before the game is playable.
- If you have no GPU, say so and do not quote an fps figure you cannot defend.

## Stage 6 — Money and RGS integrity

- Does the game actually contact the RGS? Find the call sites. A game that spins
  on a client-side RNG and pays from a demo wallet is not a Stake game.
- Bet amounts come **only** from RGS `betLevels` — no client-side arithmetic
  inventing a value. Max bet snaps DOWN to a real level and never caps by balance.
- Insufficient funds: the button stays **clickable** and shows a message. A greyed
  button is a defect.
- Bet read from the latest `authenticate` response, not from cache.
- Affordability is `bet × costMultiplier ≤ balance`, including in autoplay's stop.
- No play request on insufficient balance; no end-round request on a zero win;
  an idempotency guard against double pay.

## Stage 7 — The checklist

Run it. Every item, in more than one configuration.

**Currency and decimals.** Balance and Bet exactly 2dp in every currency; win
presentation to 4dp where the digits carry value, trailing zeros trimmed, never
"0.00" on a real win, always floored. Test KWD (3 minor units), JPY (0), USD.
Money must never round — $147.70 displaying as $147.69 is a finding.

**Social and jurisdiction.** The signal must OR `?social=true` with
`config.jurisdiction.socialCasino`, and mode copy must rebuild reactively after
authenticate. Then scan the **scrubbed output**, not the source, for the full
restricted set including derivatives — pay, pays, paying, payout, paytable,
payline, paylines, bet, buy, wager, gamble, cash, money, jackpot, staked.
`\bpay\b` does not match `paying`. Baked sprites and bitmap alphabets cannot be
scrubbed at all — inventory them separately.

**Layout.** Page never scrolls: `html { overflow:hidden; height:100% }` and
`canvas { display:block }`. Popout S is 400×225 — the compact layout must be
selected by **viewport size, not `pointer:coarse`**, and every interactive control
must sit inside the viewport. Traverse the stage and compare bounds; do not
eyeball it. Portrait and landscape both playable.

**Locale.** `?lang=zzinvalid` loads in English with zero console errors. A valid
non-English locale still translates. `?social=true&lang=de` renders English.
Assert on **every surface** — menu, replay, buy modal, plaques — not one tab.

**Rules accuracy.** Every max-win and RTP number agrees across the rules screen,
buy dialogs, feature intros, config and the maths pack — **per mode where they
differ**. Every mechanic the player can see must appear in the rules. No
hit-rate, chance or probability numbers in player copy. Disclaimer present with
all seven points. Sound disableable from the UI. UI guide covers every button.

**Session.** Refresh mid-spin, mid-count-up, mid-feature: no browser dialog (zero
`beforeunload` handlers), correct resume, bet preserved. Round restore gated on
`round.active === true`. Spacebar bound to bet, dead while any modal is open and
in replay.

**Replay.** Loads and plays the requested event, supports currency/language/
amount parameters, replay-again at the end, bet cost shown including multiplier
and real cost. Fits in Popout S.

## Stage 8 — Assets, requests and build

- With cache disabled, park on every screen for 60s: the request count must
  plateau. Per-frame `<img>` src swaps produce "a high number of invalid requests".
- No filenames with spaces or capitals anywhere — including inside baked
  manifests, atlas `image` refs, mobile mirror trees and folder names. Stake's CDN
  403s them silently.
- Zero assets byte-identical to any web-sdk sample game.
- Zero external origins in the bundle. Static files only.
- No dev hooks, debug routes, force panels, mock RGS or preview payloads in the
  production build. Grep by name.
- Serve the built artifact from a **sub-path** and click through: zero 4xx/5xx.

## Stage 9 — Maths

- RTP 90–98%, all modes within 0.5% of each other.
- Advertised max win achievable at 1-in-20,000,000 or better.
- Non-zero hit rate around 1-in-3 to 1-in-8 for base; over 1-in-20 is a reject risk.
- No payout gaps between small wins and the maximum.
- Mode costs match the rules text exactly.
- Displayed RTP reconciled to the actual simulated pack, not a stale config label.
- Would a reviewer hit the ceiling during a ten-minute test and read it as a bug?

---

## Then, and only then, score

You have run the same protocol as your two colleagues. What differs is what you
make of it — that is your personality, and it is in your own agent definition.

Pick one value from Stake's fixed scale, write the two sentences explaining why
that value and not the one above it, and stop.
