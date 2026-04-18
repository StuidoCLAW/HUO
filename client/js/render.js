/**
 * Render functions — one per state. Each mutates the DOM from a state object.
 *
 * Any data the server doesn't send yet (dealer hole, unrevealed board) stays
 * as a face-down card back. This is mirrored by the server's information
 * hiding — the client couldn't cheat here even if it wanted to.
 */

import { buildCardElement } from './cards.js';
import { mountCard, flipCard, winFlash } from './animate.js';
import { readTotals, resetBetSpots, setSpot } from './chips.js';

function fmt(n) {
  const sign = n < 0 ? '-£' : '£';
  return sign + Math.abs(n);
}

export function renderHud(root, state) {
  root.dataset.state = state.phase;
  root.querySelector('#balance').textContent = fmt(state.balance);
  const totals = readTotals(root);
  const bet = totals.ante + totals.blind + totals.trips + totals.play;
  root.querySelector('#total-bet').textContent = fmt(bet);
}

export function renderStatus(root, msg) {
  const s = root.querySelector('#status-line');
  if (s) s.textContent = msg;
}

function slotFor(root, name) {
  return root.querySelector(`[data-slot="${name}"]`);
}

export function mountFaceDown(slotEl) {
  if (!slotEl) return;
  slotEl.textContent = '';
  slotEl.appendChild(buildCardElement(null, { faceUp: false }));
}

export function renderBetting(root, state) {
  resetBetSpots(root);
  for (let i = 0; i < 4; i++) {
    const slot = slotFor(root, `dealer-${i}`);
    if (slot) slot.textContent = '';
  }
  for (let i = 0; i < 4; i++) {
    const slot = slotFor(root, `player-${i}`);
    if (slot) slot.textContent = '';
  }
  for (let i = 0; i < 5; i++) {
    const slot = slotFor(root, `board-${i}`);
    if (slot) slot.textContent = '';
  }
  const banner = root.querySelector('#result-banner');
  if (banner) banner.hidden = true;
  renderHud(root, state);
  renderStatus(root, 'Place your ante and blind, then DEAL.');
}

export function renderPreflop(root, state) {
  setSpot(root, 'ante', state.stakes.ante);
  setSpot(root, 'blind', state.stakes.blind);
  setSpot(root, 'trips', state.stakes.trips);
  setSpot(root, 'play', 0);
  // Player hole: face up
  (state.playerHole || []).forEach((cardId, i) => {
    const slot = slotFor(root, `player-${i}`);
    if (slot) mountCard(slot, cardId, { faceUp: true, withDealAnimation: true });
  });
  // Dealer hole: face down
  for (let i = 0; i < 4; i++) {
    const slot = slotFor(root, `dealer-${i}`);
    if (slot) mountCard(slot, null, { faceUp: false, withDealAnimation: true });
  }
  // Board slots: face down placeholders
  for (let i = 0; i < 5; i++) {
    const slot = slotFor(root, `board-${i}`);
    if (slot) mountCard(slot, null, { faceUp: false, withDealAnimation: false });
  }
  renderHud(root, state);
  renderStatus(root, 'Check to see the flop, or raise 3× now.');
}

export function renderFlop(root, state) {
  (state.flop || []).forEach((cardId, i) => {
    const slot = slotFor(root, `board-${i}`);
    if (slot) mountCard(slot, cardId, { faceUp: true, withDealAnimation: true });
  });
  renderStatus(root, 'Check for the river, or raise 2× now.');
}

export function renderRiver(root, state) {
  const turn = state.turn?.[0];
  const river = state.river?.[0];
  if (turn != null) {
    const slot = slotFor(root, 'board-3');
    if (slot) mountCard(slot, turn, { faceUp: true, withDealAnimation: true });
  }
  if (river != null) {
    const slot = slotFor(root, 'board-4');
    if (slot) mountCard(slot, river, { faceUp: true, withDealAnimation: true });
  }
  renderStatus(root, 'Raise 1× to see the showdown, or fold.');
}

