/**
 * RNG abstraction.
 *
 * ProductionRng uses crypto.randomBytes() — cryptographically secure,
 * appropriate for real-money iGaming. Replace with a certified RNG
 * (e.g. iTechLabs, GLI-19 compliant) at certification time.
 *
 * SeededRng is a pure-JS xoshiro256** implementation. Used in tests
 * for deterministic reproducibility. NEVER use in production.
 */

import { randomBytes } from 'node:crypto';

export interface Rng {
  // Returns an integer in [0, n). n > 0.
  nextInt(n: number): number;
}

export class ProductionRng implements Rng {
  nextInt(n: number): number {
    if (n <= 0) throw new Error('n must be positive');
    if (n === 1) return 0;
    // Rejection sampling to avoid modulo bias on a uint32 range.
    const limit = Math.floor(0xffffffff / n) * n;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const buf = randomBytes(4);
      const x = buf.readUInt32BE(0);
      if (x < limit) return x % n;
    }
  }
}

/** xoshiro256** — fast, statistically sound, fully deterministic from seed. */
export class SeededRng implements Rng {
  private s0 = 0n;
  private s1 = 0n;
  private s2 = 0n;
  private s3 = 0n;

  constructor(seed: number | bigint) {
    // SplitMix64 to seed the four xoshiro state words.
    let z = BigInt(seed) & 0xffffffffffffffffn;
    const splitmix = () => {
      z = (z + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
      let r = z;
      r = ((r ^ (r >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
      r = ((r ^ (r >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
      r = r ^ (r >> 31n);
      return r & 0xffffffffffffffffn;
    };
    this.s0 = splitmix();
    this.s1 = splitmix();
    this.s2 = splitmix();
    this.s3 = splitmix();
  }

  private rotl(x: bigint, k: bigint): bigint {
    return (((x << k) | (x >> (64n - k))) & 0xffffffffffffffffn);
  }

  private next64(): bigint {
    const result = (this.rotl((this.s1 * 5n) & 0xffffffffffffffffn, 7n) * 9n) & 0xffffffffffffffffn;
    const t = (this.s1 << 17n) & 0xffffffffffffffffn;
    this.s2 ^= this.s0;
    this.s3 ^= this.s1;
    this.s1 ^= this.s2;
    this.s0 ^= this.s3;
    this.s2 ^= t;
    this.s3 = this.rotl(this.s3, 45n);
    return result;
  }

  nextInt(n: number): number {
    if (n <= 0) throw new Error('n must be positive');
    if (n === 1) return 0;
    const nb = BigInt(n);
    const limit = (0xffffffffffffffffn / nb) * nb;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const x = this.next64();
      if (x < limit) return Number(x % nb);
    }
  }
}

/** Fisher-Yates shuffle, in-place, using the provided RNG. */
export function shuffle<T>(arr: T[], rng: Rng): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = rng.nextInt(i + 1);
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}
