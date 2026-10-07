import { Navigate, useNavigate, useParams } from "react-router";
import { useGameSession } from "../../game/GameSession";
import { roomPath } from "../../game/labels";
import { StatsView } from "./StatsView";

// Players Info for /stats/:playerId. The arrows walk the turn order and replace the entry, so Back leaves the page.
export const StatsScreen = () => {
  const { game, viewerId, roomCode, offlineIds } = useGameSession();
  const navigate = useNavigate();
  const { playerId = "" } = useParams();

  if (!game.kings[playerId]) {
    return <Navigate to={roomPath(roomCode, `stats/${viewerId}`)} replace />;
  }

  const order = game.turnOrder;
  const index = order.indexOf(playerId);
  const step = (delta: number) => () => {
    const target = order[(index + delta + order.length) % order.length];
    if (target !== undefined) {
      navigate(roomPath(roomCode, `stats/${target}`), { replace: true });
    }
  };
  const cycle = order.length > 1 && index >= 0;

  return <StatsView game={game} playerId={playerId} viewerId={viewerId} offline={offlineIds.has(playerId)} onPrev={cycle ? step(-1) : undefined} onNext={cycle ? step(1) : undefined} />;
};
