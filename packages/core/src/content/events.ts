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

// durationRounds 0 = instant effect (history only, never active)
export const GLOBAL_EVENTS: Record<GlobalEventId, { durationRounds: number }> = {
  harvestFestival: { durationRounds: 0 },
  plague: { durationRounds: 0 },
  royalTax: { durationRounds: 0 },
  peaceTreaty: { durationRounds: 1 },
  warFever: { durationRounds: 1 },
  marketBoom: { durationRounds: 1 },
  bountifulYear: { durationRounds: 2 }
};

export const GLOBAL_EVENT_IDS = Object.keys(GLOBAL_EVENTS) as GlobalEventId[];
