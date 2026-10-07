import { BAG_MAX_CONSUMABLE, BAG_MAX_EQUIPMENT, ITEM_DROP_BASE, ITEM_DROP_MAX, ITEM_DROP_PER_LUCKY } from "../content/balance";
import { CONSUMABLE_IDS, ITEMS } from "../content/items";
import type { CommandResult, GameState, ItemId, King, PlayerId } from "../model/types";
import { pushLog } from "./log";
import { pick } from "./rng";
import type { Rng } from "./rng";

export const getItemCount = (king: King, itemId: ItemId): number => king.items[itemId] ?? 0;

export const getItemLimit = (itemId: ItemId): number =>
  ITEMS[itemId].kind === "consumable" ? BAG_MAX_CONSUMABLE : BAG_MAX_EQUIPMENT;

export const hasBagRoom = (king: King, itemId: ItemId): boolean => getItemCount(king, itemId) < getItemLimit(itemId);

export const getItemDropChance = (lucky: number): number =>
  Math.min(ITEM_DROP_MAX, ITEM_DROP_BASE + ITEM_DROP_PER_LUCKY * lucky);

// Adds one item to the bag. Returns false (and logs bagFull) when the stack is already full.
export const grantItem = (state: GameState, playerId: PlayerId, itemId: ItemId): boolean => {
  const king = state.kings[playerId];
  if (!king) {
    return false;
  }
  if (!hasBagRoom(king, itemId)) {
    pushLog(state, "bagFull", playerId, { itemId });
    return false;
  }
  king.items[itemId] = getItemCount(king, itemId) + 1;
  return true;
};

export const grantRandomConsumable = (state: GameState, rng: Rng, playerId: PlayerId): ItemId | null => {
  const itemId = pick(rng, CONSUMABLE_IDS);
  return grantItem(state, playerId, itemId) ? itemId : null;
};

export const consumeItem = (king: King, itemId: ItemId): void => {
  const remaining = getItemCount(king, itemId) - 1;
  if (remaining <= 0) {
    delete king.items[itemId];
  } else {
    king.items[itemId] = remaining;
  }
};

export const buyItem = (state: GameState, playerId: PlayerId, itemId: ItemId): CommandResult => {
  const king = state.kings[playerId];
  const def = ITEMS[itemId];
  if (!king || !def) {
    return { ok: false, error: "INVALID_TARGET" };
  }
  if (!hasBagRoom(king, itemId)) {
    return { ok: false, error: "LIMIT_REACHED" };
  }
  if (king.coin < def.price) {
    return { ok: false, error: "INSUFFICIENT_COIN" };
  }
  king.coin -= def.price;
  king.items[itemId] = getItemCount(king, itemId) + 1;
  pushLog(state, "itemBought", playerId, { itemId, price: def.price });
  return { ok: true };
};
