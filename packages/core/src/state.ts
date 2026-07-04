import {
  BOARD_SIZE,
  MAX_KING_LEVEL,
  MAX_LAND_LEVEL,
  MAX_PLAYERS,
  MAX_ROUNDS,
  MIN_PLAYERS,
  START_BONUS,
  START_TILE_ID,
  STARTING_COIN,
  STARTING_HEALTH
} from "./constants";
import { getLandEconomy, getRentForLevel, getUpgradeCost } from "./economy";
import type {
  GameLogEntry,
  KingLevel,
  LandLevel,
  MoronarchyState,
  MoveResult,
  PlayerId,
  PlayerState,
  TileId,
  TileState
} from "./types";

export const createTiles = (): TileState[] => {
  return Array.from({ length: BOARD_SIZE }, (_, index) => {
    const id = index + 1;
    return {
      id,
      type: id === START_TILE_ID ? "start" : "land",
      ownerId: null,
      landLevel: 0
    };
  });
};

export const createPlayers = (playerIds: PlayerId[]): PlayerState[] => {
  if (playerIds.length < MIN_PLAYERS || playerIds.length > MAX_PLAYERS) {
    throw new Error(`Moronarchy supports ${MIN_PLAYERS}-${MAX_PLAYERS} players.`);
  }

  return playerIds.map((id, index) => ({
    id,
    name: `King ${index + 1}`,
    health: STARTING_HEALTH,
    coin: STARTING_COIN,
    level: 1,
    position: START_TILE_ID,
    lapCount: 0,
    defeated: false
  }));
};

export const createInitialState = (
  playerIds: PlayerId[] = ["0", "1"],
  maxRounds: 30 = MAX_ROUNDS
): MoronarchyState => ({
  players: createPlayers(playerIds),
  tiles: createTiles(),
  currentRound: 1,
  maxRounds,
  phase: "rolling",
  winnerId: null,
  lastDiceRoll: null,
  logs: []
});

export const getPlayer = (state: MoronarchyState, playerId: PlayerId): PlayerState | undefined => {
  return state.players.find((player) => player.id === playerId);
};

export const getTile = (state: MoronarchyState, tileId: TileId): TileState | undefined => {
  return state.tiles[tileId - 1];
};

export const getPlayerTile = (state: MoronarchyState, playerId: PlayerId): TileState | undefined => {
  const player = getPlayer(state, playerId);
  return player ? getTile(state, player.position) : undefined;
};

export const addLog = (state: MoronarchyState, message: string): void => {
  const entry: GameLogEntry = {
    id: `${Date.now()}-${state.logs.length}`,
    message
  };
  state.logs = [entry, ...state.logs].slice(0, 8);
};

const alivePlayers = (state: MoronarchyState): PlayerState[] => {
  return state.players.filter((player) => !player.defeated);
};

export const getTotalValue = (state: MoronarchyState, playerId: PlayerId): number => {
  const player = getPlayer(state, playerId);
  if (!player) return 0;

  const ownedLandValue = state.tiles.reduce((total, tile) => {
    if (tile.ownerId !== playerId || tile.type !== "land") return total;
    const economy = getLandEconomy(tile.id);
    const upgradeValue =
      tile.landLevel > 1
        ? economy.upgradeCosts.slice(0, tile.landLevel - 1).reduce((sum, cost) => sum + cost, 0)
        : 0;
    return total + economy.price + upgradeValue;
  }, 0);

  return player.coin + player.health + ownedLandValue;
};

export const selectRoundLimitWinner = (state: MoronarchyState): PlayerId | null => {
  const candidates = alivePlayers(state);
  if (candidates.length === 0) return null;

  return [...candidates].sort((left, right) => {
    const valueDiff = getTotalValue(state, right.id) - getTotalValue(state, left.id);
    if (valueDiff !== 0) return valueDiff;
    const coinDiff = right.coin - left.coin;
    if (coinDiff !== 0) return coinDiff;
    const healthDiff = right.health - left.health;
    if (healthDiff !== 0) return healthDiff;
    return left.id.localeCompare(right.id);
  })[0]?.id ?? null;
};

export const checkVictory = (state: MoronarchyState): PlayerId | null => {
  const remaining = alivePlayers(state);
  if (remaining.length === 1) {
    const winner = remaining[0];
    if (!winner) return null;
    state.winnerId = winner.id;
    state.phase = "game-over";
    addLog(state, `${winner.name} is the last king standing.`);
    return state.winnerId;
  }

  if (state.currentRound > state.maxRounds) {
    state.winnerId = selectRoundLimitWinner(state);
    state.phase = "game-over";
    addLog(state, "Round limit reached. Highest kingdom value wins.");
    return state.winnerId;
  }

  return null;
};

export const movePosition = (from: TileId, steps: number): { to: TileId; passedStart: boolean } => {
  const raw = from + steps;
  const to = ((raw - 1) % BOARD_SIZE) + 1;
  return {
    to,
    passedStart: raw > BOARD_SIZE
  };
};

