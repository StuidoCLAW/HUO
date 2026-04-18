/**
 * Vercel serverless entry point.
 *
 * Each cold-start lambda builds a fresh Fastify instance. In-memory sessions
 * are isolated per lambda — acceptable for the demo (low traffic, single
 * region); move to Redis when that bites.
 */

import type { IncomingMessage, ServerResponse } from 'node:http';
import { buildServer } from '../src/http/server.js';

let appPromise: ReturnType<typeof buildAndReady> | null = null;

function buildAndReady() {
  const app = buildServer();
  return app.ready().then(() => app);
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  if (!appPromise) appPromise = buildAndReady();
  const app = await appPromise;
  app.server.emit('request', req, res);
}
