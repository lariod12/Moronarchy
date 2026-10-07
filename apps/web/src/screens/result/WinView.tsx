import { Button } from "../../ui/Button/Button";
import { HappyFaceIcon } from "../../ui/icons";
import "./ResultFace.css";

export interface WinViewProps {
  onContinue: () => void;
}

export const WinView = ({ onContinue }: WinViewProps) => (
  <div className="screen screen--centered result-face" data-testid="win-face">
    <HappyFaceIcon className="result-face__icon" />
    <h1 className="result-face__title">You win!</h1>
    <p className="result-face__sub">Last king standing</p>
    <div className="result-face__actions">
      <Button tone="strong" onClick={onContinue}>
        See ranking
      </Button>
    </div>
  </div>
);
