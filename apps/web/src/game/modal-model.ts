import { getFightViewerRole, getPlot } from "@moronarchy/core/engine";
import type { EliminationReason, GameState, LogEntry, PendingDecision, PlayerId, TileId } from "@moronarchy/core/engine";
import { getLoseFace } from "./end-model";
import { describeFightResult, fightNoticeKey } from "./fight-result";
import type { FightResultModel } from "./fight-result";
import { getNotification } from "./log-format";
import type { Notification } from "./log-format";

type Pending<K extends PendingDecision["kind"]> = Extract<PendingDecision, { kind: K }>;

export type ModalModel =
  | { kind: "lose"; key: string; round: number | null; reason: EliminationReason | null }
  | { kind: "buyPlot"; pending: Pending<"buyPlot"> }
  | { kind: "visitorChoice"; pending: Pending<"visitorChoice"> }
  | { kind: "ownerChoice"; pending: Pending<"ownerChoice"> }
  | { kind: "luckyDie"; value: number; bonus: number }
  | { kind: "waiting"; pending: Pending<"ownerChoice"> }
  | { kind: "fightNotice"; key: string; plotId: TileId; attackerId: PlayerId; ownerId: PlayerId | null }
  | { kind: "fightResult"; model: FightResultModel }
  | { kind: "notice"; entry: LogEntry; notification: Notification }
  | { kind: "ownPlot"; plotId: TileId; key: string };

export interface ModalInput {
  game: GameState;
  viewerId: PlayerId;
  isAnimating: boolean;
  // Log entries up to this seq were already shown (or predate this tab).
  seenSeq: number;
  dismissed: ReadonlySet<string>;
  // The viewer is looking at the Fight page (so they get the result of the fight they watched).
  onFightPage?: boolean;
  // The result popup the Fight page already finished revealing (the popup waits for its last round).
  revealedKey?: string | null;
}

export const ownPlotKey = (game: GameState, plotId: TileId): string => `ownPlot:${game.round}:${game.turn.playerId}:${plotId}`;

// The queued notifications for this viewer, oldest first.
export const getPendingNotices = (game: GameState, viewerId: PlayerId, seenSeq: number): ModalModel[] =>
  game.log.flatMap((entry) => {
    if (entry.seq <= seenSeq) {
      return [];
    }
    const notification = getNotification(entry, game, viewerId);
    return notification ? [{ kind: "notice" as const, entry, notification }] : [];
  });

// The finished fight the viewer took part in (or owns the plot of), until they pressed Done.
const getUnseenFightResult = (
  game: GameState,
  viewerId: PlayerId,
  seenSeq: number,
  dismissed: ReadonlySet<string>,
  watching: boolean
): Extract<ModalModel, { kind: "fightResult" }> | null => {
  const model = describeFightResult(game, viewerId, watching);
  return model && model.seq > seenSeq && !dismissed.has(model.key) ? { kind: "fightResult", model } : null;
};

// A fight the viewer does not fight in: watch it or not. The absent plot owner gets the same popup, worded for them.
const getFightNotice = (game: GameState, viewerId: PlayerId, seenSeq: number, dismissed: ReadonlySet<string>): ModalModel | null => {
  const { fight } = game;
  if (!fight || fight.attacker.type !== "king" || getFightViewerRole(game, viewerId) !== "spectator") {
    return null;
  }
  const started = [...game.log].reverse().find((entry) => entry.type === "fightStarted");
  if (!started || started.seq <= seenSeq) {
    return null;
  }
  const key = fightNoticeKey(started.seq);
  if (dismissed.has(key)) {
    return null;
  }
  return { kind: "fightNotice", key, plotId: fight.plotId, attackerId: fight.attacker.playerId, ownerId: getPlot(game, fight.plotId)?.ownerId ?? null };
};

// Exactly one modal at a time. Priority: being knocked out of the game (a full-frame face), your decision, the result of your fight, a fight you can watch, Lucky Die,
// waiting for someone else, notifications, own-plot shortcut. Nothing shows while the king is still
// walking, and fighters see only their fight (the Fight page is forced on them).
export const selectModal = ({ game, viewerId, isAnimating, seenSeq, dismissed, onFightPage = false, revealedKey = null }: ModalInput): ModalModel | null => {
  if (isAnimating) {
    return null;
  }
  // Going bankrupt beats everything else, including a decision or fight popup of the same moment.
  const lose = getLoseFace(game, viewerId, seenSeq, dismissed);
  if (lose) {
    return { kind: "lose", key: lose.key, round: lose.round, reason: lose.reason };
  }
  const { pending, turn } = game;
  const isTurnPlayer = turn.playerId === viewerId;

  if (game.fight && getFightViewerRole(game, viewerId) !== "spectator") {
    return null;
  }

  const fightResult = getUnseenFightResult(game, viewerId, seenSeq, dismissed, onFightPage);
  // On the Fight page the popup waits until the last round has been shown.
  if (fightResult && onFightPage && revealedKey !== fightResult.model.key) {
    return null;
  }
  // The attacker who broke a plot hears how the fight went before being offered to buy it.
  if (fightResult && pending?.kind === "buyPlot" && pending.playerId === viewerId && pending.reason === "destroyed") {
    return fightResult;
  }

  if (pending && pending.playerId === viewerId) {
    switch (pending.kind) {
      case "buyPlot":
        return { kind: "buyPlot", pending };
      case "visitorChoice":
        return { kind: "visitorChoice", pending };
      case "ownerChoice":
        return { kind: "ownerChoice", pending };
      case "pickCard":
        // The card pick is its own page, not a popup.
        break;
    }
  }

  if (fightResult) {
    return fightResult;
  }

  const fightNotice = getFightNotice(game, viewerId, seenSeq, dismissed);
  if (fightNotice) {
    return fightNotice;
  }

  if (isTurnPlayer && !pending && turn.step === "rolled" && turn.dice) {
    return { kind: "luckyDie", value: turn.dice.value, bonus: turn.dice.bonus };
  }

  if (isTurnPlayer && pending?.kind === "ownerChoice" && pending.visitorId === viewerId) {
    return { kind: "waiting", pending };
  }

  const [notice] = getPendingNotices(game, viewerId, seenSeq);
  if (notice) {
    return notice;
  }

  const plotId = turn.manageablePlotId;
  if (isTurnPlayer && turn.step === "postMove" && !pending && !game.fight && plotId !== null) {
    const key = ownPlotKey(game, plotId);
    if (getPlot(game, plotId)?.ownerId === viewerId && !dismissed.has(key)) {
      return { kind: "ownPlot", plotId, key };
    }
  }

  return null;
};
