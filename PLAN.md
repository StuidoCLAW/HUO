# Heads Up Omaha — Build Plan

Single source of truth for the overall build. Read this first.

---

## Product overview

**Heads Up Omaha (HUO)** is a heads-up casino poker variant, structured in the style of Playtech's Heads-Up Hold'em but using Pot-Limit Omaha (PLO4) as the base game. Single player vs. dealer, three decision points (pre-flop, flop, river), escalating Play bet, Ante + Blind mandatory, Trips optional side bet.

## Locked game design

| Parameter | Value |
|---|---|
| Variant | PLO4 (4 hole cards, use exactly 2 + 3 from board) |
| Mandatory bets | Ante + Blind (equal) |
| Optional bet | Trips side bet |
| Play multiplier | 3× pre-flop, 2× flop, 1× river |
| Dealer qualifier | Pair of 9s or better |
| Blind paytable | RF 100, SF 50, Quads 10, FH 3, Flush 1, else loss (push on win below flush) |
| Trips paytable | RF 100, SF 50, Quads 20, FH 7, Flush 3, else loss |
| Qualifier rule effect | Ante pushes if dealer doesn't qualify |

**Do not change any of these without explicit confirmation from Jake.** They are the result of multiple simulation iterations and are locked for v1.

## Current house edge

With the parity strategy (check-check-raise-pair) in 10k-hand sim: **~9.14%** on Ante+Blind stake. With a realistic equity-based player strategy the edge will sit higher — the maths is still being tuned. Do not quote a final house-edge number in user-facing copy until certification figures are locked.

---

## Architecture

Two repos, both deploy to Vercel:

- **`StuidoCLAW/huo-server`** — Node.js + TypeScript + Fastify. Owns all game state, RNG, evaluator, paytables. Exposes REST API. (Phase 1 done, Phase 2 to build.)
- **`StuidoCLAW/huo-client`** — Single-page HTML5 + vanilla JS. Renders the table UI, calls the server API. Deployed as a static site.

### Why this split

1. **Certifiability.** A server-side game engine can be certified once; the client is just a view layer. This is the shape Stake Engine expects.
2. **Anti-cheat.** The client never sees dealer cards or the board ahead of the server revealing them.
3. **Portability.** We can later swap the HTML client for a PixiJS/SvelteKit client, or an iOS WebKit wrapper, without touching the engine.

---

## Phase 1 — Maths Core ✅ COMPLETE

Done in `huo-server/src/`. See `huo-server/README.md` for detail.

Deliverables:
- [x] Card encoding (`cards.ts`)
- [x] Production + seeded RNG (`rng.ts`)
- [x] 5-card evaluator + Omaha 2+3 wrapper (`evaluator.ts`)
- [x] Qualifier + paytables + bet resolution (`payouts.ts`)
- [x] Game orchestration (`game.ts`)
- [x] 18/18 unit tests passing
- [x] 10k-hand parity test vs Python reference: **zero diffs**

---

## Phase 2 — HTTP layer (BUILD NEXT)

Add a Fastify server that exposes the game engine over REST. All logic lives in the engine; the HTTP layer is a thin adapter.

### Dependencies to add

```bash
npm install fastify @fastify/cors zod
npm install --save-dev @types/node tsx
```

### Files to create

#### `src/session.ts`

In-memory session store keyed by sessionId (UUID). TTL 30 min. Each session holds:

```ts
interface Session {
  id: string;
  createdAt: number;
  state: 'PREFLOP' | 'FLOP' | 'RIVER' | 'RESOLVED';
  anteStake: number;
  blindStake: number;  // must equal anteStake
  tripsStake: number;  // 0 if not placed
  playerHole: Card[];
  dealerHole: Card[];  // server-only, never sent until resolution
  flop: Card[];        // sent after flop decision
  turn: Card[];        // sent after flop decision
  river: Card[];       // sent after flop decision
  raisedStreet: 'preflop' | 'flop' | 'river' | null;
  playMultiplier: number;
}
```

Export functions: `createSession(input) -> Session`, `getSession(id) -> Session`, `updateSession(id, patch)`, `deleteSession(id)`. Reap expired sessions on each access.

#### `src/schemas.ts`

