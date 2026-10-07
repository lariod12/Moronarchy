import {
  AMBUSH_DAMAGE,
  BOUNTIFUL_YEAR_INCOME_MULTIPLIER,
  FIGHT_BUFF,
  HARVEST_FESTIVAL_COIN,
  MEAT_HEAL,
  MARKET_BOOM_FEE_MULTIPLIER,
  PICKPOCKET_COIN,
  PLAGUE_HEALTH_LOSS_RATIO,
  ROYAL_TAX_RATIO,
  TREASURE_CHEST_COIN,
  WAR_FEVER_ATTACK_BONUS
} from "@moronarchy/core/engine";
import type { CardType, GlobalEventId, ItemId, PersonalEventId, PlayerId, ResidentKind, TileId } from "@moronarchy/core/engine";

// Display names only. Numbers come from the engine content so texts cannot drift from the rules.
export const ITEM_LABELS: Record<ItemId, string> = {
  horse: "Horse",
  luckyDie: "Lucky Die",
  meat: "Meat",
  warHorn: "War Horn",
  woodShield: "Wood Shield",
  sickle: "Sickle",
  hammer: "Hammer",
  ironSword: "Iron Sword",
  ironArmor: "Iron Armor",
  cloverCharm: "Clover Charm"
};

// Items a fighter may use before rolling, with what they do (numbers from the engine content).
export const FIGHT_ITEM_IDS: ItemId[] = ["meat", "warHorn", "woodShield"];

export const FIGHT_ITEM_EFFECTS: Partial<Record<ItemId, string>> = {
  meat: `Heal ${MEAT_HEAL} health`,
  warHorn: `+${FIGHT_BUFF} attack for this fight`,
  woodShield: `+${FIGHT_BUFF} defense for this fight`
};

export const CARD_LABELS: Record<CardType, string> = {
  maxHealth: "Max Health",
  attack: "Attack",
  defense: "Defense",
  lucky: "Lucky",
  coin: "Coin"
};

export const RESIDENT_LABELS: Record<ResidentKind, string> = {
  warrior: "Warrior",
  farmer: "Farmer"
};

const percent = (ratio: number): string => `${Math.round(ratio * 100)}%`;

export const PERSONAL_EVENT_LABELS: Record<PersonalEventId, { name: string; text: string }> = {
  treasureChest: { name: "Treasure Chest", text: `You found a treasure chest: +${TREASURE_CHEST_COIN} coin.` },
  wanderingMerchant: { name: "Wandering Merchant", text: "A wandering merchant sold you something useful." },
  healingSpring: { name: "Healing Spring", text: "You bathed in a healing spring: health fully restored." },
  volunteer: { name: "Volunteer", text: "A volunteer farmer joined one of your plots." },
  blessing: { name: "Blessing", text: "You were blessed: +1 Lucky." },
  pickpocket: { name: "Pickpocket", text: `A pickpocket stole up to ${PICKPOCKET_COIN} coin from you.` },
  ambush: { name: "Ambush", text: `You were ambushed: -${AMBUSH_DAMAGE} health.` },
  storm: { name: "Storm", text: "A storm damaged one of your plots." },
  desertion: { name: "Desertion", text: "One of your residents deserted you." }
};

export const GLOBAL_EVENT_LABELS: Record<GlobalEventId, { name: string; text: string }> = {
  harvestFestival: { name: "Harvest Festival", text: `Everyone gets +${HARVEST_FESTIVAL_COIN} coin.` },
  plague: { name: "Plague", text: `Residents lose ${percent(PLAGUE_HEALTH_LOSS_RATIO)} health.` },
  royalTax: { name: "Royal Tax", text: `Everyone pays ${percent(ROYAL_TAX_RATIO)} of their coin.` },
  peaceTreaty: { name: "Peace Treaty", text: "No attacks this round." },
  warFever: { name: "War Fever", text: `Kings fight with +${WAR_FEVER_ATTACK_BONUS} attack this round.` },
  marketBoom: { name: "Market Boom", text: `Fees x${MARKET_BOOM_FEE_MULTIPLIER} this round.` },
  bountifulYear: { name: "Bountiful Year", text: `Income x${BOUNTIFUL_YEAR_INCOME_MULTIPLIER} for two rounds.` }
};

export const plotLabel = (plotId: TileId): string => `Plot ${plotId}`;

export const tileLabel = (tileId: TileId): string => String(tileId).padStart(2, "0");

// Seats are fixed per playerID, so the seat number is stable for the whole match.
export const seatNumber = (playerId: PlayerId): number => Number(playerId) + 1;

export const roomPath = (roomCode: string, page: string): string => `/room/${roomCode}/${page}`;

export const isItemId = (value: string): value is ItemId => Object.hasOwn(ITEM_LABELS, value);
export const isCardType = (value: string): value is CardType => Object.hasOwn(CARD_LABELS, value);
export const isPersonalEventId = (value: string): value is PersonalEventId => Object.hasOwn(PERSONAL_EVENT_LABELS, value);
export const isGlobalEventId = (value: string): value is GlobalEventId => Object.hasOwn(GLOBAL_EVENT_LABELS, value);