const resolveRivalLandFee = (
  state: MoronarchyState,
  player: PlayerState,
  tile: TileState
): string | null => {
  if (!tile.ownerId || tile.ownerId === player.id || tile.landLevel === 0) return null;

  const owner = getPlayer(state, tile.ownerId);
  if (!owner) return null;

  const rent = getRentForLevel(tile.id, tile.landLevel);
  const paid = Math.min(player.coin, rent);
  player.coin -= rent;
  owner.coin += paid;

  if (player.coin <= 0) {
    player.coin = 0;
    player.defeated = true;
    return `${player.name} paid ${paid} coin to ${owner.name} and went bankrupt.`;
  }

  return `${player.name} paid ${rent} coin to ${owner.name}.`;
};

export const rollDiceAndMove = (
  state: MoronarchyState,
  playerId: PlayerId,
  diceValue: number
): MoveResult => {
  if (state.phase !== "rolling") return { ok: false, reason: "It is not rolling phase." };
  if (!Number.isInteger(diceValue) || diceValue < 1 || diceValue > 6) {
    return { ok: false, reason: "Dice value must be between 1 and 6." };
  }

  const player = getPlayer(state, playerId);
  if (!player || player.defeated) return { ok: false, reason: "Player cannot move." };

  const from = player.position;
  const movement = movePosition(from, diceValue);
  player.position = movement.to;

  if (movement.passedStart) {
    player.coin += START_BONUS;
    player.lapCount += 1;
    player.level = Math.min(MAX_KING_LEVEL, player.level + 1) as KingLevel;
    addLog(state, `${player.name} completed a lap and gained ${START_BONUS} coin.`);
  }

  state.lastDiceRoll = {
    playerId,
    value: diceValue,
    from,
    to: movement.to,
    passedStart: movement.passedStart
  };

  const tile = getTile(state, movement.to);
  if (!tile) return { ok: false, reason: "Destination tile does not exist." };

  const feeMessage = tile.type === "land" ? resolveRivalLandFee(state, player, tile) : null;
  if (feeMessage) {
    addLog(state, feeMessage);
  }

  checkVictory(state);
  if (state.winnerId) {
    return { ok: true, message: state.logs[0]?.message ?? "Game over." };
  }

  if (tile.type === "land" && (!tile.ownerId || tile.ownerId === player.id)) {
    state.phase = "tile-action";
  } else {
    state.phase = "rolling";
  }

  const message = `${player.name} rolled ${diceValue} and moved to tile ${movement.to}.`;
  addLog(state, message);
  return { ok: true, message };
};

export const canBuyLand = (state: MoronarchyState, playerId: PlayerId): boolean => {
  const player = getPlayer(state, playerId);
  const tile = getPlayerTile(state, playerId);
  if (!player || !tile || state.phase !== "tile-action") return false;
  if (tile.type !== "land" || tile.ownerId !== null) return false;
  return player.coin - getLandEconomy(tile.id).price >= 1;
};

export const buyLand = (state: MoronarchyState, playerId: PlayerId): MoveResult => {
  if (!canBuyLand(state, playerId)) return { ok: false, reason: "Land cannot be bought." };

  const player = getPlayer(state, playerId);
  const tile = getPlayerTile(state, playerId);
  if (!player || !tile) return { ok: false, reason: "Player or tile is missing." };

  const price = getLandEconomy(tile.id).price;
  player.coin -= price;
  tile.ownerId = player.id;
  tile.landLevel = 1;
  state.phase = "rolling";

  const message = `${player.name} bought tile ${tile.id} for ${price} coin.`;
  addLog(state, message);
  return { ok: true, message };
};

export const canUpgradeLand = (state: MoronarchyState, playerId: PlayerId): boolean => {
  const player = getPlayer(state, playerId);
  const tile = getPlayerTile(state, playerId);
  if (!player || !tile || state.phase !== "tile-action") return false;
  if (tile.type !== "land" || tile.ownerId !== player.id) return false;
  if (tile.landLevel < 1 || tile.landLevel >= MAX_LAND_LEVEL) return false;

  const nextLevel = (tile.landLevel + 1) as LandLevel;
  if (player.level < nextLevel) return false;

  return player.coin - getUpgradeCost(tile.id, tile.landLevel) >= 1;
};

export const upgradeLand = (state: MoronarchyState, playerId: PlayerId): MoveResult => {
  if (!canUpgradeLand(state, playerId)) return { ok: false, reason: "Land cannot be upgraded." };

  const player = getPlayer(state, playerId);
  const tile = getPlayerTile(state, playerId);
  if (!player || !tile) return { ok: false, reason: "Player or tile is missing." };

  const cost = getUpgradeCost(tile.id, tile.landLevel);
  player.coin -= cost;
  tile.landLevel = (tile.landLevel + 1) as LandLevel;
  state.phase = "rolling";

  const message = `${player.name} upgraded tile ${tile.id} to level ${tile.landLevel}.`;
  addLog(state, message);
  return { ok: true, message };
};

export const skipTileAction = (state: MoronarchyState, playerId: PlayerId): MoveResult => {
  const player = getPlayer(state, playerId);
  if (!player || state.phase !== "tile-action") return { ok: false, reason: "No action to skip." };

  state.phase = "rolling";
  const message = `${player.name} skipped the tile action.`;
  addLog(state, message);
  return { ok: true, message };
};

export const completeTurn = (
  state: MoronarchyState,
  currentPlayerId: PlayerId,
  playOrder: readonly PlayerId[]
): void => {
  if (state.phase === "game-over") return;

  const lastSeat = playOrder[playOrder.length - 1];
  if (currentPlayerId === lastSeat) {
    state.currentRound += 1;
  }

  checkVictory(state);
};
