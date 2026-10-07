import { ITEMS } from "../content/items";
import * as engine from "../flow/commands";
import type { GameState, ItemId, PlayerId, ResidentKind, TileId } from "../model/types";
import type { Rng } from "../rules/rng";
import { syncStage } from "./lobby";
import type { MatchResult, MatchState } from "./types";

export const GAME_COMMAND_NAMES = [
  "claimTurn",
  "rollDice",
  "confirmRoll",
  "useItem",
  "pickCard",
  "leaveStartStation",
  "buyPlot",
  "skipPlot",
  "payFee",
  "collectFee",
  "attack",
  "fightRoll",
  "retreat",
  "upgradePlot",
  "healPlot",
  "recruitResident",
  "upgradeResident",
  "healResident",
  "buyItem",
  "endTurn",
  "forfeit"
] as const;

export type GameCommandName = (typeof GAME_COMMAND_NAMES)[number];

const invalid = (): MatchResult => ({ ok: false, error: "INVALID_ARGUMENT" });

const isItemId = (value: unknown): value is ItemId => typeof value === "string" && Object.hasOwn(ITEMS, value);

const isPlotId = (value: unknown): value is TileId =>
  typeof value === "number" && Number.isInteger(value) && value >= 2 && value <= 40;

const isResidentId = (game: GameState, value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && Object.hasOwn(game.residents, value);

const isResidentKind = (value: unknown): value is ResidentKind => value === "warrior" || value === "farmer";

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null;

// Validates raw (client-supplied) arguments, then calls the engine command.
export const dispatchGameCommand = (game: GameState, actorId: PlayerId, rng: Rng, name: GameCommandName, args: unknown[]): MatchResult => {
  const [first, second] = args;
  switch (name) {
    case "claimTurn":
      return engine.claimTurn(game, actorId, rng);
    case "rollDice":
      return engine.rollDice(game, actorId, rng);
    case "confirmRoll":
      return engine.confirmRoll(game, actorId, rng);
    case "leaveStartStation":
      return engine.leaveStartStation(game, actorId, rng);
    case "buyPlot":
      return engine.buyPlot(game, actorId, rng);
    case "skipPlot":
      return engine.skipPlot(game, actorId, rng);
    case "payFee":
      return engine.payFee(game, actorId, rng);
    case "collectFee":
      return engine.collectFee(game, actorId, rng);
    case "attack":
      return engine.attack(game, actorId, rng);
    case "fightRoll":
      return engine.fightRoll(game, actorId, rng);
    case "retreat":
      return engine.retreat(game, actorId, rng);
    case "endTurn":
      return engine.endTurn(game, actorId, rng);
    case "forfeit":
      return engine.forfeit(game, actorId, rng);
    case "pickCard":
      return typeof first === "number" && Number.isInteger(first) ? engine.pickCard(game, actorId, rng, first) : invalid();
    case "useItem": {
      if (!isItemId(first)) {
        return invalid();
      }
      if (second === undefined) {
        return engine.useItem(game, actorId, rng, first);
      }
      if (!isRecord(second) || !isPlotId(second.plotId)) {
        return invalid();
      }
      return engine.useItem(game, actorId, rng, first, { plotId: second.plotId });
    }
    case "upgradePlot":
      return isPlotId(first) ? engine.upgradePlot(game, actorId, rng, first) : invalid();
    case "healPlot":
      return isPlotId(first) ? engine.healPlot(game, actorId, rng, first) : invalid();
    case "recruitResident":
      return isPlotId(first) && isResidentKind(second)
        ? engine.recruitResident(game, actorId, rng, first, second)
        : invalid();
    case "upgradeResident":
      return isResidentId(game, first) ? engine.upgradeResident(game, actorId, rng, first) : invalid();
    case "healResident":
      return isResidentId(game, first) ? engine.healResident(game, actorId, rng, first) : invalid();
    case "buyItem":
      return isItemId(first) ? engine.buyItem(game, actorId, rng, first) : invalid();
  }
};

export const runGameCommand = (
  state: MatchState,
  actorId: PlayerId,
  rng: Rng,
  name: GameCommandName,
  args: unknown[]
): MatchResult => {
  const game = state.game;
  if (state.stage !== "playing" || !game) {
    return { ok: false, error: "WRONG_STAGE" };
  }
  const result = dispatchGameCommand(game, actorId, rng, name, args);
  if (result.ok) {
    syncStage(state);
  }
  return result;
};
