import { X } from "lucide-react";
import type { FightRoundResult } from "@moronarchy/core/engine";
import { CrownIcon } from "../../ui/icons";
import "./FightView.css";

export interface RoundMarkersProps {
  results: FightRoundResult[];
}

// Crown = round won, cross = round lost (screen 92). Ties leave no mark.
export const RoundMarkers = ({ results }: RoundMarkersProps) => (
  <div className="round-markers" data-testid="round-markers">
    {results.map((result, index) => (
      <span
        key={index}
        className={`round-marker round-marker--${result}`}
        data-testid="round-marker"
        data-result={result}
        role="img"
        aria-label={result === "won" ? "Round won" : "Round lost"}
      >
        {result === "won" ? <CrownIcon className="round-marker__icon" /> : <X className="round-marker__icon" strokeWidth={4} aria-hidden="true" />}
      </span>
    ))}
  </div>
);
