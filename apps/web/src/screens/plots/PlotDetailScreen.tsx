import { getPlotInfo } from "@moronarchy/core/engine";
import { Navigate, useNavigate, useParams } from "react-router";
import { useGameSession } from "../../game/GameSession";
import { roomPath } from "../../game/labels";
import { runStationAction } from "../station/run-action";
import { PlotDetailView } from "./PlotDetailView";

export const PlotDetailScreen = () => {
  const { game, viewerId, roomCode, actions, check } = useGameSession();
  const navigate = useNavigate();
  const plotId = Number(useParams().plotId);

  if (!getPlotInfo(game, plotId)) {
    return <Navigate to={roomPath(roomCode, "plots")} replace />;
  }

  return (
    <PlotDetailView
      game={game}
      viewerId={viewerId}
      plotId={plotId}
      check={check}
      onAction={(action) => runStationAction(actions, action)}
      onOpenResident={(resident) => navigate(roomPath(roomCode, `residents/${resident.kind}/${resident.id}`))}
    />
  );
};
