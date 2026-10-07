import type { CSSProperties } from "react";
import { cx } from "../../ui/cx";
import "./MapView.css";

export interface KingTokenProps {
  playerId: string;
  name: string;
  isViewer?: boolean;
  // Position among the kings sharing a tile, so they do not hide each other.
  slot?: number;
}

export const KingToken = ({ playerId, name, isViewer = false, slot = 0 }: KingTokenProps) => (
  <span
    className={cx("king-token", isViewer && "king-token--me")}
    data-testid="king-token"
    data-player={playerId}
    title={name}
    aria-label={`${name}${isViewer ? " (you)" : ""}`}
    style={{ "--slot": slot } as CSSProperties}
  >
    {name.trim().charAt(0).toUpperCase() || "?"}
  </span>
);
