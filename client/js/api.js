/**
 * Fetch wrapper for the six HUO endpoints.
 *
 * In dev the client runs on :8080 and Fastify runs on :3000, so API_BASE
 * points at the server directly. In production (single Vercel deploy) the
 * `/api` prefix keeps everything on one origin — set API_BASE to '' and the
 * endpoints become `/api/session/start` etc.
 *
 * Every call throws a typed ApiError on non-2xx; callers should catch and
 * surface the reconnect overlay.
 */

const DEV_API_BASE = 'http://localhost:3000';
// In production Vercel rewrites /healthz and /session/* straight into the
// serverless Fastify handler, so the client calls same-origin paths.
const PROD_API_BASE = '';

export function resolveApiBase() {
  if (typeof window === 'undefined') return DEV_API_BASE;
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host === '') return DEV_API_BASE;
  return PROD_API_BASE;
}

export class ApiError extends Error {
  constructor(message, { status = 0, kind = 'network', body = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.kind = kind;
    this.body = body;
  }
}

async function request(path, { method = 'GET', body, base } = {}) {
  const url = (base ?? resolveApiBase()) + path;
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { 'content-type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    throw new ApiError(`network error: ${err && err.message ? err.message : err}`, { kind: 'network' });
  }

  let payload = null;
  try { payload = await res.json(); } catch { /* non-JSON, leave null */ }

  if (!res.ok) {
    const kind = res.status === 404 ? 'not_found' : res.status >= 500 ? 'server' : 'bad_request';
    throw new ApiError(payload && payload.message ? payload.message : res.statusText, {
      status: res.status, kind, body: payload,
    });
  }
  return payload;
}

export const api = {
  health: () => request('/healthz'),
  startSession: (body) => request('/session/start', { method: 'POST', body }),
  getSession: (id) => request(`/session/${id}`),
  preflop: (id, action) => request(`/session/${id}/preflop`, { method: 'POST', body: { action } }),
  flop: (id, action) => request(`/session/${id}/flop`, { method: 'POST', body: { action } }),
  river: (id, action) => request(`/session/${id}/river`, { method: 'POST', body: { action } }),
};

/** Exposed for tests so we can swap the transport. */
export function _setRequestImpl(impl) { _impl = impl; }
let _impl = null;
export function _request(path, opts) { return _impl ? _impl(path, opts) : request(path, opts); }
