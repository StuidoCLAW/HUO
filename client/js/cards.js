/**
 * Programmatic SVG card faces + backs.
 *
 * Server cards are integers 0..51 with:
 *   rank = card >> 2   0=2 .. 12=A
 *   suit = card & 3    0=spades 1=hearts 2=diamonds 3=clubs
 *
 * Everything is rendered from inline paths — no external assets, no fonts
 * beyond the system stack. Cards scale to whatever box they're mounted in.
 */

const SVG_NS = 'http://www.w3.org/2000/svg';

export const RANKS = ['2','3','4','5','6','7','8','9','T','J','Q','K','A'];
export const SUITS = ['s','h','d','c'];
const SUIT_COLOUR = ['#1a1a1a','#c0392b','#c0392b','#1a1a1a'];

const SUIT_PATHS = {
  s: 'M 50,10 C 70,35 92,48 92,66 C 92,80 80,88 68,88 C 62,88 55,85 52,80 L 56,96 L 44,96 L 48,80 C 45,85 38,88 32,88 C 20,88 8,80 8,66 C 8,48 30,35 50,10 Z',
  h: 'M 50,88 C 40,78 8,60 8,36 C 8,22 20,12 32,12 C 40,12 46,16 50,22 C 54,16 60,12 68,12 C 80,12 92,22 92,36 C 92,60 60,78 50,88 Z',
  d: 'M 50,8 L 88,50 L 50,92 L 12,50 Z',
  c: 'M 50,10 C 60,10 68,18 68,28 C 68,33 66,37 63,40 C 72,38 82,44 82,56 C 82,66 74,74 64,74 C 58,74 53,71 50,66 C 47,71 42,74 36,74 C 26,74 18,66 18,56 C 18,44 28,38 37,40 C 34,37 32,33 32,28 C 32,18 40,10 50,10 Z M 52,96 L 48,96 L 46,72 L 54,72 Z',
};

function el(name, attrs = {}, children = []) {
  const node = document.createElementNS(SVG_NS, name);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === undefined || v === null) continue;
    node.setAttribute(k, String(v));
  }
  for (const c of children) {
    if (typeof c === 'string') node.appendChild(document.createTextNode(c));
    else if (c) node.appendChild(c);
  }
  return node;
}

function suitGlyph(suit, x, y, size, rotate = 0) {
  const g = el('g', {
    transform: `translate(${x - size / 2} ${y - size / 2}) scale(${size / 100}) ${rotate ? `rotate(${rotate} 50 50)` : ''}`,
  });
  g.appendChild(el('path', { d: SUIT_PATHS[suit], fill: SUIT_COLOUR[SUITS.indexOf(suit)] }));
  return g;
}

function cornerIndex(rank, suit, atBottomRight) {
  const transform = atBottomRight
    ? 'translate(225 315) rotate(180)'
    : '';
  const colour = SUIT_COLOUR[SUITS.indexOf(suit)];
  const group = el('g', { transform });
  group.appendChild(el('text', {
    x: 18, y: 38,
    'text-anchor': 'middle',
    'font-family': 'Georgia, serif',
    'font-size': 36,
    'font-weight': 700,
    fill: colour,
  }, [rank]));
  group.appendChild(suitGlyph(suit, 18, 64, 22));
  return group;
}

/**
 * Standard pip layouts for 2..10 within the inner card rectangle.
 * Card inner area: x ∈ [45, 180], y ∈ [50, 270]. Coordinates are pip centres.
 */
const PIP_LAYOUTS = {
  '2': [[112.5, 80], [112.5, 240]],
  '3': [[112.5, 80], [112.5, 160], [112.5, 240]],
  '4': [[65, 80], [160, 80], [65, 240], [160, 240]],
  '5': [[65, 80], [160, 80], [112.5, 160], [65, 240], [160, 240]],
  '6': [[65, 80], [160, 80], [65, 160], [160, 160], [65, 240], [160, 240]],
  '7': [[65, 80], [160, 80], [112.5, 120], [65, 160], [160, 160], [65, 240], [160, 240]],
  '8': [[65, 80], [160, 80], [112.5, 120], [65, 160], [160, 160], [112.5, 200], [65, 240], [160, 240]],
  '9': [[65, 80], [160, 80], [65, 135], [160, 135], [112.5, 160], [65, 185], [160, 185], [65, 240], [160, 240]],
  '10': [[65, 80], [160, 80], [65, 125], [160, 125], [112.5, 102], [112.5, 218], [65, 195], [160, 195], [65, 240], [160, 240]],
};

