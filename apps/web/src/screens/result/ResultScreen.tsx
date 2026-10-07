import { useNavigate } from "react-router";
import { getFinalRanking } from "@moronarchy/core/engine";
import { getLobbyView } from "@moronarchy/core/match";
import { clearPlayerSession } from "../../api/lobby";
import { createGameActions } from "../../game/game-actions";
import { useMatch } from "../../match/MatchProvider";
import { ResultPlaceholderView } from "./ResultPlaceholderView";

// Shown to everyone when the match is finished. The host can reopen the lobby; anyone can quit.
export const ResultScreen = () => {
  const { state, playerID, matchID, send } = useMatch();
  const navigate = useNavigate();
  const game = state?.game;
  if (!state || !game) {
    return null;
  }

  const nameOf = (playerId: string): string => game.kings[playerId]?.name ?? "Someone";
  const winnerName = game.winnerId ? nameOf(game.winnerId) : null;
  const ranking = getFinalRanking(game).map((playerId) => ({ playerId, name: nameOf(playerId) }));

  return (
    <ResultPlaceholderView
      winnerName={winnerName}
      ranking={ranking}
      isHost={getLobbyView(state, playerID).isHost}
      onBackToLobby={createGameActions(send).returnToLobby}
      onQuit={() => {
        clearPlayerSession(matchID);
        navigate("/", { replace: true });
      }}
    />
  );
};
