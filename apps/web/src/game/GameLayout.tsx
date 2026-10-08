import { useEffect } from "react";
import { Outlet, useLocation, useNavigate } from "react-router";
import { getCrownState } from "@moronarchy/core/engine";
import { GameFrame } from "../screens/game/GameFrame";
import { AbsentBanner, ConnectionBanner } from "../shell/ConnectionBanners/ConnectionBanners";
import { FightRevealProvider } from "./FightRevealContext";
import { getForcedPage, getPageName } from "./forced-route";
import { useGameExtras } from "./GameExtras";
import { useGameSession } from "./GameSession";
import { roomPath } from "./labels";
import { getPageTitle } from "./page-title";
import { ModalHost } from "./ModalHost";
import { useMovement } from "./MovementContext";
import { useAbsentCountdown } from "./useAbsentCountdown";

// Chrome for every in-game page: TopBar, activity line, HUD with the Crown, and the modal host.
export const GameLayout = () => {
  const { game, viewerId, roomCode, actions, selfConnected, offlineIds } = useGameSession();
  const { isAnimating } = useMovement();
  const navigate = useNavigate();
  const location = useLocation();
  const absent = useAbsentCountdown(game, offlineIds);
  const extras = useGameExtras();

  const pageName = getPageName(location.pathname);
  const crownState = getCrownState(game, viewerId);
  const forced = getForcedPage(game, viewerId, isAnimating);

  // The card pick and the Start Station are not optional: pull the player there.
  useEffect(() => {
    const onForcedPage = pageName === forced || (forced === "station" && pageName === "cards");
    if (forced && !onForcedPage) {
      navigate(roomPath(roomCode, forced), { replace: true });
    }
  }, [forced, pageName, navigate, roomCode]);

  const goHome = () => navigate(roomPath(roomCode, "home"));
  // A crown tap does not navigate (the Back arrow next to it does that); only a spectator's "Game Over" goes Home,
  // because an eliminated king has no Back button.
  const handleCrownPress = crownState === "eliminated" ? goHome : undefined;
  // The avatar in the HUD opens my own Players Info (replacing the entry when already looking at one).
  const openMyStats = () => navigate(roomPath(roomCode, `stats/${viewerId}`), { replace: pageName === "stats" });

  const handleCrownLongPress = () => {
    if (crownState === "shaking") {
      actions.claimTurn();
      navigate(roomPath(roomCode, "map"));
    } else if (crownState === "canEndTurn") {
      // Holding the crown is the confirmation: the turn ends right away (a plain tap only shows a hint).
      actions.endTurn();
    }
  };

  // React Router marks the first entry of the app with the key "default": nothing to go back to there.
  const handleBack = () => (location.key === "default" ? goHome() : navigate(-1));

  return (
    <FightRevealProvider>
      <GameFrame
        game={game}
        viewerId={viewerId}
        roomCode={roomCode}
        title={getPageTitle(location.pathname)}
        backDisabled={pageName === "home" || forced !== null}
        onAvatarPress={openMyStats}
        onBack={handleBack}
        onCrownPress={handleCrownPress}
        onCrownLongPress={handleCrownLongPress}
        banners={
          <>
            <ConnectionBanner connected={selfConnected} />
            <AbsentBanner status={absent} name={absent ? (game.kings[absent.playerId]?.name ?? "Someone") : ""} />
            {/* Host extras (solo bot driver + Bots control) sit in the banner row so they never cover the board. */}
            {extras}
          </>
        }
        overlay={
          <>
            <ModalHost />
          </>
        }
      >
        <Outlet />
      </GameFrame>
    </FightRevealProvider>
  );
};
