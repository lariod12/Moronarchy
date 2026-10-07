import { Button } from "../../ui/Button/Button";
import { SadFaceIcon } from "../../ui/icons";
import "./ResultFace.css";

export interface LoseViewProps {
  // The round the king went out in.
  round: number | null;
  // Bankrupt (the default) or removed after staying disconnected too long.
  reason?: "bankrupt" | "left" | null;
  // "Keep watching" while the game goes on, "See ranking" once it is over.
  continueLabel: "Keep watching" | "See ranking";
  onContinue: () => void;
  onLeave?: () => void;
}

const getSubtitle = (round: number | null, reason: LoseViewProps["reason"]): string => {
  if (reason === "left") {
    return "Disconnected for too long";
  }
  return round === null ? "Bankrupt" : `Bankrupt in round ${round}`;
};

export const LoseView = ({ round, reason = "bankrupt", continueLabel, onContinue, onLeave }: LoseViewProps) => (
  <div className="screen screen--centered result-face" data-testid="lose-face">
    <SadFaceIcon className="result-face__icon" />
    <h1 className="result-face__title">{reason === "left" ? "You were removed" : "You are out!"}</h1>
    <p className="result-face__sub">{getSubtitle(round, reason)}</p>
    <div className="result-face__actions">
      <Button tone="strong" onClick={onContinue}>
        {continueLabel}
      </Button>
      {onLeave ? (
        <button type="button" className="result-face__leave" onClick={onLeave}>
          Leave room
        </button>
      ) : null}
    </div>
  </div>
);
