import { FIGHT_BUFF, HORSE_MOVE_BONUS, MEAT_HEAL } from "./balance";
import type { ItemId } from "../model/types";

// Where an item is used: "now" = from the bag on your turn, "plot" = on one of your plots (the player picks it),
// "map" = on the Map around the roll, "fight" = inside a fight, "passive" = equipment that works while carried.
export type ItemUse = "now" | "plot" | "map" | "fight" | "passive";

export interface ItemDef {
  kind: "consumable" | "equipment";
  price: number;
  use: ItemUse;
  summary: string; // one line for the item page
  description: string; // full text for the Description popup
}

// Stat bonus per equipment id
export const EQUIPMENT_STATS: Partial<Record<ItemId, { attack?: number; defense?: number; lucky?: number }>> = {
  ironSword: { attack: 2 },
  ironArmor: { defense: 2 },
  cloverCharm: { lucky: 2 }
};

const bonusOf = (itemId: ItemId, stat: "attack" | "defense" | "lucky"): number => EQUIPMENT_STATS[itemId]?.[stat] ?? 0;

export const ITEMS: Record<ItemId, ItemDef> = {
  horse: {
    kind: "consumable",
    price: 40,
    use: "map",
    summary: `This will give you more speed in turn (+${HORSE_MOVE_BONUS} dice point to result).`,
    description: `Use it on the Map before you roll the dice. It adds ${HORSE_MOVE_BONUS} steps to the result of your roll for that turn. Only one Horse can be used per turn.`
  },
  luckyDie: {
    kind: "consumable",
    price: 35,
    use: "map",
    summary: "Roll again once if you do not like your dice.",
    description:
      "While you carry a Lucky Die, every roll waits for your choice: keep the result and move, or spend the Lucky Die to roll again. The new result stands."
  },
  meat: {
    kind: "consumable",
    price: 30,
    use: "now",
    summary: `Restores ${MEAT_HEAL} health.`,
    description: `Eat it on your turn, or in a fight before you roll, to restore ${MEAT_HEAL} health. Your health never goes above your Max Health.`
  },
  warHorn: {
    kind: "consumable",
    price: 40,
    use: "fight",
    summary: `+${FIGHT_BUFF} attack for one fight.`,
    description: `Use it in a fight before you roll. You get +${FIGHT_BUFF} attack until that fight is over.`
  },
  woodShield: {
    kind: "consumable",
    price: 40,
    use: "fight",
    summary: `+${FIGHT_BUFF} defense for one fight.`,
    description: `Use it in a fight before you roll. You get +${FIGHT_BUFF} defense until that fight is over.`
  },
  sickle: {
    kind: "consumable",
    price: 50,
    use: "plot",
    summary: "Collect the income of one of your plots now.",
    description:
      "Choose one of your plots and collect its income right away, without waiting for the next lap. Use it on your turn before you roll, at the Start Station or after you moved."
  },
  hammer: {
    kind: "consumable",
    price: 45,
    use: "plot",
    summary: "Repair one of your plots to full health.",
    description:
      "Choose one of your damaged plots and restore it to full health. Use it on your turn before you roll, at the Start Station or after you moved."
  },
  ironSword: {
    kind: "equipment",
    price: 160,
    use: "passive",
    summary: `+${bonusOf("ironSword", "attack")} attack while you carry it.`,
    description: `Equipment: keep it in your bag and your Attack is +${bonusOf("ironSword", "attack")} higher in every fight. It is never used up.`
  },
  ironArmor: {
    kind: "equipment",
    price: 160,
    use: "passive",
    summary: `+${bonusOf("ironArmor", "defense")} defense while you carry it.`,
    description: `Equipment: keep it in your bag and your Defense is +${bonusOf("ironArmor", "defense")} higher in every fight. It is never used up.`
  },
  cloverCharm: {
    kind: "equipment",
    price: 120,
    use: "passive",
    summary: `+${bonusOf("cloverCharm", "lucky")} lucky while you carry it.`,
    description: `Equipment: keep it in your bag and your Lucky is +${bonusOf("cloverCharm", "lucky")} higher, so good events and item drops come more often. It is never used up.`
  }
};

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
export const CONSUMABLE_IDS = ITEM_IDS.filter((id) => ITEMS[id].kind === "consumable");
export const EQUIPMENT_IDS = ITEM_IDS.filter((id) => ITEMS[id].kind === "equipment");
