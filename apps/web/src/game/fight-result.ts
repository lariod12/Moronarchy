import { getPlot } from "@moronarchy/core/engine";
import type { FightResult, GameState, LogEntry, PlayerId, TileId } from "@moronarchy/core/engine";
import { plotLabel } from "./labels";

export type FightResultRole = "attacker" | "defender" | "owner" | "spectator";

export interface FightResultModel {
  // The fightEnded log entry this result belongs to: one popup per fight.
  seq: number;
  key: string;
  role: FightResultRole;
  title: string;
  lines: string[];
  result: FightResult;
}

const latestEntry = (game: GameState, type: string, matches: (entry: LogEntry) => boolean = () => true): LogEntry | undefined =>
  [...game.log].reverse().find((entry) => entry.type === type && matches(entry));

// Seq of the newest fightEnded log entry (what the result popup and its key are tied to).
export const getLastFightEndSeq = (game: GameState): number | null => latestEntry(game, "fightEnded")?.seq ?? null;

export const fightResultKey = (endedSeq: number): string => `fightResult:${endedSeq}`;
export const fightNoticeKey = (startedSeq: number): string => `fightNotice:${startedSeq}`;

const who = (game: GameState, viewerId: PlayerId, playerId: PlayerId): string =>
  playerId === viewerId ? "You" : (game.kings[playerId]?.name ?? "Someone");

const defenderKingId = (result: FightResult): PlayerId | null => (result.defender.type === "king" ? result.defender.playerId : null);

// The owner of the fought plot, also after it was destroyed (the log remembers who lost it).
const plotOwnerAtTheTime = (game: GameState, plotId: TileId, endedSeq: number): PlayerId | null => {
  const owner = getPlot(game, plotId)?.ownerId ?? null;
  if (owner) {
    return owner;
  }
  const destroyed = latestEntry(game, "plotDestroyed", (entry) => entry.seq < endedSeq && Number(entry.data.plotId) === plotId);
  return destroyed && typeof destroyed.data.ownerId === "string" ? destroyed.data.ownerId : null;
};

const winnerName = (game: GameState, viewerId: PlayerId, result: FightResult): string => {
  if (result.winner === "attacker") {
    return who(game, viewerId, result.attackerId);
  }
  const kingId = defenderKingId(result);
  if (kingId) {
    return who(game, viewerId, kingId);
  }
  return result.defender.type === "garrison" ? "The residents" : plotLabel(result.plotId);
};

const money = (game: GameState, viewerId: PlayerId, payerId: PlayerId, receiverId: PlayerId | null, amount: number): string => {
  const payer = who(game, viewerId, payerId);
  const receiver = receiverId === null ? null : who(game, viewerId, receiverId);
  if (receiver === null) {
    return `${payer} paid ${amount} coin`;
  }
  if (payer === "You") {
    return `You paid ${amount} coin to ${receiver}`;
  }
  return receiver === "You" ? `${payer} paid you ${amount} coin` : `${payer} paid ${amount} coin to ${receiver}`;
};

// Popup content for the newest finished fight, from the viewer's point of view. Null when the viewer was not
// involved (not a fighter, not the plot owner) and was not `watching` the fight page, or when the log no longer
// knows the fight.
export const describeFightResult = (game: GameState, viewerId: PlayerId, watching = false): FightResultModel | null => {
  const result = game.lastFight;
  const ended = latestEntry(game, "fightEnded");
  if (!result || !ended) {
    return null;
  }
  const defenderId = defenderKingId(result);
  const ownerId = plotOwnerAtTheTime(game, result.plotId, ended.seq);
  let role: FightResultRole;
  if (viewerId === result.attackerId) {
    role = "attacker";
  } else if (viewerId === defenderId) {
    role = "defender";
  } else if (viewerId === ownerId) {
    role = "owner";
  } else if (watching) {
    role = "spectator";
  } else {
    return null;
  }

  const viewerWon = role === "attacker" ? result.winner === "attacker" : role === "defender" ? result.winner === "defender" : null;
  const title = viewerWon === null ? "Fight over" : viewerWon ? "Victory!" : "Defeat";

  const lines: string[] = [`Winner: ${winnerName(game, viewerId, result)}`];
  if (result.retreated) {
    lines.push(result.attackerId === viewerId ? "You retreated. It counts as a loss." : `${who(game, viewerId, result.attackerId)} retreated. It counts as a loss.`);
  }
  if (result.feePaid > 0) {
    // A duel fee is paid by the visiting king to the owner who attacked; every other fee comes from the attacker.
    const payerId = result.kind === "kingVsKing" ? defenderId : result.attackerId;
    const receiverId = result.kind === "kingVsKing" ? result.attackerId : ownerId;
    if (payerId) {
      lines.push(money(game, viewerId, payerId, receiverId, result.feePaid));
    }
  }
  if (result.loot > 0) {
    lines.push(
      result.attackerId === viewerId
        ? `You looted ${result.loot} coin`
        : `${who(game, viewerId, result.attackerId)} looted ${result.loot} coin${ownerId === viewerId ? " from you" : ""}`
    );
  }
  if (result.residentsKilled > 0) {
    lines.push(result.residentsKilled === 1 ? "1 resident was killed" : `${result.residentsKilled} residents were killed`);
  }
  if (result.plotOutcome === "levelDown") {
    lines.push(`${plotLabel(result.plotId)} dropped to Lv ${getPlot(game, result.plotId)?.level ?? 0}`);
  } else if (result.plotOutcome === "destroyed") {
    lines.push(`${plotLabel(result.plotId)} was destroyed`);
  }

  const started = latestEntry(game, "fightStarted", (entry) => entry.seq < ended.seq);
  const knockedOut = game.log.filter(
    (entry) => entry.type === "knockedOut" && entry.seq < ended.seq && started !== undefined && entry.seq > started.seq && entry.playerId !== null
  );
  for (const entry of knockedOut) {
    lines.push(entry.playerId === viewerId ? "You were knocked out and skip your next turn" : `${who(game, viewerId, entry.playerId ?? "")} was knocked out`);
  }

  return { seq: ended.seq, key: fightResultKey(ended.seq), role, title, lines, result };
};

// "Alice is attacking Plot 12 (Bob)", or, for the absent owner, "Alice is attacking your Plot 12!".
export const fightNoticeText = (game: GameState, viewerId: PlayerId, attackerId: PlayerId, plotId: TileId, ownerId: PlayerId | null): string => {
  const attacker = game.kings[attackerId]?.name ?? "Someone";
  if (ownerId === viewerId) {
    return `${attacker} is attacking your ${plotLabel(plotId)}!`;
  }
  const owner = ownerId ? game.kings[ownerId]?.name : undefined;
  return `${attacker} is attacking ${plotLabel(plotId)}${owner ? ` (${owner})` : ""}`;
};
