import type { RankingRow } from "../../game/end-model";
import { Button } from "../../ui/Button/Button";
import { AvatarSilhouette } from "../../ui/icons";
import "./RankingView.css";

export interface RankingViewProps {
  rows: RankingRow[];
  isHost: boolean;
  onPlayAgain: () => void;
  onQuit: () => void;
}

export const RankingView = ({ rows, isHost, onPlayAgain, onQuit }: RankingViewProps) => (
  <div className="screen result-ranking" data-testid="ranking">
    <h1 className="sr-only">Ranking</h1>
    <ol className="result-ranking__list" aria-label="Ranking">
      {rows.map((row) => (
        <li key={row.playerId} className={row.outRound === null ? "result-ranking__row result-ranking__row--winner" : "result-ranking__row"} data-testid="ranking-row">
          <span className="result-ranking__rank">{row.rank}</span>
          <AvatarSilhouette className="result-ranking__icon" />
          <span className="result-ranking__who">
            <span className="result-ranking__name">{row.isSelf ? `${row.name} (you)` : row.name}</span>
            <span className="result-ranking__status">{row.outRound === null ? "Winner" : `${row.outReason === "left" ? "Left" : "Out"} in round ${row.outRound}`}</span>
          </span>
        </li>
      ))}
    </ol>
    <div className="result-ranking__footer">
      <div className="result-ranking__actions">
        <Button tone="strong" disabled={!isHost} onClick={onPlayAgain}>
          Play Again
        </Button>
        <Button onClick={onQuit}>Quit</Button>
      </div>
      {isHost ? null : <p className="result-ranking__hint">Waiting for the host to start again</p>}
    </div>
  </div>
);
