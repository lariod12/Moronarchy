import { getPlot, getPlotFee } from "@moronarchy/core/engine";
import type { GameState, PlayerId, TileId } from "@moronarchy/core/engine";
import { useLocation, useNavigate } from "react-router";
import { useMovement } from "./MovementContext";
import { useGameSession } from "./GameSession";
import {
  BuyPlotDialog,
  EndTurnDialog,
  FightNoticeDialog,
  FightResultDialog,
  LuckyDieDialog,
  NoticeDialog,
  OwnPlotDialog,
  OwnerChoiceDialog,
  VisitorChoiceDialog,
  WaitingDialog
} from "./dialogs/dialogs";
import { fightNoticeText } from "./fight-result";
import { useFightReveal } from "./FightRevealContext";
import { getPageName } from "./forced-route";
import { roomPath } from "./labels";
import { selectModal } from "./modal-model";
import { useSeenState } from "./useSeenState";
import { LoseView } from "../screens/result/LoseView";

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
  const { game, viewerId, roomCode, gameId, actions, canRun, leaveRoom } = useGameSession();
  const { isAnimating } = useMovement();
  const navigate = useNavigate();
  const onFightPage = getPageName(useLocation().pathname) === "fight";
  const { revealedKey } = useFightReveal();
  const seen = useSeenState(gameId, viewerId, game);

  const modal = selectModal({
    game,
    viewerId,
    isAnimating,
    endTurnOpen,
    seenSeq: seen.seq,
    dismissed: seen.dismissed,
    onFightPage,
    revealedKey
  });
  if (!modal) {
    return null;
  }

  switch (modal.kind) {
    case "lose":
      return (
        <div className="result-overlay">
          <LoseView
            key={modal.key}
            round={modal.round}
            reason={modal.reason}
            continueLabel="Keep watching"
            onContinue={() => {
              seen.dismiss(modal.key);
              navigate(roomPath(roomCode, "map"), { replace: true });
            }}
            onLeave={leaveRoom}
          />
        </div>
      );
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
          attackEnabled={modal.pending.canAttack && canRun("attack")}
          onPay={actions.payFee}
          onAttack={actions.attack}
        />
      );
    case "ownerChoice":
      return (
        <OwnerChoiceDialog
          visitorName={nameOf(game, modal.pending.visitorId)}
          plotId={modal.pending.plotId}
          fee={feeOf(game, modal.pending.plotId)}
          canAttack={modal.pending.canAttack}
          attackEnabled={modal.pending.canAttack && canRun("attack")}
          onCollect={actions.collectFee}
          onAttack={actions.attack}
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
    case "fightNotice": {
      const text = fightNoticeText(game, viewerId, modal.attackerId, modal.plotId, modal.ownerId);
      return (
        <FightNoticeDialog
          key={modal.key}
          text={text}
          onWatch={() => {
            seen.dismiss(modal.key);
            navigate(roomPath(roomCode, "fight"));
          }}
          onLater={() => seen.dismiss(modal.key)}
        />
      );
    }
    case "fightResult":
      return (
        <FightResultDialog
          key={modal.model.key}
          title={modal.model.title}
          lines={modal.model.lines}
          onDone={() => {
            seen.dismiss(modal.model.key);
            if (modal.model.role === "attacker" || modal.model.role === "defender" || onFightPage) {
              navigate(roomPath(roomCode, "map"), { replace: true });
            }
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
