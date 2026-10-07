import { getPlot, getPlotFee } from "@moronarchy/core/engine";
import type { GameState, PlayerId, TileId } from "@moronarchy/core/engine";
import { useNavigate } from "react-router";
import { useMovement } from "./MovementContext";
import { useGameSession } from "./GameSession";
import {
  BuyPlotDialog,
  EndTurnDialog,
  LuckyDieDialog,
  NoticeDialog,
  OwnPlotDialog,
  OwnerChoiceDialog,
  VisitorChoiceDialog,
  WaitingDialog
} from "./dialogs/dialogs";
import { roomPath } from "./labels";
import { selectModal } from "./modal-model";
import { useSeenState } from "./useSeenState";

export interface ModalHostProps {
  endTurnOpen: boolean;
  onEndTurnClose: () => void;
}

const nameOf = (game: GameState, playerId: PlayerId): string => game.kings[playerId]?.name ?? "Someone";

const feeOf = (game: GameState, plotId: TileId): number => {
  const plot = getPlot(game, plotId);
  return plot ? getPlotFee(game, plot) : 0;
};

// Shows at most one popup, whatever page the viewer is on. What to show is decided by `selectModal`.
export const ModalHost = ({ endTurnOpen, onEndTurnClose }: ModalHostProps) => {
  const { game, viewerId, roomCode, gameId, actions, canRun } = useGameSession();
  const { isAnimating } = useMovement();
  const navigate = useNavigate();
  const seen = useSeenState(gameId, viewerId, game);

  const modal = selectModal({ game, viewerId, isAnimating, endTurnOpen, seenSeq: seen.seq, dismissed: seen.dismissed });
  if (!modal) {
    return null;
  }

  switch (modal.kind) {
    case "buyPlot":
      return (
        <BuyPlotDialog
          plotId={modal.pending.plotId}
          price={modal.pending.price}
          reason={modal.pending.reason}
          canAfford={canRun("buyPlot")}
          onSkip={actions.skipPlot}
          onBuy={actions.buyPlot}
        />
      );
    case "visitorChoice":
      return (
        <VisitorChoiceDialog
          ownerName={nameOf(game, modal.pending.ownerId)}
          plotId={modal.pending.plotId}
          fee={feeOf(game, modal.pending.plotId)}
          canAttack={modal.pending.canAttack}
          onPay={actions.payFee}
        />
      );
    case "ownerChoice":
      return (
        <OwnerChoiceDialog
          visitorName={nameOf(game, modal.pending.visitorId)}
          plotId={modal.pending.plotId}
          fee={feeOf(game, modal.pending.plotId)}
          canAttack={modal.pending.canAttack}
          onCollect={actions.collectFee}
        />
      );
    case "waiting":
      return <WaitingDialog ownerName={nameOf(game, modal.pending.playerId)} />;
    case "luckyDie":
      return (
        <LuckyDieDialog
          value={modal.value}
          bonus={modal.bonus}
          onReroll={() => actions.useItem("luckyDie")}
          onMove={actions.confirmRoll}
        />
      );
    case "endTurn":
      return (
        <EndTurnDialog
          onNo={onEndTurnClose}
          onYes={() => {
            onEndTurnClose();
            actions.endTurn();
          }}
        />
      );
    case "notice":
      return (
        <NoticeDialog
          key={modal.entry.seq}
          title={modal.notification.title}
          text={modal.notification.text}
          onDone={() => seen.markSeen(modal.entry.seq)}
        />
      );
    case "ownPlot":
      return (
        <OwnPlotDialog
          plotId={modal.plotId}
          onManage={() => {
            seen.dismiss(modal.key);
            navigate(roomPath(roomCode, `manage/${modal.plotId}`));
          }}
          onDone={() => seen.dismiss(modal.key)}
        />
      );
  }
};
