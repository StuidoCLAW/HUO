/**
 * Render functions — one per state. Each mutates the DOM from a state object.
 *
 * Any data the server doesn't send yet (dealer hole, unrevealed board) stays
 * as a face-down card back. This is mirrored by the server's information
 * hiding — the client couldn't cheat here even if it wanted to.
 */

import { buildCardElement } from './cards.js';
import { mountCard, flipCard, winFlash, wait } from './animate.js';
import { readTotals, resetBetSpots, setSpot } from './chips.js';

const DEAL_STAGGER_MS = 160;

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

export async function renderPreflop(root, state, { instant = false } = {}) {
  setSpot(root, 'ante', state.stakes.ante);
  setSpot(root, 'blind', state.stakes.blind);
  setSpot(root, 'trips', state.stakes.trips);
  setSpot(root, 'play', 0);

  // Mount 5 face-down board placeholders first (no animation — they're scenery).
  for (let i = 0; i < 5; i++) {
    const slot = slotFor(root, `board-${i}`);
    if (slot) mountCard(slot, null, { faceUp: false, withDealAnimation: false });
  }

  renderHud(root, state);
  renderStatus(root, 'Check to see the flop, or raise 3× now.');

  if (instant) {
    (state.playerHole || []).forEach((cardId, i) => {
      const slot = slotFor(root, `player-${i}`);
      if (slot) mountCard(slot, cardId, { faceUp: true, withDealAnimation: false });
    });
    for (let i = 0; i < 4; i++) {
      const slot = slotFor(root, `dealer-${i}`);
      if (slot) mountCard(slot, null, { faceUp: false, withDealAnimation: false });
    }
    return;
  }

  // Deal player cards one at a time, face-up — then dealer cards one at a time, face-down.
  const playerHole = state.playerHole || [];
  for (let i = 0; i < playerHole.length; i++) {
    const slot = slotFor(root, `player-${i}`);
    if (slot) mountCard(slot, playerHole[i], { faceUp: true, withDealAnimation: true });
    await wait(DEAL_STAGGER_MS);
  }
  for (let i = 0; i < 4; i++) {
    const slot = slotFor(root, `dealer-${i}`);
    if (slot) mountCard(slot, null, { faceUp: false, withDealAnimation: true });
    await wait(DEAL_STAGGER_MS);
  }
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

  const isFaceDown = (slot) => {
    const card = slot?.querySelector('.card');
    return !!card && !card.classList.contains('flipped');
  };

  // Reveal the board in dramatic order: flop one at a time, then turn,
  // then river. Only flip slots that are still face-down — cards already
  // revealed stay put.
  if (r.board?.length === 5) {
    for (let i = 0; i < 5; i++) {
      const slot = slotFor(root, `board-${i}`);
      if (slot && isFaceDown(slot)) await flipCard(slot, r.board[i]);
    }
  }

  // Flip dealer hole cards one by one for casino drama.
  for (let i = 0; i < 4; i++) {
    const slot = slotFor(root, `dealer-${i}`);
    if (slot && isFaceDown(slot)) await flipCard(slot, r.dealerHole[i]);
  }

  // Each spot shows the amount returned to the player: original stake
  // plus net payout, floored at 0 (a losing bet leaves the spot empty).
  // A push leaves the stake untouched. A win shows stake + winnings.
  const anteReturn  = Math.max(0, state.stakes.ante  + r.payouts.ante);
  const blindReturn = Math.max(0, state.stakes.blind + r.payouts.blind);
  const tripsReturn = Math.max(0, state.stakes.trips + r.payouts.trips);
  const playStake   = r.playMultiplier * state.stakes.ante;
  const playReturn  = Math.max(0, playStake + r.payouts.play);
  setSpot(root, 'ante',  anteReturn);
  setSpot(root, 'blind', blindReturn);
  setSpot(root, 'trips', tripsReturn);
  setSpot(root, 'play',  playReturn);

  const banner = root.querySelector('#result-banner');
  const head = root.querySelector('#result-headline');
  const detail = root.querySelector('#result-detail');
  if (banner && head && detail) {
    const qualifierNote = !r.folded && !r.dealerQualified
      ? " Dealer didn't qualify — ante pushes."
      : '';
    if (r.folded) {
      head.textContent = 'Folded';
      detail.textContent = `Lost ${fmt(Math.abs(r.payouts.ante + r.payouts.blind))}.`;
    } else if (r.tie) {
      head.textContent = 'Push';
      detail.textContent = `Tie on showdown.${qualifierNote} Net ${fmt(r.totalReturn)}.`;
    } else if (r.playerWon) {
      head.textContent = 'You win';
      detail.textContent = `${r.playerHand.className} beats ${r.dealerHand.className}.${qualifierNote} Net ${fmt(r.totalReturn)}.`;
    } else {
      head.textContent = 'Dealer wins';
      detail.textContent = `${r.dealerHand.className} beats ${r.playerHand.className}.${qualifierNote} Net ${fmt(r.totalReturn)}.`;
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
