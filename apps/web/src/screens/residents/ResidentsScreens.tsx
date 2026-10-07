import { getResidentInfo } from "@moronarchy/core/engine";
import { Navigate, useNavigate, useParams, useSearchParams } from "react-router";
import { useGameSession } from "../../game/GameSession";
import { isResidentKind, roomPath } from "../../game/labels";
import { runStationAction } from "../station/run-action";
import { ResidentDetailView } from "./ResidentDetailView";
import { ResidentsKindView } from "./ResidentsKindView";
import type { ResidentsLayout } from "./ResidentsKindView";
import { ResidentsView } from "./ResidentsView";

export const ResidentsScreen = () => {
  const { game, viewerId, roomCode } = useGameSession();
  const navigate = useNavigate();
  return <ResidentsView game={game} viewerId={viewerId} onOpenKind={(kind) => navigate(roomPath(roomCode, `residents/${kind}`))} />;
};

export const ResidentsKindScreen = () => {
  const { game, viewerId, roomCode } = useGameSession();
  const navigate = useNavigate();
  const { kind = "" } = useParams();
  const [params, setParams] = useSearchParams();
  const layout: ResidentsLayout = params.get("view") === "grid" ? "grid" : "table";

  if (!isResidentKind(kind)) {
    return <Navigate to={roomPath(roomCode, "residents")} replace />;
  }

  return (
    <ResidentsKindView
      game={game}
      viewerId={viewerId}
      kind={kind}
      layout={layout}
      onLayout={(value) => setParams(value === "grid" ? { view: "grid" } : {}, { replace: true })}
      onOpenResident={(resident) => navigate(roomPath(roomCode, `residents/${resident.kind}/${resident.id}`))}
    />
  );
};

export const ResidentDetailScreen = () => {
  const { game, viewerId, roomCode, actions, check } = useGameSession();
  const { residentId = "" } = useParams();

  if (!getResidentInfo(game, residentId)) {
    return <Navigate to={roomPath(roomCode, "residents")} replace />;
  }

  return (
    <ResidentDetailView
      game={game}
      viewerId={viewerId}
      residentId={residentId}
      check={check}
      onAction={(action) => runStationAction(actions, action)}
    />
  );
};
