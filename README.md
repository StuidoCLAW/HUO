# huo-server

**Heads Up Omaha — server-side game engine**

Node.js + TypeScript + Fastify API that owns all game truth: RNG, shuffle, hand evaluation, qualifier, paytables, and bet resolution. Companion to `huo-client` (the browser UI).

## Status

- **Phase 1 (Maths Core)**: ✅ Complete. 18/18 unit tests passing. 10k-hand parity test vs Python reference sim passes byte-for-byte (zero diffs, with and without Trips).
- **Phase 2 (HTTP layer)**: ⏳ Not started. See `PLAN.md` for the endpoint spec.
- **Phase 3 (Client)**: ⏳ Separate repo (`huo-client`). See `PLAN.md`.

## Quick start

```bash
npm install
npm test              # full Vitest suite (18 tests, ~1s)
npm run parity        # 10k-hand TS vs Python parity diff (must output 0)
```

## Locked game spec

- **PLO4**, exactly 2 from hand + 3 from board
- **Ante + Blind** mandatory, **Trips** optional side bet
- **Play**: 3× pre-flop, 2× flop, 1× river (decreasing multiplier)
- **Dealer qualifier**: pair of 9s or better
- **Blind paytable** (pays on player win with flush+): RF 100, SF 50, Quads 10, FH 3, Flush 1, else loss/push
- **Trips paytable** (pays independently): RF 100, SF 50, Quads 20, FH 7, Flush 3, else loss

## Architecture

```
src/
  engine/                — standalone maths core (no external deps)
    cards.ts             — 0..51 card encoding, ranks, suits
    rng.ts               — ProductionRng (crypto.randomBytes) + SeededRng (xoshiro256** for tests)
    evaluator.ts         — 5-card evaluator + Omaha 2+3 wrapper
    payouts.ts           — qualifier + Blind + Trips paytables + resolveBets()
    game.ts              — playHand() orchestrator + Strategy interface
    index.ts             — barrel export
  http/                  — Fastify adapter over the engine
    session.ts           — in-memory session store
    schemas.ts           — Zod request schemas
    resolve.ts           — RESOLVED payload builder
    server.ts            — buildServer() + routes

api/
  index.ts               — Vercel serverless entry (wraps src/http/server.ts)

tests/
  core.test.ts           — Vitest unit tests (18)
  http.test.ts           — Fastify integration tests (15)
  parity_ref.py          — Python reference (mirror of TS, for parity diffing)
  parity_emit.ts         — emits hand-stream for TS side of parity diff
  summarise.py           — aggregate stats on a parity stream
```

### Exporting the engine standalone

The maths core is export-ready for certifier submission (iTechLabs / GLI) and for a future Rust port. Everything it needs lives inside `src/engine/`, with zero imports outside itself.

```bash
npm run build:engine     # emits JS + .d.ts to dist/engine/
```

## Parity testing

The key guarantee for this codebase: the TypeScript implementation produces **byte-for-byte identical hand outcomes** to the Python reference, given the same seed.

```bash
npx tsx tests/parity_emit.ts 42 10000 > /tmp/ts.txt
python tests/parity_ref.py 42 10000 > /tmp/py.txt
diff /tmp/ts.txt /tmp/py.txt        # must be empty
```

Both implementations use the same `xoshiro256**` RNG seeded from SplitMix64, the same Omaha 2+3 combinatorics, the same class-offset hand ranking scheme, and the same parity strategy (always check pre-flop and flop; river raise on pair+ else fold).

This is the foundation of trust for the maths. Any future change to the TS side must not break parity.

## Why the parity strategy and not the equity strategy

The equity-based strategy (raise at 50% pre-flop equity, 60% flop equity) is stochastic — it uses an inner Monte Carlo to estimate equity. Testing parity on a stochastic strategy is harder and not informative about the evaluator/paytables/qualifier.

The parity strategy is fully deterministic: given cards, the decision is fixed. That makes a pure deterministic diff the right tool, and it tests all the pieces that matter for certification: shuffle, evaluator, qualifier, paytables, bet resolution.

For the actual game the client drives decisions (player clicks buttons), so no strategy lives on the server at all. The strategy module is test-only.

## Next up

Read `PLAN.md` for the Phase 2 HTTP build plan and the Phase 3 client plan.
