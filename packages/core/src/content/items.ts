import type { ItemId } from "../model/types";

export interface ItemDef {
  kind: "consumable" | "equipment";
  price: number;
}

export const ITEMS: Record<ItemId, ItemDef> = {
  horse: { kind: "consumable", price: 40 },
  luckyDie: { kind: "consumable", price: 35 },
  meat: { kind: "consumable", price: 30 },
  warHorn: { kind: "consumable", price: 40 },
  woodShield: { kind: "consumable", price: 40 },
  sickle: { kind: "consumable", price: 50 },
  hammer: { kind: "consumable", price: 45 },
  ironSword: { kind: "equipment", price: 160 },
  ironArmor: { kind: "equipment", price: 160 },
  cloverCharm: { kind: "equipment", price: 120 }
};

export const ITEM_IDS = Object.keys(ITEMS) as ItemId[];
export const CONSUMABLE_IDS = ITEM_IDS.filter((id) => ITEMS[id].kind === "consumable");
export const EQUIPMENT_IDS = ITEM_IDS.filter((id) => ITEMS[id].kind === "equipment");

// Stat bonus per equipment id
export const EQUIPMENT_STATS: Partial<Record<ItemId, { attack?: number; defense?: number; lucky?: number }>> = {
  ironSword: { attack: 2 },
  ironArmor: { defense: 2 },
  cloverCharm: { lucky: 2 }
};
