import { Navigate, useNavigate, useParams } from "react-router";
import { useGameSession } from "../../game/GameSession";
import type { GameActions } from "../../game/game-actions";
import { roomPath } from "../../game/labels";
import { StationView } from "./StationView";
import type { StationAction } from "./StationView";

const runAction = (actions: GameActions, action: StationAction): void => {
  switch (action.name) {
    case "upgradePlot":
      return actions.upgradePlot(action.plotId);
    case "healPlot":
      return actions.healPlot(action.plotId);
    case "recruitResident":
      return actions.recruitResident(action.plotId, action.kind);
    case "upgradeResident":
      return actions.upgradeResident(action.residentId);
    case "healResident":
      return actions.healResident(action.residentId);
    case "buyItem":
      return actions.buyItem(action.itemId);
  }
};

// The Start Station: manage everything you own, shop, then keep moving.
export const StationScreen = () => {
  const { game, viewerId, roomCode, actions, canRun } = useGameSession();
  const navigate = useNavigate();
  const isTurnPlayer = game.turn.playerId === viewerId;

  if (!isTurnPlayer || game.turn.step !== "startStation") {
    return <Navigate to={roomPath(roomCode, isTurnPlayer ? "map" : "home")} replace />;
  }

  return (
    <StationView
      game={game}
      viewerId={viewerId}
      scope={{ kind: "station" }}
      canRun={canRun}
      onAction={(action) => runAction(actions, action)}
      onDone={() => {
        actions.leaveStartStation();
        navigate(roomPath(roomCode, "map"), { replace: true });
      }}
    />
  );
};

// The plot you just landed on (or bought): the same screen limited to that plot, without the shop.
export const ManageScreen = () => {
  const { game, viewerId, roomCode, actions, canRun } = useGameSession();
  const navigate = useNavigate();
  const params = useParams();
  const plotId = Number(params.plotId);
  const isTurnPlayer = game.turn.playerId === viewerId;
  const manageable = isTurnPlayer && game.turn.step === "postMove" && game.turn.manageablePlotId === plotId;

  if (!manageable) {
    return <Navigate to={roomPath(roomCode, isTurnPlayer ? "map" : "home")} replace />;
  }

  return (
    <StationView
      game={game}
      viewerId={viewerId}
      scope={{ kind: "plot", plotId }}
      canRun={canRun}
      onAction={(action) => runAction(actions, action)}
      onDone={() => navigate(roomPath(roomCode, "map"), { replace: true })}
    />
  );
};
