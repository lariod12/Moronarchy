import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router";
import { clearPlayerSession } from "../../api/lobby";
import { useMatch } from "../../match/MatchProvider";
import { BlockingOverlay } from "../../ui/BlockingOverlay/BlockingOverlay";
import { Button } from "../../ui/Button/Button";
import { SketchBox } from "../../ui/SketchBox/SketchBox";
import { GameRoutes } from "../game/GameRoutes";
import { LobbyScreen } from "../lobby/LobbyScreen";
import { ResultScreen } from "../result/ResultScreen";
import { useStartCountdown } from "./useStartCountdown";

const CONNECT_TIMEOUT_MS = 8000;

const ConnectingScreen = ({ matchID }: { matchID: string }) => {
  const navigate = useNavigate();
  const [timedOut, setTimedOut] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setTimedOut(true), CONNECT_TIMEOUT_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!timedOut) {
    return <BlockingOverlay title="Connecting…" />;
  }

  return (
    <div className="screen screen--centered">
      <SketchBox title="Cannot reach the room" shadow>
        <p>The room may have closed or the server is down.</p>
        <Button
          onClick={() => {
            clearPlayerSession(matchID);
            navigate("/", { replace: true });
          }}
        >
          Leave room
        </Button>
      </SketchBox>
    </div>
  );
};

// Chooses what the room shows from the match stage: lobby, the start countdown, or the game itself.
export const RoomScreen = () => {
  const { state, matchID, kicked } = useMatch();
  const countdown = useStartCountdown(state?.stage ?? null);

  useEffect(() => {
    if (kicked) {
      clearPlayerSession(matchID);
    }
  }, [kicked, matchID]);

  if (kicked) {
    return <Navigate to="/" replace />;
  }
  if (!state) {
    return <ConnectingScreen matchID={matchID} />;
  }
  if (countdown !== null) {
    return <LobbyScreen overlay={<BlockingOverlay title="Game Starting" subtitle={String(countdown)} />} />;
  }
  if (state.stage === "lobby") {
    return <LobbyScreen />;
  }
  if (state.stage === "finished") {
    return <ResultScreen />;
  }
  return <GameRoutes />;
};
