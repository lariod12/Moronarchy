import { Navigate, Route, Routes, useNavigate } from "react-router";
import { GameLayout } from "../../game/GameLayout";
import { GameSessionProvider, useGameSession } from "../../game/GameSession";
import { roomPath } from "../../game/labels";
import { useMatch } from "../../match/MatchProvider";
import { SketchBox } from "../../ui/SketchBox/SketchBox";
import { CardPickScreen } from "../cards/CardPickScreen";
import { FightScreen } from "../fight/FightScreen";
import { MapScreen } from "../map/MapScreen";
import { ManageScreen, StationScreen } from "../station/StationScreen";
import { HomeHub } from "./HomeHub";

const HomePage = () => {
  const { roomCode } = useGameSession();
  const navigate = useNavigate();
  return <HomeHub onOpenMap={() => navigate(roomPath(roomCode, "map"))} />;
};

const RoomHomeRedirect = () => {
  const { roomCode } = useGameSession();
  return <Navigate to={roomPath(roomCode, "home")} replace />;
};

// The in-game pages under /room/:code: home, map, fight, cards, station and manage/:plotId. Needs a GameSessionProvider.
export const GameRouteTree = () => (
  <Routes>
    <Route element={<GameLayout />}>
      <Route index element={<RoomHomeRedirect />} />
      <Route path="home" element={<HomePage />} />
      <Route path="map" element={<MapScreen />} />
      <Route path="fight" element={<FightScreen />} />
      <Route path="cards" element={<CardPickScreen />} />
      <Route path="station" element={<StationScreen />} />
      <Route path="manage/:plotId" element={<ManageScreen />} />
      <Route path="*" element={<RoomHomeRedirect />} />
    </Route>
  </Routes>
);

export const GameRoutes = () => {
  const { state, playerID, roomCode, send } = useMatch();
  const game = state?.game;

  if (!state || !game || !game.kings[playerID]) {
    return (
      <div className="screen">
        <SketchBox title="You are not in this game" className="screen__message">
          Ask the host to start a new room.
        </SketchBox>
      </div>
    );
  }

  return (
    <GameSessionProvider game={game} viewerId={playerID} roomCode={roomCode} gameId={`${roomCode}-${state.gamesPlayed}`} send={send}>
      <GameRouteTree />
    </GameSessionProvider>
  );
};
