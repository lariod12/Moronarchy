import type { CSSProperties } from "react";
import { cx } from "../../ui/cx";
import "./MapView.css";

export interface KingTokenProps {
  playerId: string;
  name: string;
  isViewer?: boolean;
  // Position among the kings sharing a tile, so they do not hide each other.
  slot?: number;
  // The server reports this king as disconnected: drawn dimmed with a dashed ring.
  offline?: boolean;
}

export const KingToken = ({ playerId, name, isViewer = false, slot = 0, offline = false }: KingTokenProps) => (
  <span
    className={cx("king-token", isViewer && "king-token--me", offline && "king-token--offline")}
    data-testid="king-token"
    data-player={playerId}
    data-offline={offline ? "true" : undefined}
    title={offline ? `${name} (offline)` : name}
    aria-label={`${name}${isViewer ? " (you)" : ""}${offline ? " (offline)" : ""}`}
    style={{ "--slot": slot } as CSSProperties}
  >
    {name.trim().charAt(0).toUpperCase() || "?"}
  </span>
);