Zod schemas for every request body. Validate strictly.

```ts
export const StartSessionSchema = z.object({
  anteStake: z.number().positive().max(1000),
  blindStake: z.number().positive().max(1000),
  tripsStake: z.number().nonnegative().max(1000).optional(),
  balance: z.number().nonnegative(),  // for affordability check
});

export const StreetActionSchema = z.object({
  action: z.enum(['raise', 'check', 'fold']),
});
```

#### `src/server.ts`

Fastify app. Routes:

- `POST /session/start` — validates input, asserts ante==blind, asserts balance >= ante+blind+trips, creates session, deals all cards (kept server-side), returns `{sessionId, playerHole, state: 'PREFLOP'}`.

- `POST /session/:id/preflop` — body is `{action: 'raise' | 'check'}`. If raise: set playMultiplier=3, raisedStreet='preflop', resolve showdown, return full resolution. If check: return `{flop, state: 'FLOP'}` (turn and river stay hidden).

- `POST /session/:id/flop` — body is `{action: 'raise' | 'check'}`. If raise: set playMultiplier=2, raisedStreet='flop', resolve, return full resolution. If check: return `{turn, river, state: 'RIVER'}`.

- `POST /session/:id/river` — body is `{action: 'raise' | 'fold'}`. Either way, resolve and return full resolution. Raise sets playMultiplier=1, raisedStreet='river'. Fold sets folded=true.

- `GET /session/:id` — returns current public state (for reconnection after disconnect). Never returns dealerHole or hidden board cards unless state is RESOLVED.

- `GET /healthz` — returns `{ok: true, version: '0.1.0'}`.

Resolution response format:

```ts
{
  state: 'RESOLVED',
  dealerHole: Card[],
  board: Card[],
  playerHand: { class: HandClass, className: string, cards: Card[] },
  dealerHand: { class: HandClass, className: string, cards: Card[] },
  dealerQualified: boolean,
  tie: boolean,
  playerWon: boolean,
  payouts: { ante: number, blind: number, play: number, trips: number },
  totalReturn: number,  // sum of stake returns (stake + payout or -stake)
}
```

### Rules on the HTTP layer

1. **Every illegal state transition is a 400.** E.g. posting to `/flop` when state is PREFLOP is rejected. The session state machine is enforced server-side.
2. **Every internal error is a 500 with no stack trace.** Log stack traces server-side only.
3. **CORS is locked to the client origin.** `@fastify/cors` with `origin: process.env.CLIENT_ORIGIN` (e.g. `https://huo-client.vercel.app`). For local dev, `http://localhost:5173`.
4. **Rate limit**: 10 req/sec per IP via `@fastify/rate-limit`. Prevents brute forcing of new sessions.
5. **No logging of card data in production.** Sessions log `{id, state, createdAt}` only.

### Vercel deployment

Vercel runs Node via serverless functions. Key gotcha: serverless is stateless, so in-memory session store won't survive across lambdas. For the demo we can get away with it (low traffic, single region), but mark this as a known limitation in `README.md` under "Known issues".

Create `api/index.ts` as the Vercel entry point that wraps the Fastify app:

```ts
import { buildServer } from '../src/server.js';
export default async function handler(req, res) {
  const app = buildServer();
  await app.ready();
  app.server.emit('request', req, res);
}
```

Deployment target filename: `vercel.json` with `{"rewrites": [{"source": "/(.*)", "destination": "/api/index"}]}`.

When we hit serverless session-loss issues, move to Railway (persistent Node) or add Redis. Don't pre-optimise.

### Phase 2 tests to add

- Integration tests via `fastify.inject()` (no HTTP, in-process) in `tests/http.test.ts`.
- Round-trip a full game (start → check → check → raise → resolved).
- Test illegal transitions return 400.
- Test that `GET /session/:id` hides dealer cards until resolved.

### Acceptance criteria for Phase 2

- All tests pass (Phase 1 + Phase 2).
- `curl localhost:3000/healthz` returns `{ok:true,...}`.
- A hand-coded client script can play a full hand end-to-end via fetch().
- Vercel deployment returns 200 on `/healthz`.

---

## Phase 3 — Client (PARALLEL OR AFTER PHASE 2)