function courtGlyph(rank, suit) {
  const colour = SUIT_COLOUR[SUITS.indexOf(suit)];
  const g = el('g');
  g.appendChild(el('rect', {
    x: 50, y: 60, width: 125, height: 200, rx: 8,
    fill: 'none', stroke: 'rgba(192,57,43,0.25)', 'stroke-width': 1,
  }));
  g.appendChild(el('text', {
    x: 112.5, y: 170,
    'text-anchor': 'middle',
    'font-family': 'Georgia, serif',
    'font-size': 96,
    'font-weight': 700,
    fill: colour,
  }, [rank]));
  g.appendChild(suitGlyph(suit, 112.5, 230, 32));
  return g;
}

function aceGlyph(suit) {
  const g = el('g');
  g.appendChild(suitGlyph(suit, 112.5, 160, 100));
  return g;
}

function pipCluster(rank, suit) {
  const g = el('g');
  const pips = PIP_LAYOUTS[rank] ?? [];
  for (const [x, y] of pips) {
    const rotate = y > 160 ? 180 : 0;
    g.appendChild(suitGlyph(suit, x, y, 34, rotate));
  }
  return g;
}

export function buildCardFaceSvg(cardId) {
  const rank = RANKS[cardId >> 2];
  const suit = SUITS[cardId & 3];
  const svg = el('svg', {
    viewBox: '0 0 225 315',
    xmlns: SVG_NS,
    role: 'img',
    'aria-label': `${rank}${suit.toUpperCase()}`,
  });

  svg.appendChild(el('rect', {
    x: 2, y: 2, width: 221, height: 311, rx: 14,
    fill: '#f8f4e8', stroke: 'rgba(0,0,0,0.15)', 'stroke-width': 1,
  }));
  svg.appendChild(el('rect', {
    x: 8, y: 8, width: 209, height: 299, rx: 11,
    fill: 'none', stroke: 'rgba(0,0,0,0.07)', 'stroke-width': 1,
  }));

  svg.appendChild(cornerIndex(rank, suit, false));
  svg.appendChild(cornerIndex(rank, suit, true));

  if (rank === 'A') svg.appendChild(aceGlyph(suit));
  else if (rank === 'J' || rank === 'Q' || rank === 'K') svg.appendChild(courtGlyph(rank, suit));
  else svg.appendChild(pipCluster(rank, suit));

  return svg;
}

export function buildCardBackSvg() {
  const svg = el('svg', {
    viewBox: '0 0 225 315',
    xmlns: SVG_NS,
    'aria-hidden': 'true',
  });
  svg.appendChild(el('rect', {
    x: 0, y: 0, width: 225, height: 315, rx: 14,
    fill: '#1b2a46',
  }));
  svg.appendChild(el('rect', {
    x: 8, y: 8, width: 209, height: 299, rx: 11,
    fill: 'none', stroke: '#d4a84a', 'stroke-width': 2,
  }));

  // Diamond lattice
  const lattice = el('g', { stroke: 'rgba(212,168,74,0.35)', 'stroke-width': 1, fill: 'none' });
  for (let i = -6; i < 12; i++) {
    const x = i * 22;
    lattice.appendChild(el('line', { x1: x, y1: 0, x2: x + 315, y2: 315 }));
    lattice.appendChild(el('line', { x1: x, y1: 315, x2: x + 315, y2: 0 }));
  }
  svg.appendChild(lattice);

  svg.appendChild(el('rect', {
    x: 55, y: 130, width: 115, height: 55, rx: 8,
    fill: '#1b2a46', stroke: '#d4a84a', 'stroke-width': 1.5,
  }));
  svg.appendChild(el('text', {
    x: 112.5, y: 167,
    'text-anchor': 'middle',
    'font-family': 'Georgia, serif',
    'font-size': 24,
    'font-weight': 700,
    'letter-spacing': 4,
    fill: '#d4a84a',
  }, ['HUO']));

  return svg;
}

/** Build a complete card element (face + back), face up if `faceUp` is true. */
export function buildCardElement(cardId, { faceUp = true } = {}) {
  const wrap = document.createElement('div');
  wrap.className = 'card' + (faceUp ? ' flipped' : '');
  wrap.dataset.cardId = cardId == null ? '' : String(cardId);

  const back = document.createElement('div');
  back.className = 'card-back';
  back.appendChild(buildCardBackSvg());

  const face = document.createElement('div');
  face.className = 'card-face';
  if (cardId != null) face.appendChild(buildCardFaceSvg(cardId));

  wrap.appendChild(back);
  wrap.appendChild(face);
  return wrap;
}
