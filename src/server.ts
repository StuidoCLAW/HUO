/**
 * Fastify HTTP layer over the game engine.
 *
 * - All state transitions enforced server-side (illegal = 400).
 * - Dealer hole + hidden board never sent until state === RESOLVED.
 * - No stack traces leak on 5xx (production mode).
 * - CORS locked to CLIENT_ORIGIN env var, defaults to localhost:8080 for dev.
 * - Rate limit: 10 req/sec per IP.
 */

import Fastify, { type FastifyInstance, type FastifyReply } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';

import {
  StartSessionSchema,
  PreflopActionSchema,
  FlopActionSchema,
  RiverActionSchema,
} from './schemas.js';
import {
  createSession,
  getSession,
  updateSession,
  type Session,
} from './session.js';
import { buildResolution, type Resolution } from './resolve.js';

export const VERSION = '0.1.0';

function badRequest(reply: FastifyReply, message: string): FastifyReply {
  return reply.code(400).send({ error: 'bad_request', message });
}

function notFound(reply: FastifyReply, message: string): FastifyReply {
  return reply.code(404).send({ error: 'not_found', message });
}

/** Trim a session to what's safe to send at its current state. */
function publicSessionView(s: Session) {
  const base = {
    sessionId: s.id,
    state: s.state,
    anteStake: s.anteStake,
    blindStake: s.blindStake,
    tripsStake: s.tripsStake,
    playerHole: s.playerHole,
  };
  if (s.state === 'PREFLOP') return base;
  if (s.state === 'FLOP') return { ...base, flop: s.flop };
  if (s.state === 'RIVER') {
    return { ...base, flop: s.flop, turn: s.turn, river: s.river };
  }
  return { ...base, ...buildResolution(s) };
}

export function buildServer(): FastifyInstance {
  const app = Fastify({
    logger: { level: process.env.LOG_LEVEL ?? 'warn' },
    disableRequestLogging: true,
  });

  app.register(cors, {
    origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:8080',
    methods: ['GET', 'POST', 'OPTIONS'],
  });

  app.register(rateLimit, {
    max: 10,
    timeWindow: '1 second',
  });

  app.setErrorHandler((err, req, reply) => {
    req.log.error({ err }, 'unhandled');
    const hasValidation =
      typeof err === 'object' && err !== null && 'validation' in err;
    if (hasValidation) {
      reply.code(400).send({ error: 'bad_request', message: 'invalid body' });
      return;
    }
    reply.code(500).send({ error: 'internal' });
  });

  app.get('/healthz', async () => ({ ok: true, version: VERSION }));

  app.post('/session/start', async (req, reply) => {
    const parsed = StartSessionSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(reply, 'invalid body');

    const { anteStake, blindStake, tripsStake = 0, balance } = parsed.data;
    if (anteStake !== blindStake) {
      return badRequest(reply, 'anteStake must equal blindStake');
    }
    if (balance < anteStake + blindStake + tripsStake) {
      return badRequest(reply, 'insufficient balance');
    }

    const session = createSession({ anteStake, blindStake, tripsStake });
    return {
      sessionId: session.id,
      state: session.state,
      playerHole: session.playerHole,
    };
  });

  app.get('/session/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const s = getSession(id);
    if (!s) return notFound(reply, 'session not found');
    return publicSessionView(s);
  });

  app.post('/session/:id/preflop', async (req, reply) => {
    const { id } = req.params as { id: string };
    const s = getSession(id);
    if (!s) return notFound(reply, 'session not found');
    if (s.state !== 'PREFLOP') {
      return badRequest(reply, `illegal transition: state is ${s.state}`);
    }
    const parsed = PreflopActionSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(reply, 'invalid body');

    if (parsed.data.action === 'raise') {
      updateSession(id, {
        state: 'RESOLVED',
        raisedStreet: 'preflop',
        playMultiplier: 3,
      });
      return toResolution(id);
    }
    updateSession(id, { state: 'FLOP' });
    return { state: 'FLOP', flop: s.flop };
  });

  app.post('/session/:id/flop', async (req, reply) => {
    const { id } = req.params as { id: string };
    const s = getSession(id);
    if (!s) return notFound(reply, 'session not found');
    if (s.state !== 'FLOP') {
      return badRequest(reply, `illegal transition: state is ${s.state}`);
    }
    const parsed = FlopActionSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(reply, 'invalid body');

    if (parsed.data.action === 'raise') {
      updateSession(id, {
        state: 'RESOLVED',
        raisedStreet: 'flop',
        playMultiplier: 2,
      });
      return toResolution(id);
    }
    updateSession(id, { state: 'RIVER' });
    return { state: 'RIVER', turn: s.turn, river: s.river };
  });

  app.post('/session/:id/river', async (req, reply) => {
    const { id } = req.params as { id: string };
    const s = getSession(id);
    if (!s) return notFound(reply, 'session not found');
    if (s.state !== 'RIVER') {
      return badRequest(reply, `illegal transition: state is ${s.state}`);
    }
    const parsed = RiverActionSchema.safeParse(req.body);
    if (!parsed.success) return badRequest(reply, 'invalid body');

    if (parsed.data.action === 'raise') {
      updateSession(id, {
        state: 'RESOLVED',
        raisedStreet: 'river',
        playMultiplier: 1,
      });
    } else {
      updateSession(id, { state: 'RESOLVED', folded: true });
    }
    return toResolution(id);
  });

  return app;
}

function toResolution(id: string): Resolution {
  const s = getSession(id);
  if (!s) throw new Error('session vanished mid-resolve');
  return buildResolution(s);
}

// Direct-run entry point: `tsx src/server.ts` or `npm run dev`.
// Vercel uses api/index.ts instead.
const isDirect = import.meta.url === `file://${process.argv[1]}`;
if (isDirect) {
  const app = buildServer();
  const port = Number(process.env.PORT ?? 3000);
  app.listen({ port, host: '0.0.0.0' }).then(() => {
    console.log(`huo-server listening on :${port}`);
  });
}
