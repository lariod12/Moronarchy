export const BOARD_SIZE = 40;
export const START_TILE = 1;
export const MIN_PLAYERS = 2;
export const MAX_PLAYERS = 6;
export const MAX_KING_LEVEL = 5;
export const MAX_PLOT_LEVEL = 5;
export const MAX_RESIDENT_LEVEL = 5;

// King
export const KING_START_COIN = 300;
export const KING_START_HEALTH = 100;
export const KING_START_ATTACK = 5;
export const KING_START_DEFENSE = 3;
export const KING_START_LUCKY = 0;
export const KING_LEVEL_MAX_HEALTH_GAIN = 10;
export const KING_LEVEL_ATTACK_GAIN = 1;
export const START_BONUS = 100;
export const KO_HEAL_RATIO = 0.5;

// Regions: first tile, last tile, base price
export const REGIONS: readonly { from: number; to: number; base: number }[] = [
  { from: 2, to: 10, base: 60 },
  { from: 11, to: 20, base: 80 },
  { from: 21, to: 30, base: 100 },
  { from: 31, to: 40, base: 120 }
];

// Plot tables, index = plot level 0..5
export const PLOT_FEE_MULTIPLIER = [0.25, 0.5, 0.9, 1.4, 2.0, 2.8] as const;
export const PLOT_INCOME_MULTIPLIER = [0.05, 0.1, 0.18, 0.28, 0.4, 0.55] as const;
// index = current level, cost to reach current level + 1
export const PLOT_UPGRADE_MULTIPLIER = [0.5, 0.75, 1.0, 1.25, 1.5] as const;
export const PLOT_HEALTH = [15, 25, 35, 50, 65, 80] as const;
export const PLOT_DEFENSE = [0, 1, 2, 3, 4, 5] as const;
export const PLOT_MAX_RESIDENTS = [1, 2, 3, 3, 4, 5] as const;
export const PLOT_HEAL_BASE = 10;
export const PLOT_HEAL_PER_LEVEL = 15;

// Royal inflation: from round 20 every 5 rounds adds +25% to fees
export const INFLATION_START_ROUND = 20;
export const INFLATION_STEP_ROUNDS = 5;
export const INFLATION_STEP = 0.25;

// Residents
export interface ResidentTemplate {
  cost: number;
  health: number;
  attack: number;
  defense: number;
  healthPerLevel: number;
  attackPerLevel: number;
  defensePerLevel: number;
  upgradeCostPerLevel: number;
}
export const RESIDENTS: Record<"warrior" | "farmer", ResidentTemplate> = {
  warrior: {
    cost: 70,
    health: 30,
    attack: 4,
    defense: 2,
    healthPerLevel: 8,
    attackPerLevel: 1,
    defensePerLevel: 1,
    upgradeCostPerLevel: 40
  },
  farmer: {
    cost: 40,
    health: 20,
    attack: 1,
    defense: 0,
    healthPerLevel: 5,
    attackPerLevel: 1,
    defensePerLevel: 1,
    upgradeCostPerLevel: 25
  }
};
export const RESIDENT_HEAL_BASE = 5;
export const RESIDENT_HEAL_PER_LEVEL = 5;
export const FARMER_INCOME_PER_LEVEL = 10;
export const WARRIOR_KING_ATTACK_BONUS = 2;
export const WARRIOR_KING_DEFENSE_BONUS = 1;

// Combat
export const GARRISON_LOOT_MULTIPLIER = 2;
export const FIGHT_ROUNDS_TO_WIN = 2;
export const FIGHT_BUFF = 3;
export const WAR_FEVER_ATTACK_BONUS = 2;

// Lucky
export const ITEM_DROP_BASE = 0.1;
export const ITEM_DROP_PER_LUCKY = 0.03;
export const ITEM_DROP_MAX = 0.4;
export const PERSONAL_EVENT_CHANCE = 0.1;
export const GOOD_EVENT_BASE = 0.5;
export const GOOD_EVENT_PER_LUCKY = 0.05;
export const GOOD_EVENT_MAX = 0.9;

// Global events
export const GLOBAL_EVENT_FIRST_ROUND = 4;
export const GLOBAL_EVENT_CHANCE = 0.2;
export const MARKET_BOOM_FEE_MULTIPLIER = 1.5;
export const BOUNTIFUL_YEAR_INCOME_MULTIPLIER = 2;
export const HARVEST_FESTIVAL_COIN = 50;
export const PLAGUE_HEALTH_LOSS_RATIO = 0.3;
export const ROYAL_TAX_RATIO = 0.1;

// Personal events
export const TREASURE_CHEST_COIN = 60;
export const MERCHANT_BAG_FULL_COIN = 30;
export const VOLUNTEER_FALLBACK_COIN = 40;
export const PICKPOCKET_COIN = 40;
export const AMBUSH_DAMAGE = 25;
export const STORM_HEALTH_LOSS_RATIO = 0.5;

// Items
export const BAG_MAX_CONSUMABLE = 5;
export const BAG_MAX_EQUIPMENT = 1;
export const HORSE_MOVE_BONUS = 3;
export const MEAT_HEAL = 30;
export const EQUIPMENT_BONUS = 2;

// History caps
export const LOG_LIMIT = 50;
export const EVENT_HISTORY_LIMIT = 50;
