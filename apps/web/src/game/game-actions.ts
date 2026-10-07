import { previewCommand } from "@moronarchy/core/engine";
import type { GameCommandName, GameState, ItemId, PlayerId, ResidentId, ResidentKind, TileId } from "@moronarchy/core/engine";

export type SendMove = (move: string, ...args: unknown[]) => void;

// One typed wrapper per engine command. Moves are server-authoritative, so these only ask.
export const createGameActions = (send: SendMove) => ({
  claimTurn: () => send("claimTurn"),
  rollDice: () => send("rollDice"),
  confirmRoll: () => send("confirmRoll"),
  useItem: (itemId: ItemId, target?: { plotId: TileId }) => (target ? send("useItem", itemId, target) : send("useItem", itemId)),
  pickCard: (index: number) => send("pickCard", index),
  leaveStartStation: () => send("leaveStartStation"),
  buyPlot: () => send("buyPlot"),
  skipPlot: () => send("skipPlot"),
  payFee: () => send("payFee"),
  collectFee: () => send("collectFee"),
  attack: () => send("attack"),
  fightRoll: () => send("fightRoll"),
  retreat: () => send("retreat"),
  upgradePlot: (plotId: TileId) => send("upgradePlot", plotId),
  healPlot: (plotId: TileId) => send("healPlot", plotId),
  recruitResident: (plotId: TileId, kind: ResidentKind) => send("recruitResident", plotId, kind),
  upgradeResident: (residentId: ResidentId) => send("upgradeResident", residentId),
  healResident: (residentId: ResidentId) => send("healResident", residentId),
  buyItem: (itemId: ItemId) => send("buyItem", itemId),
  endTurn: () => send("endTurn"),
  returnToLobby: () => send("returnToLobby")
});

export type GameActions = ReturnType<typeof createGameActions>;

// "What would the engine answer to this right now?" for the viewer: ok, or the reason it would refuse.
export type RunCheck = (name: GameCommandName, ...args: unknown[]) => ReturnType<typeof previewCommand>;

export const createRunCheck =
  (game: GameState, viewerId: PlayerId): RunCheck =>
  (name, ...args) =>
    previewCommand(game, viewerId, name, args);

// "Would the engine accept this right now?" for the viewer, answered by the engine itself.
export type CanRun = (name: GameCommandName, ...args: unknown[]) => boolean;

export const createCanRun =
  (game: GameState, viewerId: PlayerId): CanRun =>
  (name, ...args) =>
    previewCommand(game, viewerId, name, args).ok;
