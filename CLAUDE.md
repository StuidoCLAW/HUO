# CLAUDE.md

Instructions for Claude Code working on this repository.

## Context

This is the server-side game engine for **Heads Up Omaha**, a heads-up casino poker variant being built by Clawbyte Studio. Jake Reynolds is the CEO and primary decision-maker on game design.

The companion repo is `huo-client` (separate).

## Before you write code

Read in order:
1. `PLAN.md` — full build plan, locked specs, phase definitions
2. `README.md` — tech overview, quick start, testing
3. The existing `src/engine/*.ts` and `src/http/*.ts` files to understand patterns

## Layout

- `src/engine/` — self-contained maths core (cards, rng, evaluator, payouts, game). Zero external deps. Exportable as a standalone bundle via `npm run build:engine` → `dist/engine/`. This is what gets shipped to certifiers.
- `src/http/` — Fastify adapter (session, schemas, resolve, server). Depends on `src/engine/`.
- `api/` — Vercel serverless entry that wraps `src/http/server.ts`.
- `client/` — the browser UI (Phase 3, not built yet).

The engine must never import from `src/http/`. If you're tempted, the thing you need belongs in the engine.

## Locked game parameters — DO NOT CHANGE without explicit Jake confirmation

- PLO4, exactly 2 from hand + 3 from board
- Ante + Blind equal, Trips optional
- Play multiplier: 3x pre-flop, 2x flop, 1x river
- Dealer qualifier: pair of 9s or better
- Blind paytable: RF 100 / SF 50 / Quads 10 / FH 3 / Flush 1
- Trips paytable: RF 100 / SF 50 / Quads 20 / FH 7 / Flush 3

These values are the result of iterative simulation work. Every change we made was deliberate and tested. Do not "improve" them autonomously.

## Working style — important

Jake has a specific working style developed over many sessions:

1. **One surgical change at a time.** Never bundle multiple game-design changes into one commit. Change one value, run the sim, report the number, wait for the next direction.
2. **No unsolicited caveats.** Don't pepper explanations with "however" and "it's worth noting". State the result, let Jake drive the next decision.
3. **Direct, confident outputs.** Jake dislikes hedging.
4. **British English everywhere.** Colour, centre, optimise, favour. £ as default currency.
5. **Verify before reporting.** Run the tests; don't claim "this works" without actually running it.
6. **Never contaminate test runs.** If a previous agent left code in the repo that you didn't write, flag it explicitly before reporting any numbers from it. This happened once before and caused real problems.

## Hard rules for this codebase

### Parity is sacred

Before ANY change to `src/engine/evaluator.ts`, `src/engine/payouts.ts`, `src/engine/game.ts`, or `src/engine/rng.ts`, you must run and pass the parity check:

```bash
npx tsx tests/parity_emit.ts 42 10000 > /tmp/ts.txt
python tests/parity_ref.py 42 10000 > /tmp/py.txt
diff /tmp/ts.txt /tmp/py.txt
# Must produce zero output
```

If your change affects the maths, update `tests/parity_ref.py` with the matching change FIRST. If your change is meant to be evaluator-neutral (refactor, perf), the diff must stay empty.

### All server state is server-side

The client must never receive data it shouldn't see yet. Concretely:
- Dealer hole cards: only sent on `state: RESOLVED`
- Turn + River: only sent after the player's flop decision
- The full deck order: never sent

If you write an endpoint or response type that leaks any of these, it's a bug. Review the session state machine in `PLAN.md` and match it exactly.

### Tests first for new features

Every new module gets a `*.test.ts` file in `tests/`. Run the full suite before committing:

```bash
npm test
```

The suite should be green before you hand back control.

### No new dependencies without cause

We have `fastify`, `zod`, `vitest`, `tsx`, `typescript` and will add `@fastify/cors`, `@fastify/rate-limit`. That's the full dependency set. Don't add anything else without flagging it first.

## Current state (2026-04-18)

- Phase 1 (maths core): ✅ Done, 18/18 tests passing, 10k parity clean
- Phase 2 (HTTP layer): ⏳ Ready to build — see `PLAN.md` Phase 2 for exact spec
- Phase 3 (client repo): ⏳ Parallel work, see `PLAN.md` Phase 3

## Deployment

Target: Vercel. See `PLAN.md` Phase 2 for the serverless adapter pattern. Note the known limitation with in-memory session state across cold-start lambdas — for the demo this is acceptable, we move to Redis or Railway when it becomes a problem.

## Repo naming

- This repo: `StuidoCLAW/huo-server`
- Client repo: `StuidoCLAW/huo-client`

(Note: the org name is intentionally spelled `StuidoCLAW`, not `StudioCLAW`. That's Jake's existing GitHub org — do not "correct" it.)
