import { getResidentsByKind } from "@moronarchy/core/engine";
import type { GameState, PlayerId, ResidentKind } from "@moronarchy/core/engine";
import { residentIcon } from "../../game/game-icons";
import { RESIDENT_LABELS } from "../../game/labels";
import { Tile } from "../../ui/Tile/Tile";
import "../info/info-page.css";
import "./ResidentsView.css";

export interface ResidentsViewProps {
  game: GameState;
  viewerId: PlayerId;
  onOpenKind: (kind: ResidentKind) => void;
}

const KINDS: ResidentKind[] = ["warrior", "farmer"];

// Residents overview: one big card per kind with how many the viewer has ("x20").
export const ResidentsView = ({ game, viewerId, onOpenKind }: ResidentsViewProps) => {
  const counts = getResidentsByKind(game, viewerId);
  return (
    <div className="info-page residents-overview" data-testid="residents-overview">
      {KINDS.map((kind) => (
        <Tile
          key={kind}
          className="residents-overview__card"
          title={RESIDENT_LABELS[kind]}
          icon={residentIcon(kind, 120)}
          badge={`x${counts[kind].length}`}
          onClick={() => onOpenKind(kind)}
        />
      ))}
    </div>
  );
};