Separate repo: `StuidoCLAW/huo-client`.

### Tech stack

- Vanilla HTML5 + CSS3 + JS (ES modules)
- Single-page app, no build step initially (can add Vite later)
- `fetch()` for API calls — no framework
- CSS transitions for card/chip animation
- Deployed as static files to Vercel

### Layout

The table renders to match the approved v2 mockup (see `mockups/HUO-Mockup-v2-Premium.png` in design notes). Key UI regions:

- Top HUD: menu, timers, close button
- Felt centre: logo, qualifier arch, paytables (Trips left, Blind right), Min/Max plaque, betting spot cluster, card slots for player and dealer, community board slot
- Bottom: chip selector, balance, status line, total bet
- Over-felt card slots: dealer 4 hole cards (top), community board (centre, 5 slots), player 4 hole cards (bottom)

### State flow

1. **BETTING**: player clicks chip denominations, clicks betting spots to place chips. Action buttons hidden.
2. Player clicks DEAL. Client calls `POST /session/start`. Server returns playerHole. Client animates dealing 4 cards to the player slot, 4 face-down to the dealer slot.
3. **PREFLOP**: Action buttons show CHECK and RAISE 3×.
   - RAISE: call `/preflop {raise}`, server returns resolution, reveal flop/turn/river and dealer cards with animation, resolve.
   - CHECK: call `/preflop {check}`, server returns flop, animate flop deal to board, proceed to FLOP state.
4. **FLOP**: CHECK and RAISE 2×. Same pattern.
5. **RIVER**: RAISE 1× and FOLD.
6. **RESOLVE**: Display win/loss, animate chip movement (wins flow to player, losses flow to dealer). "Next hand" button appears.

### Key client-side behaviours

- **Client never stores dealer cards until server sends them.** No cheating possible.
- **Balance is tracked client-side for UI responsiveness, but reconciled with server returns.**
- **Disconnect handling**: if a network error occurs mid-hand, offer a "Reconnect" button that calls `GET /session/:id` with the stored sessionId.
- **Chip selection**: selected denomination is applied to each click on a betting spot. Click spot again to add another chip. Right-click (or long-press on mobile) removes a chip.

### Acceptance criteria for Phase 3

- Full game loop playable end-to-end.
- Cards deal with a smooth CSS transition (not instant).
- Wins/losses animate chip movement.
- Deploys cleanly to Vercel.
- Works in Chrome, Safari, Firefox on desktop; Safari and Chrome on iOS.

---

## Phase 4 — Polish (after Phase 3)

- Hand strength indicator ("Your best hand: Straight A-K-Q-J-T") updating live as board develops
- Sound effects (card flip, chip click, win chime)
- Mobile portrait layout (rearrange felt for vertical viewport)
- Session history panel
- Screen reader support

---

## Non-goals for v1

Explicit list of what we are **not** building now, so scope creep is avoided:

- Real money handling / payments
- Authentication / accounts / KYC
- Responsible gambling panel
- Multi-table / lobby
- Live dealer streaming
- Certification-ready RNG (we use `crypto.randomBytes` which is strong but not certified)
- Multi-currency support
- Tournament mode
- Social features

When we're ready for Stake Engine submission, these get their own planning document. Right now: playable product, playable fast.

---

## For Claude Code

When continuing this build:

1. **Read `PLAN.md` (this file) and `huo-server/README.md` first.**
2. **Do not change locked game parameters** (paytables, qualifier, multipliers) without explicit Jake confirmation.
3. **Do not break parity.** Before committing any change to `src/evaluator.ts`, `src/payouts.ts`, `src/game.ts`, or `src/rng.ts`, re-run the parity test:
   ```bash
   npx tsx tests/parity_emit.ts 42 10000 > /tmp/ts.txt
   python tests/parity_ref.py 42 10000 > /tmp/py.txt
   diff /tmp/ts.txt /tmp/py.txt  # must be empty
   ```
4. **Prefer small, testable commits.** Every new feature gets a Vitest test.
5. **British English in UI copy** (colour, centre, optimise). British £ as default currency.
6. **One change at a time, verify, then move on.** Jake's working style — repeated throughout the design sessions.
7. **If in doubt, ask before building.** Especially on game rules or paytable changes.
