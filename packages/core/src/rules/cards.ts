import { CARD_OFFER_SIZE, CARD_TIERS, CARD_WEIGHTS } from "../content/cards";
import type { CardOffer, CardType, GameState, PlayerId } from "../model/types";
import { pushLog } from "./log";
import { randomInt, weightedPick } from "./rng";
import type { Rng } from "./rng";

// RNG order: one next() per offered type (weighted, without replacement), then `rolls` next() per offer value.
export const buildCardOffer = (rng: Rng, lucky: number): CardOffer[] => {
  const remaining = [...CARD_WEIGHTS];
  const types: CardType[] = [];
  while (types.length < CARD_OFFER_SIZE && remaining.length > 0) {
    const type = weightedPick(rng, remaining);
    types.push(type);
    remaining.splice(
      remaining.findIndex((entry) => entry.value === type),
      1
    );
  }
  const rolls = 1 + Math.floor(lucky / 2);
  return types.map((type) => {
    const tiers = CARD_TIERS[type];
    let best = 0;
    for (let roll = 0; roll < rolls; roll += 1) {
      best = Math.max(best, randomInt(rng, tiers.length));
    }
    return { type, value: tiers[best] ?? 0 };
  });
};

export const applyCard = (state: GameState, playerId: PlayerId, offer: CardOffer): void => {
  const king = state.kings[playerId];
  if (!king) {
    return;
  }
  switch (offer.type) {
    case "maxHealth":
      king.maxHealth += offer.value;
      king.health += offer.value;
      break;
    case "attack":
      king.attack += offer.value;
      break;
    case "defense":
      king.defense += offer.value;
      break;
    case "lucky":
      king.lucky += offer.value;
      break;
    case "coin":
      king.coin += offer.value;
      break;
  }
  pushLog(state, "cardPicked", playerId, { type: offer.type, value: offer.value });
};
