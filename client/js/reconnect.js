/**
 * localStorage session persistence + reconnect UI helpers.
 *
 * Only the sessionId + createdAt is persisted — the server holds the
 * authoritative state. On reconnect we GET /session/:id and rehydrate.
 * If the server returns 404 we drop the stored id and reset to BETTING.
 */

const KEY = 'huoSession';
const TTL_MS = 30 * 60 * 1000;

export function loadStoredSession() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.sessionId !== 'string') return null;
    if (Date.now() - (parsed.createdAt ?? 0) > TTL_MS) {
      localStorage.removeItem(KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

export function storeSession(sessionId, stakes) {
  try {
    localStorage.setItem(KEY, JSON.stringify({
      sessionId,
      createdAt: Date.now(),
      stakes,
    }));
  } catch { /* ignore quota / private mode */ }
}

export function clearStoredSession() {
  try { localStorage.removeItem(KEY); } catch { /* ignore */ }
}

export function showErrorOverlay(root, title, body) {
  const overlay = root.querySelector('#error-overlay');
  if (!overlay) return;
  root.querySelector('#error-title').textContent = title;
  root.querySelector('#error-body').textContent = body;
  overlay.hidden = false;
}

export function hideErrorOverlay(root) {
  const overlay = root.querySelector('#error-overlay');
  if (overlay) overlay.hidden = true;
}
