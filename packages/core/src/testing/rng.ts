import type { Rng } from "../rules/rng";

// mulberry32: small, fast, deterministic.
export const createSeededRng = (seed: number): Rng => {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
  return { next, d6: () => Math.floor(next() * 6) + 1 };
};

// Consumes scripted values in order; falls back to a seeded rng once a queue is empty.
export const createScriptedRng = (script: { d6?: number[]; next?: number[] }, fallbackSeed = 1): Rng => {
  const fallback = createSeededRng(fallbackSeed);
  const d6Queue = [...(script.d6 ?? [])];
  const nextQueue = [...(script.next ?? [])];
  return {
    d6: () => d6Queue.shift() ?? fallback.d6(),
    next: () => nextQueue.shift() ?? fallback.next()
  };
};
