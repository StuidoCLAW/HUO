/**
 * Integration tests for the Fastify HTTP layer.
 * Uses fastify.inject() — no real network, no real port.
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildServer, VERSION } from '../src/server.js';
import { _resetStoreForTests } from '../src/session.js';

async function newApp() {
  const app = buildServer();
  await app.ready();
  return app;
}

async function startSession(app: Awaited<ReturnType<typeof newApp>>, opts?: {
  ante?: number; blind?: number; trips?: number; balance?: number;
}) {
  const res = await app.inject({
    method: 'POST',
    url: '/session/start',
    payload: {
      anteStake: opts?.ante ?? 5,
      blindStake: opts?.blind ?? 5,
      tripsStake: opts?.trips ?? 0,
      balance: opts?.balance ?? 1000,
    },
  });
  return res;
}

beforeEach(() => {
  _resetStoreForTests();
});

describe('GET /healthz', () => {
  it('returns ok + version', async () => {
    const app = await newApp();
    const res = await app.inject({ method: 'GET', url: '/healthz' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ ok: true, version: VERSION });
    await app.close();
  });
});

describe('POST /session/start', () => {
  it('creates a session and returns playerHole in PREFLOP state', async () => {
    const app = await newApp();
    const res = await startSession(app);
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.state).toBe('PREFLOP');
    expect(body.sessionId).toMatch(/^[0-9a-f-]{36}$/);
    expect(body.playerHole).toHaveLength(4);
    expect(body).not.toHaveProperty('dealerHole');
    expect(body).not.toHaveProperty('flop');
    await app.close();
  });

  it('rejects mismatched ante/blind', async () => {
    const app = await newApp();
    const res = await startSession(app, { ante: 5, blind: 10 });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('rejects insufficient balance', async () => {
    const app = await newApp();
    const res = await startSession(app, { ante: 100, blind: 100, balance: 50 });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('rejects invalid body', async () => {
    const app = await newApp();
    const res = await app.inject({
      method: 'POST',
      url: '/session/start',
      payload: { anteStake: -5, blindStake: 5, balance: 100 },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });
});

describe('state machine', () => {
  it('check → check → raise plays a full hand and resolves', async () => {
    const app = await newApp();
    const start = await startSession(app);
    const id = start.json().sessionId;

    const pre = await app.inject({
      method: 'POST', url: `/session/${id}/preflop`, payload: { action: 'check' },
    });
    expect(pre.statusCode).toBe(200);
    expect(pre.json().state).toBe('FLOP');
    expect(pre.json().flop).toHaveLength(3);

    const flop = await app.inject({
      method: 'POST', url: `/session/${id}/flop`, payload: { action: 'check' },
    });
    expect(flop.statusCode).toBe(200);
    expect(flop.json().state).toBe('RIVER');
    expect(flop.json().turn).toHaveLength(1);
    expect(flop.json().river).toHaveLength(1);

    const river = await app.inject({
      method: 'POST', url: `/session/${id}/river`, payload: { action: 'raise' },
    });
    expect(river.statusCode).toBe(200);
    const body = river.json();
    expect(body.state).toBe('RESOLVED');
    expect(body.dealerHole).toHaveLength(4);
    expect(body.board).toHaveLength(5);
    expect(body.playMultiplier).toBe(1);
    expect(body.raisedStreet).toBe('river');
    expect(body.payouts).toBeDefined();
    expect(typeof body.totalReturn).toBe('number');
    await app.close();
  });

  it('preflop raise resolves immediately with 3x multiplier', async () => {
    const app = await newApp();
    const start = await startSession(app);
    const id = start.json().sessionId;

    const res = await app.inject({
      method: 'POST', url: `/session/${id}/preflop`, payload: { action: 'raise' },
    });
    expect(res.statusCode).toBe(200);
    expect(res.json().state).toBe('RESOLVED');
    expect(res.json().playMultiplier).toBe(3);
    expect(res.json().raisedStreet).toBe('preflop');
    await app.close();
  });

  it('river fold resolves with folded=true and -ante,-blind', async () => {
    const app = await newApp();
    const start = await startSession(app, { ante: 10, blind: 10 });
    const id = start.json().sessionId;

    await app.inject({ method: 'POST', url: `/session/${id}/preflop`, payload: { action: 'check' } });
    await app.inject({ method: 'POST', url: `/session/${id}/flop`, payload: { action: 'check' } });
    const res = await app.inject({
      method: 'POST', url: `/session/${id}/river`, payload: { action: 'fold' },
    });

    const body = res.json();
    expect(body.state).toBe('RESOLVED');
    expect(body.folded).toBe(true);
    expect(body.payouts.ante).toBe(-10);
    expect(body.payouts.blind).toBe(-10);
    expect(body.payouts.play).toBe(0);
    await app.close();
  });
});

describe('illegal transitions', () => {
  it('POST /flop on a PREFLOP session is 400', async () => {
    const app = await newApp();
    const start = await startSession(app);
    const id = start.json().sessionId;

    const res = await app.inject({
      method: 'POST', url: `/session/${id}/flop`, payload: { action: 'check' },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('POST /preflop twice is 400', async () => {
    const app = await newApp();
    const start = await startSession(app);
    const id = start.json().sessionId;

    await app.inject({ method: 'POST', url: `/session/${id}/preflop`, payload: { action: 'check' } });
    const res = await app.inject({
      method: 'POST', url: `/session/${id}/preflop`, payload: { action: 'check' },
    });
    expect(res.statusCode).toBe(400);
    await app.close();
  });

  it('unknown session id is 404', async () => {
    const app = await newApp();
    const res = await app.inject({
      method: 'POST',
      url: '/session/00000000-0000-0000-0000-000000000000/preflop',
      payload: { action: 'check' },
    });
    expect(res.statusCode).toBe(404);
    await app.close();
  });
});

describe('GET /session/:id information hiding', () => {
  it('hides dealerHole and later board cards in PREFLOP', async () => {
    const app = await newApp();
    const start = await startSession(app);
    const id = start.json().sessionId;

    const res = await app.inject({ method: 'GET', url: `/session/${id}` });
    const body = res.json();
    expect(body.state).toBe('PREFLOP');
    expect(body.playerHole).toHaveLength(4);
    expect(body).not.toHaveProperty('dealerHole');
    expect(body).not.toHaveProperty('flop');
    expect(body).not.toHaveProperty('turn');
    expect(body).not.toHaveProperty('river');
    await app.close();
  });

  it('exposes flop only after preflop check', async () => {
    const app = await newApp();
    const start = await startSession(app);
    const id = start.json().sessionId;

    await app.inject({ method: 'POST', url: `/session/${id}/preflop`, payload: { action: 'check' } });
    const res = await app.inject({ method: 'GET', url: `/session/${id}` });
    const body = res.json();
    expect(body.state).toBe('FLOP');
    expect(body.flop).toHaveLength(3);
    expect(body).not.toHaveProperty('turn');
    expect(body).not.toHaveProperty('river');
    expect(body).not.toHaveProperty('dealerHole');
    await app.close();
  });

  it('exposes dealerHole only at RESOLVED', async () => {
    const app = await newApp();
    const start = await startSession(app);
    const id = start.json().sessionId;

    await app.inject({ method: 'POST', url: `/session/${id}/preflop`, payload: { action: 'raise' } });
    const res = await app.inject({ method: 'GET', url: `/session/${id}` });
    const body = res.json();
    expect(body.state).toBe('RESOLVED');
    expect(body.dealerHole).toHaveLength(4);
    expect(body.board).toHaveLength(5);
    await app.close();
  });
});

describe('trips side bet', () => {
  it('applies trips stake to payout on resolve', async () => {
    const app = await newApp();
    const start = await startSession(app, { ante: 5, blind: 5, trips: 5, balance: 100 });
    const id = start.json().sessionId;

    await app.inject({ method: 'POST', url: `/session/${id}/preflop`, payload: { action: 'check' } });
    await app.inject({ method: 'POST', url: `/session/${id}/flop`, payload: { action: 'check' } });
    const res = await app.inject({
      method: 'POST', url: `/session/${id}/river`, payload: { action: 'raise' },
    });

    const body = res.json();
    // trips stake was 5, so payout is multiple of 5 (-5, 15, 35, 100, 250, 500)
    expect([-5, 15, 35, 100, 250, 500]).toContain(body.payouts.trips);
    await app.close();
  });
});
