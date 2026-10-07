import type { GameState, LogEntry, PlayerId, TileId } from "@moronarchy/core/engine";
import {
  CARD_LABELS,
  GLOBAL_EVENT_LABELS,
  ITEM_LABELS,
  PERSONAL_EVENT_LABELS,
  RESIDENT_LABELS,
  isCardType,
  isGlobalEventId,
  isItemId,
  isPersonalEventId,
  plotLabel
} from "./labels";

export interface Notification {
  title: string;
  text: string;
}

const text = (entry: LogEntry, key: string): string => {
  const value = entry.data[key];
  return value === undefined ? "" : String(value);
};

const num = (entry: LogEntry, key: string): number => {
  const value = Number(entry.data[key]);
  return Number.isFinite(value) ? value : 0;
};

const itemName = (entry: LogEntry, key = "itemId"): string => {
  const id = text(entry, key);
  return isItemId(id) ? ITEM_LABELS[id] : "an item";
};

const plotName = (entry: LogEntry, key = "plotId"): string => plotLabel(num(entry, key) as TileId);

const tileName = (tileId: TileId): string => (tileId === 1 ? "Start" : plotLabel(tileId));

const who = (game: GameState, viewerId: PlayerId, playerId: PlayerId | null): string => {
  if (playerId === null) {
    return "Someone";
  }
  if (playerId === viewerId) {
    return "You";
  }
  return game.kings[playerId]?.name ?? "Someone";
};

const possessive = (game: GameState, viewerId: PlayerId, playerId: PlayerId | null): string => {
  const name = who(game, viewerId, playerId);
  return name === "You" ? "your" : `${name}'s`;
};

// "Where did the roll end?" is only known for the move in progress: the engine keeps `turn.path` for it.
const rollDestination = (entry: LogEntry, game: GameState): string => {
  const latestRoll = [...game.log].reverse().find((candidate) => candidate.type === "diceRolled");
  const last = game.turn.path[game.turn.path.length - 1];
  if (latestRoll?.seq !== entry.seq || entry.playerId !== game.turn.playerId || last === undefined) {
    return "";
  }
  return ` → ${tileName(last)}`;
};

// One line of English for a log entry, from the viewer's point of view. Null for entries the UI does not know.
export const formatLogEntry = (entry: LogEntry, game: GameState, viewerId: PlayerId): string | null => {
  const actor = who(game, viewerId, entry.playerId);
  const be = actor === "You" ? "were" : "was";
  switch (entry.type) {
    case "gameStarted":
      return "Game started";
    case "turnClaimed":
      return `${actor} took the turn`;
    case "turnSkipped":
      return `${actor} skipped the turn`;
    case "diceRolled": {
      const bonus = num(entry, "bonus");
      return `${actor} rolled ${num(entry, "value")}${bonus > 0 ? ` (+${bonus})` : ""}${rollDestination(entry, game)}`;
    }
    case "diceRerolled":
      return `${actor} rerolled and got ${num(entry, "value")}`;
    case "lapCompleted":
      return `${actor} completed a lap`;
    case "cardPicked": {
      const type = text(entry, "type");
      return `${actor} picked ${isCardType(type) ? CARD_LABELS[type] : "a card"} +${num(entry, "value")}`;
    }
    case "plotBought":
      return `${actor} bought ${plotName(entry)}`;
    case "plotSkipped":
      return `${actor} skipped ${plotName(entry)}`;
    case "plotUpgraded":
      return `${actor} upgraded ${plotName(entry)} to level ${num(entry, "level")}`;
    case "plotHealed":
      return `${actor} healed ${plotName(entry)}`;
    case "residentRecruited": {
      const kind = text(entry, "kind");
      const label = kind === "warrior" || kind === "farmer" ? RESIDENT_LABELS[kind] : "resident";
      return `${actor} recruited a ${label} on ${plotName(entry)}`;
    }
    case "residentUpgraded":
      return `${actor} upgraded a resident to level ${num(entry, "level")}`;
    case "residentHealed":
      return `${actor} healed a resident`;
    case "itemBought":
      return `${actor} bought ${itemName(entry)}`;
    case "itemUsed":
      return `${actor} used ${itemName(entry)}`;
    case "itemFound":
      return `${actor} found ${itemName(entry)}`;
    case "bagFull":
      return `${possessive(game, viewerId, entry.playerId)} bag is full (${itemName(entry)})`;
    case "personalEvent": {
      const id = text(entry, "eventId");
      return `${actor}: ${isPersonalEventId(id) ? PERSONAL_EVENT_LABELS[id].name : "an event"}`;
    }
    case "globalEvent": {
      const id = text(entry, "eventId");
      return `Event: ${isGlobalEventId(id) ? GLOBAL_EVENT_LABELS[id].name : "something happened"}`;
    }
    case "feePaid": {
      const receiver = who(game, viewerId, text(entry, "ownerId"));
      const bankrupt = entry.data.bankrupt === true ? " and went bankrupt" : "";
      return `${actor} paid ${num(entry, "amount")} coin to ${receiver}${bankrupt}`;
    }
    case "fightStarted":
      return `${actor} started a fight at ${plotName(entry)}`;
    case "fightRound": {
      const winner = text(entry, "winner");
      const result = winner === "tie" ? "ended in a tie" : winner === "attacker" ? "went to the attacker" : "went to the defender";
      return `Fight round at ${plotName(entry)} ${result} (${num(entry, "damage")} damage)`;
    }
    case "fightEnded": {
      const retreated = entry.data.retreated === true;
      const winner = text(entry, "winner") === "attacker" ? actor : "the defender";
      return retreated ? `${actor} retreated from ${plotName(entry)}` : `Fight at ${plotName(entry)} won by ${winner}`;
    }
    case "knockedOut":
      return `${actor} ${be} knocked out`;
    case "residentKilled":
      return `One of ${possessive(game, viewerId, entry.playerId)} residents died at ${plotName(entry)}`;
    case "plotLevelDown":
      return `${plotName(entry)} dropped to level ${num(entry, "level")}`;
    case "plotDestroyed":
      return `${actor} destroyed ${plotName(entry)}`;
    case "kingEliminated":
      return `${actor} ${actor === "You" ? "are" : "is"} out of the game`;
    case "gameFinished":
      return `Game over: ${actor} win${actor === "You" ? "" : "s"}`;
    default:
      return null;
  }
};

