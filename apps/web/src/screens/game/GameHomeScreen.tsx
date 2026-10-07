import { useMatch } from "../../match/MatchProvider";
import { SketchBox } from "../../ui/SketchBox/SketchBox";
import { GameHomeView } from "./GameHomeView";

// Crown, Back and the hub tiles are wired in the next steps; this screen only renders the live state.
export const GameHomeScreen = () => {
  const { state, playerID, roomCode } = useMatch();
  const game = state?.game;

  if (!game || !game.kings[playerID]) {
    return (
      <div className="screen">
        <SketchBox title="You are not in this game" className="screen__message">
          Ask the host to start a new room.
        </SketchBox>
      </div>
    );
  }

  return <GameHomeView game={game} viewerId={playerID} roomCode={roomCode} />;
};
