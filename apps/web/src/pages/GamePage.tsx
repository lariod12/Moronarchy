import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router";
import { getPlayerSession } from "@/api/lobby";
import { GameClient } from "@/game/GameClient";

export const GamePage = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const session = matchId ? getPlayerSession(matchId) : null;

  if (!matchId || !session) {
    return (
      <main className="phone-frame empty-screen">
        <button className="icon-button" onClick={() => navigate("/")}>
          <ArrowLeft size={20} />
        </button>
        <h1>Missing player session</h1>
        <p>Join or create the room from this browser before entering the match.</p>
      </main>
    );
  }

  return <GameClient matchID={matchId} playerID={session.playerID} credentials={session.credentials} />;
};
