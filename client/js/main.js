/**
 * Bootstraps the table: wires chip rack, bet spots, action bar buttons,
 * and the API → state → render loop. Also handles reconnect on load.
 */

import { api, ApiError } from './api.js';
import { createChipStore, renderChipRack, bindBetSpots, readTotals } from './chips.js';
import {
  initialState,
  applyStartResponse,
  applyFlopReveal,
  applyRiverReveal,
  applyResolution,
  applyReconnect,
  applyNewHand,
  creditResolution,
} from './state.js';
import {
  renderBetting,
  renderPreflop,
  renderFlop,
  renderRiver,
  renderResolved,
  renderActionBar,
  renderHud,
  renderStatus,
} from './render.js';
import {
  loadStoredSession,
  storeSession,
  clearStoredSession,
  showErrorOverlay,
  hideErrorOverlay,
} from './reconnect.js';

const root = document.getElementById('table');
const chipStore = createChipStore(5);
let state = initialState();

renderChipRack(document.getElementById('chip-rack'), chipStore);

bindBetSpots(root, chipStore, {
  getLocked: () => state.phase !== 'BETTING',
  onChange: () => {
    renderHud(root, state);
    renderActionBar(root, state, handlers);
  },
});

const handlers = {
  onDeal: async () => {
    const totals = readTotals(root);
    if (totals.ante < 1 || totals.ante !== totals.blind) return;
    if (state.balance < totals.ante + totals.blind + totals.trips) {
      renderStatus(root, 'Insufficient balance for that bet.');
      return;
    }
    try {
      const payload = await api.startSession({
        anteStake: totals.ante,
        blindStake: totals.blind,
        tripsStake: totals.trips,
        balance: state.balance,
      });
      state = applyStartResponse(state, payload, {
        ante: totals.ante, blind: totals.blind, trips: totals.trips,
      });
      state = { ...state, balance: state.balance - totals.ante - totals.blind - totals.trips };
      storeSession(state.sessionId, state.stakes);
      renderPreflop(root, state);
      renderHud(root, state);
      renderActionBar(root, state, handlers);
    } catch (err) { handleApiError(err); }
  },

  onPreflopCheck: async () => {
    try {
      const payload = await api.preflop(state.sessionId, 'check');
      state = applyFlopReveal(state, payload);
      renderFlop(root, state);
      renderActionBar(root, state, handlers);
    } catch (err) { handleApiError(err); }
  },

  onPreflopRaise: async () => {
    try {
      const payload = await api.preflop(state.sessionId, 'raise');
      await settleResolution(payload);
    } catch (err) { handleApiError(err); }
  },

  onFlopCheck: async () => {
    try {
      const payload = await api.flop(state.sessionId, 'check');
      state = applyRiverReveal(state, payload);
      renderRiver(root, state);
      renderActionBar(root, state, handlers);
    } catch (err) { handleApiError(err); }
  },

  onFlopRaise: async () => {
    try {
      const payload = await api.flop(state.sessionId, 'raise');
      await settleResolution(payload);
    } catch (err) { handleApiError(err); }
  },

  onRiverFold: async () => {
    try {
      const payload = await api.river(state.sessionId, 'fold');
      await settleResolution(payload);
    } catch (err) { handleApiError(err); }
  },

  onRiverRaise: async () => {
    try {
      const payload = await api.river(state.sessionId, 'raise');
      await settleResolution(payload);
    } catch (err) { handleApiError(err); }
  },

  onNewHand: () => {
    state = applyNewHand(state.balance);
    renderBetting(root, state);
    renderHud(root, state);
    renderActionBar(root, state, handlers);
  },
};

async function settleResolution(payload) {
  state = applyResolution(state, payload);
  state = creditResolution(state, payload);
  clearStoredSession();
  await renderResolved(root, state);
  renderHud(root, state);
  renderActionBar(root, state, handlers);
}

function handleApiError(err) {
  state = { ...state, lastError: err };
  if (err instanceof ApiError && err.kind === 'not_found') {
    clearStoredSession();
    state = applyNewHand(state.balance);
    renderBetting(root, state);
    renderHud(root, state);
    renderActionBar(root, state, handlers);
    renderStatus(root, 'Session expired. Starting a new hand.');
    return;
  }
  const msg = err && err.message ? err.message : 'Unknown error.';
  showErrorOverlay(root, 'Connection lost', msg);
}

document.getElementById('reconnect-btn')?.addEventListener('click', async () => {
  const stored = loadStoredSession();
  if (!stored) {
    hideErrorOverlay(root);
    state = applyNewHand(state.balance);
    renderBetting(root, state);
    renderActionBar(root, state, handlers);
    return;
  }
  try {
    const payload = await api.getSession(stored.sessionId);
    state = applyReconnect(state, payload);
    hideErrorOverlay(root);
    if (state.phase === 'PREFLOP') renderPreflop(root, state);
    else if (state.phase === 'FLOP') { renderPreflop(root, state); renderFlop(root, state); }
    else if (state.phase === 'RIVER') { renderPreflop(root, state); renderFlop(root, state); renderRiver(root, state); }
    else if (state.phase === 'RESOLVED') { renderPreflop(root, state); await renderResolved(root, state); }
    renderHud(root, state);
    renderActionBar(root, state, handlers);
  } catch (err) {
    handleApiError(err);
  }
});

document.getElementById('new-hand-btn')?.addEventListener('click', () => {
  clearStoredSession();
  hideErrorOverlay(root);
  state = applyNewHand(state.balance);
  renderBetting(root, state);
  renderHud(root, state);
  renderActionBar(root, state, handlers);
});

// Initial render.
renderBetting(root, state);
renderActionBar(root, state, handlers);

// Attempt reconnect on load if we have a stored session.
const stored = loadStoredSession();
if (stored) {
  api.getSession(stored.sessionId).then((payload) => {
    state = applyReconnect(state, payload);
    if (state.phase === 'RESOLVED') { renderPreflop(root, state); renderResolved(root, state); }
    else if (state.phase === 'RIVER') { renderPreflop(root, state); renderFlop(root, state); renderRiver(root, state); }
    else if (state.phase === 'FLOP') { renderPreflop(root, state); renderFlop(root, state); }
    else if (state.phase === 'PREFLOP') renderPreflop(root, state);
    renderHud(root, state);
    renderActionBar(root, state, handlers);
  }).catch(() => {
    clearStoredSession();
  });
}

// Export bootstrap internals for tests.
export const _test = { getState: () => state, handlers };
