import { getLobbyView } from "@moronarchy/core/match";
import type { GameState } from "@moronarchy/core/engine";
import { getEndFace, toRankingRows } from "../../game/end-model";
import { createGameActions } from "../../game/game-actions";
import { toGameId } from "../../game/seen-store";
import { useSeenState } from "../../game/useSeenState";
import { useMatch } from "../../match/MatchProvider";
import { useLeaveRoom } from "../../match/useLeaveRoom";
import { LoseView } from "./LoseView";
import { RankingView } from "./RankingView";
import { WinView } from "./WinView";

interface EndSequenceProps {
  game: GameState;
  viewerId: string;
  gameId: string;
  isHost: boolean;
  onPlayAgain: () => void;
  onQuit: () => void;
}

// The end of a finished match for one viewer: the winner sees the Win face, a king knocked out by the finishing move
// the Lose face, then everyone gets the Ranking. A face is shown until its button is pressed, and never again.
const EndSequence = ({ game, viewerId, gameId, isHost, onPlayAgain, onQuit }: EndSequenceProps) => {
  const seen = useSeenState(gameId, viewerId, game);
  const face = getEndFace(game, viewerId, seen.seq, seen.dismissed);

  if (face?.kind === "win") {
    return <WinView onContinue={() => seen.dismiss(face.key)} />;
  }
  if (face?.kind === "lose") {
    return <LoseView round={face.round} reason={face.reason} continueLabel="See ranking" onContinue={() => seen.dismiss(face.key)} onLeave={onQuit} />;
  }
  return <RankingView rows={toRankingRows(game, viewerId)} isHost={isHost} onPlayAgain={onPlayAgain} onQuit={onQuit} />;
};

// Shown to everyone when the match is finished. Only the host can reopen the lobby (Play Again); anyone can Quit.
export const ResultScreen = () => {
  const { state, playerID, roomCode, send } = useMatch();
  const leaveRoom = useLeaveRoom();
  const game = state?.game;
  if (!state || !game) {
    return null;
  }

  return (
    <EndSequence
      game={game}
      viewerId={playerID}
      gameId={toGameId(roomCode, state.gamesPlayed)}
      isHost={getLobbyView(state, playerID).isHost}
      onPlayAgain={createGameActions(send).returnToLobby}
      onQuit={leaveRoom}
    />
  );
};
