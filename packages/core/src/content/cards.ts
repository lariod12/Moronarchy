import type { CardType } from "../model/types";

export const CARD_WEIGHTS: readonly { value: CardType; weight: number }[] = [
  { value: "maxHealth", weight: 25 },
  { value: "attack", weight: 25 },
  { value: "defense", weight: 25 },
  { value: "lucky", weight: 10 },
  { value: "coin", weight: 15 }
];

export const CARD_TIERS: Record<CardType, readonly number[]> = {
  maxHealth: [10, 15, 20],
  attack: [1, 2, 3],
  defense: [1, 2, 3],
  lucky: [1, 2],
  coin: [50, 100, 150]
};

export const CARD_OFFER_SIZE = 3;
