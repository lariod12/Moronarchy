import { Navigate, Route, Routes, useNavigate } from "react-router";
import { GameLayout } from "../../game/GameLayout";
import { GameSessionProvider, useGameSession } from "../../game/GameSession";
import { roomPath } from "../../game/labels";
import { toGameId } from "../../game/seen-store";
import { useMatch } from "../../match/MatchProvider";
import { useLeaveRoom } from "../../match/useLeaveRoom";
import { SketchBox } from "../../ui/SketchBox/SketchBox";
import { CardPickScreen } from "../cards/CardPickScreen";
import { FightScreen } from "../fight/FightScreen";
import { EventsScreen } from "../events/EventsScreen";
import { ItemDetailScreen, ItemsScreen } from "../items/ItemScreens";
import { MapScreen } from "../map/MapScreen";
import { PlotDetailScreen } from "../plots/PlotDetailScreen";
import { PlotsScreen } from "../plots/PlotsScreen";
import { ResidentDetailScreen, ResidentsKindScreen, ResidentsScreen } from "../residents/ResidentsScreens";
import { StatsScreen } from "../stats/StatsScreen";
import { ManageScreen, StationScreen } from "../station/StationScreen";
import { HomeHub } from "./HomeHub";

const HomePage = () => {
  const { roomCode, viewerId } = useGameSession();
  const navigate = useNavigate();
  return <HomeHub onOpen={(page) => navigate(roomPath(roomCode, page === "stats" ? `stats/${viewerId}` : page))} />;
};

const RoomHomeRedirect = () => {
  const { roomCode } = useGameSession();
  return <Navigate to={roomPath(roomCode, "home")} replace />;
};

// The in-game pages under /room/:code: home, the info pages, map, fight, cards, station and manage/:plotId. Needs a GameSessionProvider.
export const GameRouteTree = () => (
  <Routes>
    <Route element={<GameLayout />}>
      <Route index element={<RoomHomeRedirect />} />
      <Route path="home" element={<HomePage />} />
      <Route path="stats/:playerId" element={<StatsScreen />} />
      <Route path="plots" element={<PlotsScreen />} />
      <Route path="plots/:plotId" element={<PlotDetailScreen />} />
      <Route path="residents" element={<ResidentsScreen />} />
      <Route path="residents/:kind" element={<ResidentsKindScreen />} />
      <Route path="residents/:kind/:residentId" element={<ResidentDetailScreen />} />
      <Route path="items" element={<ItemsScreen />} />
      <Route path="items/:itemId" element={<ItemDetailScreen />} />
      <Route path="events" element={<EventsScreen />} />
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
  const leaveRoom = useLeaveRoom();

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
    <GameSessionProvider game={game} viewerId={playerID} roomCode={roomCode} gameId={toGameId(roomCode, state.gamesPlayed)} send={send} onLeave={leaveRoom}>
      <GameRouteTree />
    </GameSessionProvider>
  );
};
