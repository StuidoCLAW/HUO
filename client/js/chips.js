/**
 * Chip denominations + bet-spot UX.
 *
 * Table limits: £1 min, £100 max on ante/blind/trips.
 * Selected denomination determines what a click on an empty spot places.
 * Right-click or long-press (500ms) removes the top chip.
 */

export const DENOMINATIONS = [1, 5, 10, 25, 100];
export const MIN_BET = 1;
export const MAX_BET = 100;

export function createChipStore(initial = 5) {
  let selected = initial;
  const listeners = new Set();
  return {
    get() { return selected; },
    set(v) {
      if (!DENOMINATIONS.includes(v)) return;
      selected = v;
      listeners.forEach(fn => fn(selected));
    },
    onChange(fn) { listeners.add(fn); return () => listeners.delete(fn); },
  };
}

export function renderChipRack(rackEl, store) {
  rackEl.textContent = '';
  for (const denom of DENOMINATIONS) {
    const chip = document.createElement('button');
    chip.className = 'chip';
    chip.dataset.denom = String(denom);
    chip.textContent = '£' + denom;
    chip.setAttribute('aria-label', `Select £${denom} chip`);
    chip.addEventListener('click', () => store.set(denom));
    rackEl.appendChild(chip);
  }
  const sync = (v) => {
    for (const el of rackEl.querySelectorAll('.chip')) {
      el.classList.toggle('selected', Number(el.dataset.denom) === v);
    }
  };
  sync(store.get());
  store.onChange(sync);
}

function spotTotal(spotEl) {
  return Number(spotEl.dataset.amount || 0);
}

function setSpotTotal(spotEl, total) {
  spotEl.dataset.amount = String(total);
  const label = spotEl.querySelector('.bet-amount');
  if (label) label.textContent = '£' + total;
  renderSpotStack(spotEl, total);
}

function breakdown(total) {
  const chips = [];
  let remaining = total;
  for (const denom of [...DENOMINATIONS].reverse()) {
    while (remaining >= denom) {
      chips.push(denom);
      remaining -= denom;
    }
  }
  return chips;
}

function renderSpotStack(spotEl, total) {
  let stack = spotEl.querySelector('.chip-stack');
  if (!stack) {
    stack = document.createElement('div');
    stack.className = 'chip-stack';
    spotEl.appendChild(stack);
  }
  stack.textContent = '';
  const chips = breakdown(total).slice(0, 8);
  for (const d of chips) {
    const c = document.createElement('div');
    c.className = 'chip';
    c.dataset.denom = String(d);
    c.textContent = '£' + d;
    stack.appendChild(c);
  }
}

/**
 * Bind bet-spot click handlers. Callbacks receive the updated totals so
 * render.js can refresh balance/total-bet HUD.
 */
export function bindBetSpots(rootEl, store, {
  onChange,
  getLocked,
} = {}) {
  const spots = rootEl.querySelectorAll('.bet-spot');
  for (const spot of spots) {
    const name = spot.dataset.spot;
    if (name === 'play') continue; // play chip is server-driven

    let pressTimer = null;

    const add = () => {
      if (getLocked && getLocked()) return;
      const denom = store.get();
      const current = spotTotal(spot);
      const next = current + denom;
      if (next > MAX_BET) return;
      setSpotTotal(spot, next);
      if (name === 'ante') {
        const blind = rootEl.querySelector('[data-spot="blind"]');
        if (blind) setSpotTotal(blind, next);
      } else if (name === 'blind') {
        const ante = rootEl.querySelector('[data-spot="ante"]');
        if (ante) setSpotTotal(ante, next);
      }
      onChange && onChange(readTotals(rootEl));
    };

    const remove = () => {
      if (getLocked && getLocked()) return;
      const current = spotTotal(spot);
      if (current === 0) return;
      const chips = breakdown(current);
      const top = chips[chips.length - 1];
      const next = current - top;
      setSpotTotal(spot, next);
      if (name === 'ante') {
        const blind = rootEl.querySelector('[data-spot="blind"]');
        if (blind) setSpotTotal(blind, next);
      } else if (name === 'blind') {
        const ante = rootEl.querySelector('[data-spot="ante"]');
        if (ante) setSpotTotal(ante, next);
      }
      onChange && onChange(readTotals(rootEl));
    };

    spot.addEventListener('click', add);
    spot.addEventListener('contextmenu', (e) => { e.preventDefault(); remove(); });
    spot.addEventListener('pointerdown', () => {
      pressTimer = window.setTimeout(() => { pressTimer = null; remove(); }, 500);
    });
    const cancel = () => { if (pressTimer) { clearTimeout(pressTimer); pressTimer = null; } };
    spot.addEventListener('pointerup', cancel);
    spot.addEventListener('pointerleave', cancel);
  }
}

export function readTotals(rootEl) {
  const out = { ante: 0, blind: 0, trips: 0, play: 0 };
  for (const spot of rootEl.querySelectorAll('.bet-spot')) {
    out[spot.dataset.spot] = spotTotal(spot);
  }
  return out;
}

export function resetBetSpots(rootEl) {
  for (const spot of rootEl.querySelectorAll('.bet-spot')) {
    setSpotTotal(spot, 0);
  }
}

export function setSpot(rootEl, name, amount) {
  const spot = rootEl.querySelector(`[data-spot="${name}"]`);
  if (spot) setSpotTotal(spot, amount);
}
