import { getEliminationInfo, getFinalRanking } from "@moronarchy/core/engine";
import type { EliminationReason, GameState, PlayerId } from "@moronarchy/core/engine";

// What the end of the game shows one viewer. The rules (who is out, in which round, who won, the order) come from
// the engine; this file only decides which face a viewer still has to be shown.

export interface EndFace {
  kind: "win" | "lose";
  // Remembered in the seen state once the viewer pressed the button, so reloads and later games never replay it.
  key: string;
  // Lose face: the round the king went out in.
  round: number | null;
  // Lose face: bankrupt, or removed after disconnecting for too long.
  reason: EliminationReason | null;
}

const FACE_PREFIX = { kingEliminated: "lose", kingLeft: "lose", gameFinished: "win" } as const;

// The viewer's newest log entry of this type, as a face to show. A tab starts each match "caught up" (see useSeenState),
// so only an entry newer than that is shown, and never one whose button was already pressed.
const unseenFace = (
  game: GameState,
  viewerId: PlayerId,
  type: keyof typeof FACE_PREFIX,
  seenSeq: number,
  dismissed: ReadonlySet<string>
): { key: string } | null => {
  const entry = [...game.log].reverse().find((candidate) => candidate.type === type && candidate.playerId === viewerId);
  if (!entry || entry.seq <= seenSeq) {
    return null;
  }
  const key = `${FACE_PREFIX[type]}:${entry.seq}`;
  return dismissed.has(key) ? null : { key };
};

// The face of a king who went bankrupt (or was removed for staying disconnected), until they pressed its button.
export const getLoseFace = (game: GameState, viewerId: PlayerId, seenSeq: number, dismissed: ReadonlySet<string>): EndFace | null => {
  const info = getEliminationInfo(game, viewerId);
  const face = info.eliminated ? unseenFace(game, viewerId, info.reason === "left" ? "kingLeft" : "kingEliminated", seenSeq, dismissed) : null;
  return face ? { kind: "lose", key: face.key, round: info.round, reason: info.reason } : null;
};

// The face of the last king standing.
export const getWinFace = (game: GameState, viewerId: PlayerId, seenSeq: number, dismissed: ReadonlySet<string>): EndFace | null => {
  const face = game.phase === "finished" && game.winnerId === viewerId ? unseenFace(game, viewerId, "gameFinished", seenSeq, dismissed) : null;
  return face ? { kind: "win", key: face.key, round: null, reason: null } : null;
};

// Once the match is finished: the winner sees Win, a king knocked out by the finishing move sees Lose, others nothing.
export const getEndFace = (game: GameState, viewerId: PlayerId, seenSeq: number, dismissed: ReadonlySet<string>): EndFace | null =>
  getWinFace(game, viewerId, seenSeq, dismissed) ?? getLoseFace(game, viewerId, seenSeq, dismissed);

export interface RankingRow {
  playerId: PlayerId;
  name: string;
  isSelf: boolean;
  rank: number;
  // The round this king went out in; null for the winner.
  outRound: number | null;
  // Bankrupt or removed after disconnecting; null for the winner.
  outReason: EliminationReason | null;
}

// Best first: the winner, then the kings in reverse order of elimination.
export const toRankingRows = (game: GameState, viewerId: PlayerId): RankingRow[] =>
  getFinalRanking(game).map((playerId, index) => ({
    playerId,
    name: game.kings[playerId]?.name ?? "Someone",
    isSelf: playerId === viewerId,
    rank: index + 1,
    outRound: playerId === game.winnerId ? null : getEliminationInfo(game, playerId).round,
    outReason: playerId === game.winnerId ? null : getEliminationInfo(game, playerId).reason
  }));
