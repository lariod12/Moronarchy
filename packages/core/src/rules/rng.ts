export interface Rng {
  d6(): number;
  next(): number; // [0, 1)
}

export const randomInt = (rng: Rng, maxExclusive: number): number => {
  const value = Math.floor(rng.next() * maxExclusive);
  return Math.min(Math.max(value, 0), maxExclusive - 1);
};

export const pick = <T>(rng: Rng, items: readonly T[]): T => {
  if (items.length === 0) {
    throw new Error("Cannot pick from an empty list");
  }
  return items[randomInt(rng, items.length)] as T;
};

export const weightedPick = <T>(rng: Rng, entries: readonly { value: T; weight: number }[]): T => {
  if (entries.length === 0) {
    throw new Error("Cannot pick from an empty list");
  }
  const total = entries.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = rng.next() * total;
  for (const entry of entries) {
    if (roll < entry.weight) {
      return entry.value;
    }
    roll -= entry.weight;
  }
  return (entries[entries.length - 1] as { value: T; weight: number }).value;
};

export const shuffle = <T>(rng: Rng, items: readonly T[]): T[] => {
  const result = [...items];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(rng, index + 1);
    const current = result[index] as T;
    result[index] = result[swapIndex] as T;
    result[swapIndex] = current;
  }
  return result;
};
