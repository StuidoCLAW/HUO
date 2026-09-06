# Produced under the previous panel model — read before citing

These three verdicts on Vegan Spins (StuidoCLAW/Farmers-Day @ `53826d5`) were
written on 2026-09-06 by the **lane model**: three reviewers with different
*remits* — `creative`, `player` and `compliance` — each concentrating on its own
ground.

That model was replaced the same day. The panel now runs
`docs/stake-review/REVIEW-PROTOCOL.md` — **every reviewer covers everything**, and
the three differ only in temperament (`veteran`, `enthusiast`, `inspector`).

## What still stands

**The findings.** They are cited against the artefacts and were reached
independently, in several cases by more than one reviewer:

- The build ships with **no audio at all** — verified against `dist/`: zero audio
  files of any format, zero playback calls in the shipped JS, no audio dependency.
  `MenuModal.svelte:1124` tells the player "This game has no audio yet".
- **`src/stake/rgs.ts` has zero call sites.** The slot spins on a client-side RNG
  and pays from a self-granted 1,000-unit demo wallet (`SlotApp.svelte:224`,
  `:694-706`). `rgs.ts:276-285` claims an unlaunched build shows a fatal notice;
  `main.ts:69-71` mounts the game unconditionally.
- Social scrub, replay, second currency and jurisdiction limits are all written
  and wired to nothing.
- A `?force-event` debug panel ships in the production bundle.

## What does not

**The scores** — 1.67 / 1.33 / 0.67, average 1.22 — and therefore the predicted
star rating. They came from reviewers with narrower remits than the current panel
gives them, and the temperaments that produce the spread are different now. Do
not quote them as the current prediction for this game.

`tools/stake-review/score.ts` will reject this directory: the reviewer ids
`creative`, `player` and `compliance` are no longer legal. That is deliberate.

**Re-run the panel** against the current agents before treating any number here as
live.

## Also worth carrying forward

All three reviewers reported that the container had no GPU — every backend
resolved to SwiftShader — so **none of them produced a defensible frame-rate
figure**, and all three said so rather than inventing one. Stage 5 of the protocol
was effectively unrun. Any re-run should happen somewhere with a real GPU.
