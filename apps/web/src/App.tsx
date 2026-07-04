import { Route, Routes } from "react-router";
import { GamePage } from "./pages/GamePage";
import { HomePage } from "./pages/HomePage";
import { ResultPage } from "./pages/ResultPage";
import { RoomPage } from "./pages/RoomPage";

export const App = () => {
  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/room/:roomId" element={<RoomPage />} />
      <Route path="/game/:matchId" element={<GamePage />} />
      <Route path="/result/:matchId" element={<ResultPage />} />
    </Routes>
  );
};
