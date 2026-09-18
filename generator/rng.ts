// Seeded PRNG (mulberry32) so `generate.ts --seed N --count M` produces
// byte-identical truth on every run. Dependency-free by project convention.

export interface WeightedOption<T> {
  item: T;
  weight: number;
}

export class Rng {
  private state: number;

  constructor(seed: number) {
    this.state = seed >>> 0;
  }

  /** Uniform float in [0, 1). */
  float(): number {
    this.state |= 0;
    this.state = (this.state + 0x6d2b79f5) | 0;
    let t = Math.imul(this.state ^ (this.state >>> 15), 1 | this.state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  /** Integer in [minInclusive, maxInclusive]. */
  int(minInclusive: number, maxInclusive: number): number {
    return minInclusive + Math.floor(this.float() * (maxInclusive - minInclusive + 1));
  }

  /** Float in [min, max), rounded to `decimals` places. */
  range(min: number, max: number, decimals = 1): number {
    const v = min + this.float() * (max - min);
    const f = 10 ** decimals;
    return Math.round(v * f) / f;
  }

  bool(pTrue = 0.5): boolean {
    return this.float() < pTrue;
  }

  pick<T>(items: readonly T[]): T {
    const item = items[this.int(0, items.length - 1)];
    if (item === undefined) throw new Error("Rng.pick: empty array");
    return item;
  }

  pickWeighted<T>(options: readonly WeightedOption<T>[]): T {
    const total = options.reduce((sum, o) => sum + o.weight, 0);
    let roll = this.float() * total;
    for (const o of options) {
      roll -= o.weight;
      if (roll <= 0) return o.item;
    }
    const last = options[options.length - 1];
    if (!last) throw new Error("Rng.pickWeighted: empty options");
    return last.item;
  }

  /** Fisher-Yates shuffle of a copy; input is not mutated. */
  shuffle<T>(items: readonly T[]): T[] {
    const copy = items.slice();
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      const a = copy[i] as T;
      const b = copy[j] as T;
      copy[i] = b;
      copy[j] = a;
    }
    return copy;
  }

  /** n distinct items sampled without replacement. */
  sample<T>(items: readonly T[], n: number): T[] {
    return this.shuffle(items).slice(0, Math.max(0, Math.min(n, items.length)));
  }
}
