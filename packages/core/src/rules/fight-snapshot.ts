import type { FighterRef, FightRoundResult, FightSideSnapshot, FightState, GameState } from "../model/types";
import { getPlot } from "./board";
import { getPlotMaxHealth } from "./economy";
import { getFighterStats, getKingStats, getResidentsOnPlot } from "./stats";

// One side of a fight as the Fight page shows it: health, combat numbers, buffs and the round marks.
export const snapshotFightSide = (game: GameState, fight: FightState, side: "attacker" | "defender"): FightSideSnapshot => {
  const ref: FighterRef = fight[side];
  const stats = getFighterStats(game, fight, ref);
  const results: FightRoundResult[] = fight.rounds.flatMap((round) =>
    round.winner === "tie" ? [] : [round.winner === side ? ("won" as const) : ("lost" as const)]
  );
  const base = {
    kind: ref.type,
    attack: stats.attack,
    defense: stats.defense,
    roundsWon: side === "attacker" ? fight.attackerWins : fight.defenderWins,
    results
  };

  if (ref.type === "king") {
    const king = game.kings[ref.playerId];
    return {
      ...base,
      playerId: ref.playerId,
      name: king?.name ?? null,
      health: Math.max(0, king?.health ?? 0),
      maxHealth: king ? getKingStats(game, ref.playerId).maxHealth : 0,
      buffs: { ...(fight.buffs[ref.playerId] ?? { attack: 0, defense: 0 }) },
      aliveResidents: null,
      plotLevel: null
    };
  }
  if (ref.type === "garrison") {
    return {
      ...base,
      playerId: null,
      name: null,
      health: fight.garrison?.pool ?? 0,
      maxHealth: fight.garrison?.maxPool ?? 0,
      buffs: { attack: 0, defense: 0 },
      aliveResidents: getResidentsOnPlot(game, ref.plotId).length,
      plotLevel: null
    };
  }
  const plot = getPlot(game, ref.plotId);
  return {
    ...base,
    playerId: null,
    name: null,
    health: plot?.health ?? 0,
    maxHealth: plot ? getPlotMaxHealth(plot.level) : 0,
    buffs: { attack: 0, defense: 0 },
    aliveResidents: null,
    plotLevel: plot?.level ?? 0
  };
};
