import { ArrowLeft, Crown } from "lucide-react";
import { useNavigate, useParams } from "react-router";

export const ResultPage = () => {
  const { matchId } = useParams();
  const navigate = useNavigate();

  return (
    <main className="phone-frame result-screen">
      <button className="icon-button" onClick={() => navigate(`/room/${matchId}`)} aria-label="Back to room">
        <ArrowLeft size={20} />
      </button>
      <div className="result-badge">
        <Crown size={54} />
      </div>
      <span>Match complete</span>
      <h1>The crown has chosen a ruler.</h1>
      <p>Detailed match history and rematch flow are planned for the next version.</p>
      <button className="primary-action wide-action" onClick={() => navigate("/")}>
        Home
      </button>
    </main>
  );
};
