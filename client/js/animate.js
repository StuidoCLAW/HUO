/**
 * Thin animation helpers wrapping CSS transitions.
 *
 * Everything drives real DOM transitions; no animation libraries.
 */

import { buildCardElement, buildCardFaceSvg } from './cards.js';

export function clearSlot(slotEl) {
  slotEl.textContent = '';
}

export function mountCard(slotEl, cardId, { faceUp = true, withDealAnimation = true } = {}) {
  clearSlot(slotEl);
  const card = buildCardElement(cardId, { faceUp });
  if (withDealAnimation) card.classList.add('dealing');
  slotEl.appendChild(card);
  if (withDealAnimation) {
    card.addEventListener('animationend', () => card.classList.remove('dealing'), { once: true });
  }
  return card;
}

export async function flipCard(slotEl, cardId) {
  let card = slotEl.querySelector('.card');
  if (!card) {
    card = mountCard(slotEl, cardId, { faceUp: false, withDealAnimation: false });
  }
  // Ensure the face has content (may have been mounted as a blank back).
  const face = card.querySelector('.card-face');
  if (face && !face.firstChild) face.appendChild(buildCardFaceSvg(cardId));
  card.dataset.cardId = String(cardId);
  // Force reflow then toggle the flipped state.
  void card.offsetWidth;
  card.classList.add('flipped');
  return new Promise((resolve) => {
    const done = () => resolve();
    card.addEventListener('transitionend', done, { once: true });
    setTimeout(done, 320);
  });
}

export function winFlash(spotEl) {
  if (!spotEl) return;
  spotEl.classList.remove('win-flash');
  void spotEl.offsetWidth;
  spotEl.classList.add('win-flash');
}

export async function flyChip(fromEl, toEl, denom) {
  if (!fromEl || !toEl || !fromEl.getBoundingClientRect) return;
  const from = fromEl.getBoundingClientRect();
  const to = toEl.getBoundingClientRect();
  const chip = document.createElement('div');
  chip.className = 'chip chip-fly';
  chip.dataset.denom = String(denom);
  chip.textContent = '£' + denom;
  Object.assign(chip.style, {
    left: from.left + from.width / 2 - 16 + 'px',
    top: from.top + from.height / 2 - 16 + 'px',
    width: '32px', height: '32px',
  });
  document.body.appendChild(chip);
  void chip.offsetWidth;
  chip.style.transform = `translate(${to.left - from.left}px, ${to.top - from.top}px)`;
  chip.style.opacity = '0.2';
  return new Promise((resolve) => {
    chip.addEventListener('transitionend', () => { chip.remove(); resolve(); }, { once: true });
    setTimeout(() => { chip.remove(); resolve(); }, 400);
  });
}

export function wait(ms) {
  return new Promise((r) => setTimeout(r, ms));
}
