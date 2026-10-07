import { Button } from "../../ui/Button/Button";
import { SketchBox } from "../../ui/SketchBox/SketchBox";
import "./ResultPlaceholderView.css";

export interface ResultRank {
  playerId: string;
  name: string;
}

export interface ResultPlaceholderViewProps {
  winnerName: string | null;
  // Best first: the winner, then the kings in reverse order of elimination.
  ranking: ResultRank[];
  isHost: boolean;
  onBackToLobby?: () => void;
  onQuit: () => void;
}

// Plain stand-in until the real Win / Lose / Ranking screens (step 7).
export const ResultPlaceholderView = ({ winnerName, ranking, isHost, onBackToLobby, onQuit }: ResultPlaceholderViewProps) => (
  <div className="screen screen--centered result">
    <SketchBox title="Game over" shadow className="result__box">
      <p className="result__winner">{winnerName ? `Winner: ${winnerName}` : "Nobody won"}</p>
      <ol className="result__ranking" aria-label="Ranking">
        {ranking.map((rank, index) => (
          <li key={rank.playerId} className="result__rank">
            {`${index + 1}. ${rank.name}`}
          </li>
        ))}
      </ol>
      <div className="result__actions">
        {isHost ? (
          <Button tone="strong" onClick={onBackToLobby}>
            Back to lobby
          </Button>
        ) : (
          <p className="result__wait">Waiting for the host to go back to the lobby</p>
        )}
        <Button onClick={onQuit}>Quit</Button>
      </div>
    </SketchBox>
  </div>
);
