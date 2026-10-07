import type { FighterRef, FightRoundRecord, FightSideSnapshot, FightState, GameState, PlayerId, TileId } from "../model/types";
import { getPlot } from "../rules/board";
import { getFightHumanIds } from "../rules/combat";
import { getPlotFee } from "../rules/economy";
import { snapshotFightSide } from "../rules/fight-snapshot";
import { previewCommand } from "./preview";

export type FightSideKind = FighterRef["type"];
export type FightViewerRole = "attacker" | "defender" | "spectator";

export interface FightSideView extends FightSideSnapshot {
  // Human king that has already rolled this round (the value stays hidden from other clients).
  hasRolled: boolean;
  isViewer: boolean;
}

export interface FightView {
  kind: FightState["kind"];
  plotId: TileId;
  plotLevel: number;
  attacker: FightSideView;
  defender: FightSideView;
  rounds: FightRoundRecord[];
  viewerRole: FightViewerRole;
  // The engine would accept the viewer's roll / retreat right now.
  canRoll: boolean;
  canRetreat: boolean;
  // Kings that still have to roll this round.
  waitingFor: PlayerId[];
  // Fee the attacker pays when they retreat (a duel costs nothing).
  retreatFee: number;
  // Set once the fight is over (the view then comes from the stored result).
  winner: "attacker" | "defender" | null;
  retreated: boolean;
}

const roleIn = (attackerId: PlayerId | null, defenderId: PlayerId | null, viewerId: PlayerId): FightViewerRole => {
  if (attackerId !== null && attackerId === viewerId) {
    return "attacker";
  }
  if (defenderId !== null && defenderId === viewerId) {
    return "defender";
  }
  return "spectator";
};

const kingOf = (ref: FighterRef): PlayerId | null => (ref.type === "king" ? ref.playerId : null);

// Where the viewer stands in the running fight: a king on either side, or a spectator (also when nothing is fought).
export const getFightViewerRole = (game: GameState, viewerId: PlayerId): FightViewerRole =>
  game.fight ? roleIn(kingOf(game.fight.attacker), kingOf(game.fight.defender), viewerId) : "spectator";

// Everything the Fight page draws, derived from the engine so the UI never re-computes combat numbers.
// Null when no fight is running.
export const getFightView = (game: GameState, viewerId: PlayerId): FightView | null => {
  const fight = game.fight;
  if (!fight) {
    return null;
  }
  const plot = getPlot(game, fight.plotId);
  // A human has rolled when a value (or the placeholder other clients get) is stored, whatever the number.
  const side = (which: "attacker" | "defender"): FightSideView => {
    const snapshot = snapshotFightSide(game, fight, which);
    return {
      ...snapshot,
      hasRolled: snapshot.playerId !== null && fight.pendingRolls[snapshot.playerId] !== undefined,
      isViewer: snapshot.playerId !== null && snapshot.playerId === viewerId
    };
  };
  return {
    kind: fight.kind,
    plotId: fight.plotId,
    plotLevel: plot?.level ?? 0,
    attacker: side("attacker"),
    defender: side("defender"),
    rounds: fight.rounds,
    viewerRole: getFightViewerRole(game, viewerId),
    canRoll: previewCommand(game, viewerId, "fightRoll").ok,
    canRetreat: previewCommand(game, viewerId, "retreat").ok,
    waitingFor: getFightHumanIds(fight).filter((id) => fight.pendingRolls[id] === undefined),
    retreatFee: fight.kind === "kingVsKing" || !plot ? 0 : getPlotFee(game, plot),
    winner: null,
    retreated: false
  };
};

// The same view for the fight that just ended, from the result the engine stored (the live fight is already gone).
// Null when no fight was ever finished.
export const getFinalFightView = (game: GameState, viewerId: PlayerId): FightView | null => {
  const result = game.lastFight;
  if (!result) {
    return null;
  }
  const side = (snapshot: FightSideSnapshot): FightSideView => ({
    ...snapshot,
    hasRolled: false,
    isViewer: snapshot.playerId !== null && snapshot.playerId === viewerId
  });
  return {
    kind: result.kind,
    plotId: result.plotId,
    plotLevel: getPlot(game, result.plotId)?.level ?? 0,
    attacker: side(result.attackerSide),
    defender: side(result.defenderSide),
    rounds: result.rounds,
    viewerRole: roleIn(result.attackerId, kingOf(result.defender), viewerId),
    canRoll: false,
    canRetreat: false,
    waitingFor: [],
    retreatFee: 0,
    winner: result.winner,
    retreated: result.retreated
  };
};
