import { useMemo, useState } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router";
import { GameExtrasProvider } from "../game/GameExtras";
import { RoomScreen } from "../screens/room/RoomScreen";
import { BotControl } from "./BotControl";
import { BotDriver } from "./BotDriver";
import { LocalMatchProvider, SOLO_SETUP_PATH } from "./LocalMatchProvider";
import { createSoloMatch, SOLO_ROOM_CODE } from "./solo-match";
import { loadSolo, saveSolo } from "./solo-settings";
import type { SoloSettings } from "./solo-settings";
import { SoloSetupView } from "./SoloSetupView";

// The in-game pages keep their usual /room/<code>/<page> paths with the code SOLO, so every screen works unchanged.
export const SOLO_PLAY_PATH = `/room/${SOLO_ROOM_CODE}`;

const SOLO_EXTRAS = (
  <>
    <BotDriver />
    <BotControl />
  </>
);

export interface SoloSetupRouteProps {
  // Offer a Back button to Welcome (the normal app has one; the single file does not).
  canGoBack?: boolean;
}

// The setup screen: remembers the last settings, and Start seats the bots and opens the game.
export const SoloSetupRoute = ({ canGoBack = false }: SoloSetupRouteProps) => {
  const navigate = useNavigate();
  const [settings, setSettings] = useState<SoloSettings>(() => loadSolo().settings);
  const handleStart = () => {
    saveSolo({ settings, match: createSoloMatch(settings) });
    navigate(SOLO_PLAY_PATH);
  };
  return (
    <div className="phone-frame">
      <SoloSetupView settings={settings} onChange={setSettings} onStart={handleStart} onBack={canGoBack ? () => navigate("/") : undefined} />
    </div>
  );
};

// The game itself: the real room screen on top of the local match. Without a saved game it goes back to the setup.
export const SoloPlayRoute = () => {
  const save = useMemo(() => loadSolo(), []);
  if (!save.match) {
    return <Navigate to={SOLO_SETUP_PATH} replace />;
  }
  return (
    <div className="phone-frame">
      <LocalMatchProvider settings={save.settings} match={save.match}>
        <GameExtrasProvider value={SOLO_EXTRAS}>
          <RoomScreen />
        </GameExtrasProvider>
      </LocalMatchProvider>
    </div>
  );
};

// All solo routes, for the single-file build where the solo mode is the whole app.
export const SoloApp = () => (
  <Routes>
    <Route path={SOLO_SETUP_PATH} element={<SoloSetupRoute />} />
    <Route path={`${SOLO_PLAY_PATH}/*`} element={<SoloPlayRoute />} />
    <Route path="*" element={<Navigate to={SOLO_SETUP_PATH} replace />} />
  </Routes>
);
