/**
 * Engine barrel export.
 *
 * This folder is the standalone maths core: card encoding, RNG, 5-card
 * evaluator + Omaha 2+3 wrapper, qualifier + paytables, and the hand
 * orchestrator. It has zero runtime dependencies outside of the Node
 * standard library.
 *
 * Consumers (the HTTP layer, a future Rust port, certifier bundles) should
 * import from this barrel rather than reaching into individual files.
 */

export * from './cards.js';
export * from './rng.js';
export * from './evaluator.js';
export * from './payouts.js';
export * from './game.js';
