/**
 * Emit a parity stream matching parity_ref.py output format.
 * One line per hand: pipe-separated fields.
 */
import { SeededRng } from '../src/engine/rng.js';
import { playHand, parityStrategy } from '../src/engine/game.js';

const seed = BigInt(process.argv[2] ?? '42');
const n = Number(process.argv[3] ?? '10000');
const trips = process.argv[4] === 'trips';

const rng = new SeededRng(seed);

for (let i = 0; i < n; i++) {
  const h = playHand(rng, parityStrategy, trips);
  const r = h.result;
  const raised = h.raisedStreet ?? '';
  console.log(
    `${i}|${r.ante}|${r.blind}|${r.play}|${r.trips}|` +
    `${h.folded ? 1 : 0}|${r.playerWonShowdown ? 1 : 0}|${r.tie ? 1 : 0}|` +
    `${r.dealerQualified ? 1 : 0}|${raised}|${h.playMultiplier}`
  );
}
