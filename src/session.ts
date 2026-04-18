/**
 * In-memory session store.
 *
 * Each hand in flight gets a UUID-keyed Session. Sessions expire 30 min after
 * creation; expired ones are reaped lazily on every access.
 *
 * Known limitation: this does NOT survive across Vercel serverless lambdas
 * (cold starts will lose state). Acceptable for the demo at low traffic /
 * single region. Move to Redis or Railway when it starts biting.
 */

import { randomUUID } from 'node:crypto';
import type { Card } from './cards.js';
import { makeDeck } from './cards.js';
import { shuffle, ProductionRng } from './rng.js';
import type { Street } from './game.js';

export type SessionState = 'PREFLOP' | 'FLOP' | 'RIVER' | 'RESOLVED';

export interface Session {
  id: string;
  createdAt: number;
  state: SessionState;
  anteStake: number;
  blindStake: number;
  tripsStake: number;
  playerHole: Card[];
  dealerHole: Card[];
  flop: Card[];
  turn: Card[];
  river: Card[];
  raisedStreet: Street | null;
  playMultiplier: number;
  folded: boolean;
}

export interface CreateSessionInput {
  anteStake: number;
  blindStake: number;
  tripsStake: number;
}

const TTL_MS = 30 * 60 * 1000;
const store = new Map<string, Session>();
const rng = new ProductionRng();

function reap(now: number): void {
  for (const [id, s] of store) {
    if (now - s.createdAt > TTL_MS) store.delete(id);
  }
}

export function createSession(input: CreateSessionInput): Session {
  const now = Date.now();
  reap(now);

  const deck = shuffle(makeDeck(), rng);
  const session: Session = {
    id: randomUUID(),
    createdAt: now,
    state: 'PREFLOP',
    anteStake: input.anteStake,
    blindStake: input.blindStake,
    tripsStake: input.tripsStake,
    playerHole: deck.slice(0, 4),
    dealerHole: deck.slice(4, 8),
    flop: deck.slice(8, 11),
    turn: deck.slice(11, 12),
    river: deck.slice(12, 13),
    raisedStreet: null,
    playMultiplier: 0,
    folded: false,
  };
  store.set(session.id, session);
  return session;
}

export function getSession(id: string): Session | null {
  reap(Date.now());
  return store.get(id) ?? null;
}

export function updateSession(id: string, patch: Partial<Session>): Session | null {
  const s = store.get(id);
  if (!s) return null;
  Object.assign(s, patch);
  return s;
}

export function deleteSession(id: string): void {
  store.delete(id);
}

export function _resetStoreForTests(): void {
  store.clear();
}
