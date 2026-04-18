// @vitest-environment happy-dom
/**
 * Client smoke tests.
 *
 * Exercises the vanilla-JS client modules against happy-dom. Stubs fetch for
 * the integration-style flow test so the server does not need to be running.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const CLIENT = join(process.cwd(), 'client');

function loadIndexBodyInto(doc: Document) {
  const html = readFileSync(join(CLIENT, 'index.html'), 'utf8');
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/);
  if (!match) throw new Error('failed to extract body');
  doc.body.innerHTML = match[1]
    // strip the module script tag so we don't auto-bootstrap main.js
    .replace(/<script[\s\S]*?<\/script>/g, '');
}

beforeEach(() => {
  document.body.innerHTML = '';
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('cards', () => {
  it('buildCardFaceSvg produces a valid SVG for every card 0..51', async () => {
    const { buildCardFaceSvg, buildCardBackSvg } = await import('../client/js/cards.js' as any) as any;
    for (let c = 0; c < 52; c++) {
      const svg = buildCardFaceSvg(c);
      expect(svg.tagName.toLowerCase()).toBe('svg');
      // Every face has at least one <path> (suit glyph)
      expect(svg.querySelectorAll('path').length).toBeGreaterThan(0);
    }
    const back = buildCardBackSvg();
    expect(back.tagName.toLowerCase()).toBe('svg');
  });

  it('buildCardElement(null) renders a face-down card with no face SVG', async () => {
    const { buildCardElement } = await import('../client/js/cards.js' as any) as any;
    const el = buildCardElement(null, { faceUp: false });
    expect(el.classList.contains('flipped')).toBe(false);
    const face = el.querySelector('.card-face');
    expect(face?.firstChild).toBeFalsy();
  });
});

describe('chips', () => {
  it('createChipStore notifies listeners and clamps to valid denominations', async () => {
    const { createChipStore, DENOMINATIONS } = await import('../client/js/chips.js' as any) as any;
    const store = createChipStore(5);
    const seen: number[] = [];
    store.onChange((v: number) => seen.push(v));
    store.set(25);
    store.set(999); // not in DENOMINATIONS
    store.set(100);
    expect(store.get()).toBe(100);
    expect(seen).toEqual([25, 100]);
    expect(DENOMINATIONS).toEqual([1, 5, 10, 25, 100]);
  });

  it('bindBetSpots enforces £1..£100 and mirrors ante → blind', async () => {
    const { createChipStore, bindBetSpots, readTotals } = await import('../client/js/chips.js' as any) as any;
    loadIndexBodyInto(document);
    const store = createChipStore(100);
    const root = document.getElementById('table')!;
    bindBetSpots(root, store, {});

    const ante = root.querySelector('[data-spot="ante"]') as HTMLButtonElement;
    ante.click();
    ante.click();                 // 2x £100 = would be 200, rejected
    expect(readTotals(root).ante).toBe(100);
    expect(readTotals(root).blind).toBe(100);

    store.set(5);
    const trips = root.querySelector('[data-spot="trips"]') as HTMLButtonElement;
    trips.click();
    expect(readTotals(root).trips).toBe(5);
  });

  it('getLocked prevents chip changes after deal', async () => {
    const { createChipStore, bindBetSpots, readTotals } = await import('../client/js/chips.js' as any) as any;
    loadIndexBodyInto(document);
    let locked = false;
    const store = createChipStore(10);
    const root = document.getElementById('table')!;
    bindBetSpots(root, store, { getLocked: () => locked });

    const ante = root.querySelector('[data-spot="ante"]') as HTMLButtonElement;
    ante.click();
    expect(readTotals(root).ante).toBe(10);

    locked = true;
    ante.click();
    expect(readTotals(root).ante).toBe(10); // unchanged
  });
});

describe('state reducers', () => {
  it('applyStartResponse moves to PREFLOP and captures hole cards', async () => {
    const { initialState, applyStartResponse } = await import('../client/js/state.js' as any) as any;
    const s0 = initialState();
    const s1 = applyStartResponse(s0, {
      sessionId: 'abc', state: 'PREFLOP', playerHole: [0, 1, 2, 3],
    }, { ante: 5, blind: 5, trips: 0 });
    expect(s1.phase).toBe('PREFLOP');
    expect(s1.sessionId).toBe('abc');
    expect(s1.playerHole).toEqual([0, 1, 2, 3]);
    expect(s1.dealerHole).toBeNull();
  });

  it('applyResolution populates dealer hole + full board', async () => {
    const { initialState, applyResolution } = await import('../client/js/state.js' as any) as any;
    const s = applyResolution(initialState(), {
      state: 'RESOLVED',
      dealerHole: [4, 5, 6, 7],
      board: [8, 9, 10, 11, 12],
      raisedStreet: 'river', playMultiplier: 1, folded: false,
    } as any);
    expect(s.phase).toBe('RESOLVED');
    expect(s.dealerHole).toEqual([4, 5, 6, 7]);
    expect(s.flop).toEqual([8, 9, 10]);
    expect(s.turn).toEqual([11]);
    expect(s.river).toEqual([12]);
  });
});

describe('render: dealer info hiding', () => {
  it('PREFLOP renders 4 face-down dealer cards with empty face slots', async () => {
    const { renderPreflop } = await import('../client/js/render.js' as any) as any;
    loadIndexBodyInto(document);
    const root = document.getElementById('table')!;
    const state: any = {
      phase: 'PREFLOP', sessionId: 'x', balance: 500,
      stakes: { ante: 5, blind: 5, trips: 0 },
      playerHole: [0, 1, 2, 3],
      dealerHole: null, flop: null, turn: null, river: null,
    };
    renderPreflop(root, state);

    for (let i = 0; i < 4; i++) {
      const slot = root.querySelector(`[data-slot="dealer-${i}"]`)!;
      const card = slot.querySelector('.card')!;
      expect(card.classList.contains('flipped')).toBe(false);
      const face = card.querySelector('.card-face');
      expect(face?.firstChild).toBeFalsy();
    }
    // Player cards are face-up with SVG content
    for (let i = 0; i < 4; i++) {
      const slot = root.querySelector(`[data-slot="player-${i}"]`)!;
      const card = slot.querySelector('.card')!;
      expect(card.classList.contains('flipped')).toBe(true);
      expect(card.querySelector('.card-face svg')).toBeTruthy();
    }
  });
});

describe('reconnect persistence', () => {
  it('storeSession / loadStoredSession / clearStoredSession round-trip', async () => {
    const { storeSession, loadStoredSession, clearStoredSession } = await import('../client/js/reconnect.js' as any) as any;
    storeSession('abc-123', { ante: 10, blind: 10, trips: 0 });
    const loaded = loadStoredSession();
    expect(loaded?.sessionId).toBe('abc-123');
    expect(loaded?.stakes).toEqual({ ante: 10, blind: 10, trips: 0 });
    clearStoredSession();
    expect(loadStoredSession()).toBeNull();
  });

  it('loadStoredSession ignores records older than 30 minutes', async () => {
    const { loadStoredSession } = await import('../client/js/reconnect.js' as any) as any;
    localStorage.setItem('huoSession', JSON.stringify({
      sessionId: 'old', createdAt: Date.now() - 31 * 60 * 1000,
    }));
    expect(loadStoredSession()).toBeNull();
  });
});

describe('api wrapper', () => {
  it('throws ApiError with kind=not_found on 404', async () => {
    const { api, ApiError } = await import('../client/js/api.js' as any) as any;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ error: 'not_found', message: 'nope' }), { status: 404 }),
    );
    await expect(api.getSession('bad')).rejects.toBeInstanceOf(ApiError);
    await expect(api.getSession('bad')).rejects.toMatchObject({ kind: 'not_found', status: 404 });
    fetchSpy.mockRestore();
  });

  it('posts JSON body on startSession', async () => {
    const { api } = await import('../client/js/api.js' as any) as any;
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(JSON.stringify({ sessionId: 'abc', state: 'PREFLOP', playerHole: [0,1,2,3] }), { status: 200 }),
    );
    const out = await api.startSession({ anteStake: 5, blindStake: 5, balance: 100 });
    expect(out.sessionId).toBe('abc');
    const call = fetchSpy.mock.calls[0];
    expect(call[1]?.method).toBe('POST');
    expect(call[1]?.body).toContain('"anteStake":5');
    fetchSpy.mockRestore();
  });
});