// Entries that deserve a popup for this viewer (they matter to them, and they may not be looking at the log).
export const getNotification = (entry: LogEntry, game: GameState, viewerId: PlayerId): Notification | null => {
  switch (entry.type) {
    case "itemFound":
      return entry.playerId === viewerId ? { title: "Item found", text: `You found ${itemName(entry)}!` } : null;
    case "personalEvent": {
      const id = text(entry, "eventId");
      return entry.playerId === viewerId && isPersonalEventId(id)
        ? { title: PERSONAL_EVENT_LABELS[id].name, text: PERSONAL_EVENT_LABELS[id].text }
        : null;
    }
    case "feePaid":
      if (text(entry, "ownerId") !== viewerId || entry.playerId === viewerId) {
        return null;
      }
      return {
        title: "Fee received",
        text: `${who(game, viewerId, entry.playerId)} paid ${num(entry, "amount")} coin to you.`
      };
    case "knockedOut":
      return entry.playerId === viewerId
        ? { title: "Knocked out", text: `You were knocked out: you skip your next turn and recover to ${num(entry, "health")} health.` }
        : null;
    case "plotLevelDown":
      return entry.playerId === viewerId
        ? { title: "Plot damaged", text: `${plotName(entry)} dropped to level ${num(entry, "level")}.` }
        : null;
    case "plotDestroyed":
      return text(entry, "ownerId") === viewerId
        ? { title: "Plot lost", text: `${who(game, viewerId, entry.playerId)} destroyed your ${plotName(entry)}.` }
        : null;
    case "kingEliminated":
      return entry.playerId === viewerId
        ? { title: "Eliminated", text: "You ran out of coin and are out of the game. You can keep watching." }
        : null;
    default:
      return null;
  }
};

export const isNotificationFor = (entry: LogEntry, game: GameState, viewerId: PlayerId): boolean =>
  getNotification(entry, game, viewerId) !== null;

// Newest entry the UI can describe.
export const getActivityText = (game: GameState, viewerId: PlayerId): string | null => {
  for (let index = game.log.length - 1; index >= 0; index -= 1) {
    const entry = game.log[index];
    const line = entry ? formatLogEntry(entry, game, viewerId) : null;
    if (line !== null) {
      return line;
    }
  }
  return null;
};
