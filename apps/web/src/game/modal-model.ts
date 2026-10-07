import { getCrownState, getPlot } from "@moronarchy/core/engine";
import type { GameState, LogEntry, PendingDecision, PlayerId, TileId } from "@moronarchy/core/engine";
import { getNotification } from "./log-format";
import type { Notification } from "./log-format";

type Pending<K extends PendingDecision["kind"]> = Extract<PendingDecision, { kind: K }>;

export type ModalModel =
  | { kind: "buyPlot"; pending: Pending<"buyPlot"> }
  | { kind: "visitorChoice"; pending: Pending<"visitorChoice"> }
  | { kind: "ownerChoice"; pending: Pending<"ownerChoice"> }
  | { kind: "luckyDie"; value: number; bonus: number }
  | { kind: "waiting"; pending: Pending<"ownerChoice"> }
  | { kind: "endTurn" }
  | { kind: "notice"; entry: LogEntry; notification: Notification }
  | { kind: "ownPlot"; plotId: TileId; key: string };

export interface ModalInput {
  game: GameState;
  viewerId: PlayerId;
  isAnimating: boolean;
  endTurnOpen: boolean;
  // Log entries up to this seq were already shown (or predate this tab).
  seenSeq: number;
  dismissed: ReadonlySet<string>;
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

// Exactly one modal at a time. Priority: your decision, Lucky Die, waiting for someone else, End of turn,
// notifications, own-plot shortcut. Nothing shows while the king is still walking.
export const selectModal = ({ game, viewerId, isAnimating, endTurnOpen, seenSeq, dismissed }: ModalInput): ModalModel | null => {
  if (isAnimating) {
    return null;
  }
  const { pending, turn } = game;
  const isTurnPlayer = turn.playerId === viewerId;

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

  if (isTurnPlayer && !pending && turn.step === "rolled" && turn.dice) {
    return { kind: "luckyDie", value: turn.dice.value, bonus: turn.dice.bonus };
  }

  if (isTurnPlayer && pending?.kind === "ownerChoice" && pending.visitorId === viewerId) {
    return { kind: "waiting", pending };
  }

  if (endTurnOpen && getCrownState(game, viewerId) === "canEndTurn") {
    return { kind: "endTurn" };
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
