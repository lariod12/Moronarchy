import type { CommandResult, GameState, PlayerId } from "../model/types";
import { getPlot } from "../rules/board";
import { endFight, getFightHumanIds } from "../rules/combat";
import { eliminate } from "../rules/elimination";
import type { Rng } from "../rules/rng";
import { afterResolution, finishTurn } from "./turn";

// Does the running fight involve this king: as a fighter, or as the owner of the plot/garrison being attacked?
const isInFight = (state: GameState, playerId: PlayerId): boolean => {
  const fight = state.fight;
  if (!fight) {
    return false;
  }
  return getFightHumanIds(fight).includes(playerId) || getPlot(state, fight.plotId)?.ownerId === playerId;
};

// Does the open decision wait on this king, or sit on a plot / with a visitor that is about to disappear with them?
const pendingConcerns = (state: GameState, playerId: PlayerId): boolean => {
  const pending = state.pending;
  if (!pending) {
    return false;
  }
  if (pending.playerId === playerId) {
    return true;
  }
  switch (pending.kind) {
    case "visitorChoice":
      return pending.ownerId === playerId || getPlot(state, pending.plotId)?.ownerId === playerId;
    case "ownerChoice":
      return pending.visitorId === playerId;
    case "buyPlot":
    case "pickCard":
      return false;
  }
};

// A king leaves the game for good (the server does this for players disconnected too long). They are eliminated with
// reason "left": plots and residents go back to the map, the game carries on without them or finishes.
export const forfeitKing = (state: GameState, playerId: PlayerId, rng: Rng): CommandResult => {
  if (state.phase === "finished") {
    return { ok: false, error: "GAME_OVER" };
  }
  const king = state.kings[playerId];
  if (!king || king.eliminated) {
    return { ok: false, error: "NOT_ACTOR" };
  }

  let resolved = false;
  const fight = state.fight;
  if (fight && isInFight(state, playerId)) {
    // The leaver's side loses: as attacker -> defender wins; as defender king, or as the owner whose plot/garrison
    // is attacked -> attacker wins (no loot, the owner is leaving).
    const leaverAttacks = fight.attacker.type === "king" && fight.attacker.playerId === playerId;
    endFight(state, leaverAttacks ? "defender" : "attacker", false, true);
    resolved = true;
  }
  if (state.pending && pendingConcerns(state, playerId)) {
    state.pending = null;
    resolved = true;
  }

  eliminate(state, playerId, "left");
  // eliminate() may have finished the game (TypeScript still narrows the phase to "playing" here).
  if ((state.phase as GameState["phase"]) === "finished") {
    return { ok: true };
  }
  if (state.turn.playerId === playerId) {
    finishTurn(state, rng);
  } else if (resolved) {
    afterResolution(state, rng);
  }
  return { ok: true };
};
