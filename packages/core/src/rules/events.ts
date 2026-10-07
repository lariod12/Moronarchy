import {
  AMBUSH_DAMAGE,
  GLOBAL_EVENT_CHANCE,
  GLOBAL_EVENT_FIRST_ROUND,
  GOOD_EVENT_BASE,
  GOOD_EVENT_MAX,
  GOOD_EVENT_PER_LUCKY,
  HARVEST_FESTIVAL_COIN,
  MERCHANT_BAG_FULL_COIN,
  PERSONAL_EVENT_CHANCE,
  PICKPOCKET_COIN,
  PLAGUE_HEALTH_LOSS_RATIO,
  ROYAL_TAX_RATIO,
  STORM_HEALTH_LOSS_RATIO,
  TREASURE_CHEST_COIN,
  VOLUNTEER_FALLBACK_COIN
} from "../content/balance";
import { BAD_PERSONAL_EVENTS, GLOBAL_EVENTS, GLOBAL_EVENT_IDS, GOOD_PERSONAL_EVENTS } from "../content/events";
import type { GameState, GlobalEventId, PersonalEventId, PlayerId } from "../model/types";
import { knockOut } from "./combat";
import { getAliveKingIds } from "./elimination";
import { getItemDropChance, grantRandomConsumable } from "./items";
import { pushEventHistory, pushLog } from "./log";
import { createResident, getMaxResidents } from "./residents";
import { pick, weightedPick } from "./rng";
import type { Rng } from "./rng";
import { getKingStats } from "./stats";

export const getGoodEventChance = (lucky: number): number =>
  Math.min(GOOD_EVENT_MAX, GOOD_EVENT_BASE + GOOD_EVENT_PER_LUCKY * lucky);

export const applyPersonalEvent = (
  state: GameState,
  rng: Rng,
  playerId: PlayerId,
  eventId: PersonalEventId
): void => {
  const king = state.kings[playerId];
  if (!king) {
    return;
  }
  const stats = getKingStats(state, playerId);
  switch (eventId) {
    case "treasureChest":
      king.coin += TREASURE_CHEST_COIN;
      break;
    case "wanderingMerchant":
      if (!grantRandomConsumable(state, rng, playerId)) {
        king.coin += MERCHANT_BAG_FULL_COIN;
      }
      break;
    case "healingSpring":
      king.health = stats.maxHealth;
      break;
    case "volunteer": {
      const plot = state.plots.find((entry) => entry.ownerId === playerId && entry.residentIds.length < getMaxResidents(entry));
      if (plot) {
        createResident(state, plot, "farmer", playerId);
      } else {
        king.coin += VOLUNTEER_FALLBACK_COIN;
      }
      break;
    }
    case "blessing":
      king.lucky += 1;
      break;
    case "pickpocket":
      king.coin -= Math.min(king.coin, PICKPOCKET_COIN);
      break;
    case "ambush":
      king.health -= AMBUSH_DAMAGE;
      if (king.health <= 0) {
        knockOut(state, playerId);
      }
      break;
    case "storm": {
      const plots = state.plots.filter((entry) => entry.ownerId === playerId);
      if (plots.length > 0) {
        const plot = pick(rng, plots);
        plot.health = Math.max(1, plot.health - Math.floor(plot.health * STORM_HEALTH_LOSS_RATIO));
      }
      break;
    }
    case "desertion": {
      const residents = Object.values(state.residents).filter((entry) => entry.ownerId === playerId);
      if (residents.length > 0) {
        const resident = pick(rng, residents);
        const plot = state.plots.find((entry) => entry.id === resident.plotId);
        if (plot) {
          plot.residentIds = plot.residentIds.filter((id) => id !== resident.id);
        }
        delete state.residents[resident.id];
      }
      break;
    }
  }
  pushEventHistory(state, "personal", eventId, playerId);
  pushLog(state, "personalEvent", playerId, { eventId });
};

// RNG order: next() < personal chance; then next() < good chance and one weighted next();
// otherwise next() < item drop chance and one uniform next().
export const rollLandingEffect = (state: GameState, rng: Rng, playerId: PlayerId): void => {
  const lucky = getKingStats(state, playerId).lucky;
  if (rng.next() < PERSONAL_EVENT_CHANCE) {
    const good = rng.next() < getGoodEventChance(lucky);
    const eventId = weightedPick(rng, good ? GOOD_PERSONAL_EVENTS : BAD_PERSONAL_EVENTS);
    applyPersonalEvent(state, rng, playerId, eventId);
    return;
  }
  if (rng.next() < getItemDropChance(lucky)) {
    const itemId = grantRandomConsumable(state, rng, playerId);
    if (itemId) {
      pushLog(state, "itemFound", playerId, { itemId });
    }
  }
};

export const applyGlobalEvent = (state: GameState, eventId: GlobalEventId): void => {
  switch (eventId) {
    case "harvestFestival":
      for (const id of getAliveKingIds(state)) {
        const king = state.kings[id];
        if (king) {
          king.coin += HARVEST_FESTIVAL_COIN;
        }
      }
      break;
    case "plague":
      for (const resident of Object.values(state.residents)) {
        resident.health = Math.max(1, resident.health - Math.floor(resident.health * PLAGUE_HEALTH_LOSS_RATIO));
      }
      break;
    case "royalTax":
      for (const id of getAliveKingIds(state)) {
        const king = state.kings[id];
        if (king) {
          king.coin -= Math.floor(king.coin * ROYAL_TAX_RATIO);
        }
      }
      break;
    default:
      // Duration events only flag behaviour via activeGlobalEvents.
      break;
  }
};

export const onRoundStart = (state: GameState, rng: Rng): void => {
  state.activeGlobalEvents = state.activeGlobalEvents.filter((event) => event.endRound >= state.round);
  if (state.round < GLOBAL_EVENT_FIRST_ROUND || state.activeGlobalEvents.length > 0) {
    return;
  }
  if (rng.next() >= GLOBAL_EVENT_CHANCE) {
    return;
  }
  const eventId = pick(rng, GLOBAL_EVENT_IDS);
  applyGlobalEvent(state, eventId);
  const duration = GLOBAL_EVENTS[eventId].durationRounds;
  if (duration > 0) {
    state.activeGlobalEvents.push({ eventId, startRound: state.round, endRound: state.round + duration - 1 });
  }
  pushEventHistory(state, "global", eventId, null);
  pushLog(state, "globalEvent", null, { eventId });
};