export async function renderResolved(root, state) {
  const r = state.resolution;
  if (!r) return;

  // Reveal any not-yet-dealt board cards.
  if (r.board?.length === 5) {
    const seenCount = (state.flop?.length || 0) + (state.turn?.length || 0) + (state.river?.length || 0);
    for (let i = seenCount; i < 5; i++) {
      const slot = slotFor(root, `board-${i}`);
      if (slot) await flipCard(slot, r.board[i]);
    }
  }

  // Flip dealer hole cards one by one.
  for (let i = 0; i < 4; i++) {
    const slot = slotFor(root, `dealer-${i}`);
    if (slot) await flipCard(slot, r.dealerHole[i]);
  }

  setSpot(root, 'play', r.playMultiplier * state.stakes.ante);

  const banner = root.querySelector('#result-banner');
  const head = root.querySelector('#result-headline');
  const detail = root.querySelector('#result-detail');
  if (banner && head && detail) {
    if (r.folded) {
      head.textContent = 'Folded';
      detail.textContent = `Lost ${fmt(Math.abs(r.payouts.ante + r.payouts.blind))}`;
    } else if (r.tie) {
      head.textContent = 'Push';
      detail.textContent = `Ante & play returned. Net ${fmt(r.totalReturn)}.`;
    } else if (r.playerWon) {
      head.textContent = 'You win';
      detail.textContent = `${r.playerHand.className} beats ${r.dealerHand.className}. Net ${fmt(r.totalReturn)}.`;
    } else {
      head.textContent = 'Dealer wins';
      detail.textContent = r.dealerQualified
        ? `${r.dealerHand.className} beats ${r.playerHand.className}. Net ${fmt(r.totalReturn)}.`
        : `Dealer didn't qualify. Net ${fmt(r.totalReturn)}.`;
    }
    banner.hidden = false;
  }

  // Flash the winning bet spots.
  if (!r.folded && r.payouts.ante > 0) winFlash(root.querySelector('[data-spot="ante"]'));
  if (!r.folded && r.payouts.blind > 0) winFlash(root.querySelector('[data-spot="blind"]'));
  if (r.payouts.play > 0) winFlash(root.querySelector('[data-spot="play"]'));
  if (r.payouts.trips > 0) winFlash(root.querySelector('[data-spot="trips"]'));

  renderHud(root, state);
  renderStatus(root, 'Click NEW HAND to deal again.');
}

export function renderActionBar(root, state, handlers) {
  const bar = root.querySelector('#action-bar');
  bar.textContent = '';

  const btn = (label, cls, onClick, disabled = false) => {
    const b = document.createElement('button');
    b.className = 'btn ' + cls;
    b.textContent = label;
    b.disabled = disabled;
    b.addEventListener('click', onClick);
    bar.appendChild(b);
    return b;
  };

  switch (state.phase) {
    case 'BETTING': {
      const totals = readTotals(root);
      const canDeal = totals.ante >= 1 && totals.ante <= 100 && totals.blind === totals.ante;
      btn('DEAL', 'btn-primary', handlers.onDeal, !canDeal || !!state.lastError);
      break;
    }
    case 'PREFLOP':
      btn('CHECK', 'btn-ghost', handlers.onPreflopCheck);
      btn('RAISE 3×', 'btn-primary', handlers.onPreflopRaise);
      break;
    case 'FLOP':
      btn('CHECK', 'btn-ghost', handlers.onFlopCheck);
      btn('RAISE 2×', 'btn-primary', handlers.onFlopRaise);
      break;
    case 'RIVER':
      btn('FOLD', 'btn-danger', handlers.onRiverFold);
      btn('RAISE 1×', 'btn-primary', handlers.onRiverRaise);
      break;
    case 'RESOLVED':
      btn('NEW HAND', 'btn-primary', handlers.onNewHand);
      break;
  }
}
