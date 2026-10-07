import { useEffect, useState } from "react";
import { getFightViewerRole } from "@moronarchy/core/engine";
import type { PlayerId, TileId } from "@moronarchy/core/engine";
import { useNavigate } from "react-router";
import { roomPath } from "../../game/labels";
import { useGameSession } from "../../game/GameSession";
import { useMovement } from "../../game/MovementContext";
import { MapPageView } from "./MapPageView";
import type { MapTab } from "./MapPageView";
import { MapView } from "./MapView";

const ROLL_FEEDBACK_MAX_MS = 3000;

export const MapScreen = () => {
  const { game, viewerId, roomCode, actions, canRun } = useGameSession();
  const navigate = useNavigate();
  const { animatedPosition, isAnimating } = useMovement();
  const [rolling, setRolling] = useState(false);
  const [tab, setTab] = useState<MapTab>("board");

  // The die shakes from the tap until the server answers with the roll (or a short while, if it never does).
  useEffect(() => {
    if (!rolling) {
      return;
    }
    const timer = setTimeout(() => setRolling(false), ROLL_FEEDBACK_MAX_MS);
    return () => clearTimeout(timer);
  }, [rolling]);

  useEffect(() => {
    if (game.turn.rolled) {
      setRolling(false);
    }
  }, [game.turn.rolled]);

  const positions: Record<PlayerId, TileId> = {};
  for (const playerId of game.turnOrder) {
    positions[playerId] = animatedPosition(playerId);
  }

  return (
    <MapPageView
      game={game}
      viewerId={viewerId}
      tab={tab}
      onTab={setTab}
      board={
        <MapView
          game={game}
          viewerId={viewerId}
          positions={positions}
          canRoll={canRun("rollDice")}
          canUseHorse={canRun("useItem", "horse")}
          rolling={rolling}
          animating={isAnimating}
          onRoll={() => {
            setRolling(true);
            actions.rollDice();
          }}
          onUseHorse={() => actions.useItem("horse")}
          onWatchFight={game.fight && getFightViewerRole(game, viewerId) === "spectator" ? () => navigate(roomPath(roomCode, "fight")) : undefined}
        />
      }
    />
  );
};
