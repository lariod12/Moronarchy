import {
  AMBUSH_DAMAGE,
  BOUNTIFUL_YEAR_INCOME_MULTIPLIER,
  HARVEST_FESTIVAL_COIN,
  MARKET_BOOM_FEE_MULTIPLIER,
  MERCHANT_BAG_FULL_COIN,
  PICKPOCKET_COIN,
  PLAGUE_HEALTH_LOSS_RATIO,
  ROYAL_TAX_RATIO,
  STORM_HEALTH_LOSS_RATIO,
  TREASURE_CHEST_COIN,
  VOLUNTEER_FALLBACK_COIN,
  WAR_FEVER_ATTACK_BONUS
} from "./balance";
import type { GlobalEventId, PersonalEventId } from "../model/types";

export const GOOD_PERSONAL_EVENTS: readonly { value: PersonalEventId; weight: number }[] = [
  { value: "treasureChest", weight: 30 },
  { value: "wanderingMerchant", weight: 25 },
  { value: "healingSpring", weight: 20 },
  { value: "volunteer", weight: 15 },
  { value: "blessing", weight: 10 }
];

export const BAD_PERSONAL_EVENTS: readonly { value: PersonalEventId; weight: number }[] = [
  { value: "pickpocket", weight: 35 },
  { value: "ambush", weight: 30 },
  { value: "storm", weight: 25 },
  { value: "desertion", weight: 10 }
];

const percent = (ratio: number): string => `${Math.round(ratio * 100)}%`;

export interface GlobalEventDef {
  durationRounds: number; // 0 = instant effect (history only, never active)
  description: string;
}

export const GLOBAL_EVENTS: Record<GlobalEventId, GlobalEventDef> = {
  harvestFestival: { durationRounds: 0, description: `Everyone gets +${HARVEST_FESTIVAL_COIN} coin immediately.` },
  plague: { durationRounds: 0, description: `Every resident loses ${percent(PLAGUE_HEALTH_LOSS_RATIO)} of its health.` },
  royalTax: { durationRounds: 0, description: `Everyone pays ${percent(ROYAL_TAX_RATIO)} of their coin.` },
  peaceTreaty: { durationRounds: 1, description: "No attacks this round." },
  warFever: { durationRounds: 1, description: `Kings fight with +${WAR_FEVER_ATTACK_BONUS} attack this round.` },
  marketBoom: { durationRounds: 1, description: `Plot fees x${MARKET_BOOM_FEE_MULTIPLIER} this round.` },
  bountifulYear: { durationRounds: 2, description: `Plot income x${BOUNTIFUL_YEAR_INCOME_MULTIPLIER} for two rounds.` }
};

export const GLOBAL_EVENT_IDS = Object.keys(GLOBAL_EVENTS) as GlobalEventId[];

// Personal events are always instant. `description` is neutral (no "you") so the history can show anybody's event.
export const PERSONAL_EVENTS: Record<PersonalEventId, { description: string }> = {
  treasureChest: { description: `Found a treasure chest: +${TREASURE_CHEST_COIN} coin.` },
  wanderingMerchant: { description: `A wandering merchant sold a useful item (${MERCHANT_BAG_FULL_COIN} coin when the bag is full).` },
  healingSpring: { description: "Bathed in a healing spring: health fully restored." },
  volunteer: { description: `A volunteer farmer joined a plot (${VOLUNTEER_FALLBACK_COIN} coin when no plot has room).` },
  blessing: { description: "Was blessed: +1 Lucky." },
  pickpocket: { description: `A pickpocket stole up to ${PICKPOCKET_COIN} coin.` },
  ambush: { description: `Was ambushed: -${AMBUSH_DAMAGE} health.` },
  storm: { description: `A storm took ${percent(STORM_HEALTH_LOSS_RATIO)} of one plot's health.` },
  desertion: { description: "One resident deserted." }
};
