import { Navigate, useNavigate, useParams } from "react-router";
import { useGameSession } from "../../game/GameSession";
import { roomPath } from "../../game/labels";
import { runStationAction } from "./run-action";
import { StationView } from "./StationView";

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
      onAction={(action) => runStationAction(actions, action)}
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
      onAction={(action) => runStationAction(actions, action)}
      onDone={() => navigate(roomPath(roomCode, "map"), { replace: true })}
    />
  );
};
