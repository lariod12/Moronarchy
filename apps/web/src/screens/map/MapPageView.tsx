import type { ReactNode } from "react";
import type { GameState, PlayerId } from "@moronarchy/core/engine";
import { Tabs } from "../../ui/Tabs/Tabs";
import { PositionsView } from "./PositionsView";
import "./MapView.css";

export type MapTab = "board" | "positions";

export interface MapPageViewProps {
  game: GameState;
  viewerId: PlayerId;
  tab: MapTab;
  onTab: (tab: MapTab) => void;
  // The Board tab (the MapView with its roll controls).
  board: ReactNode;
}

const TABS = [
  { key: "board", label: "Board" },
  { key: "positions", label: "Positions" }
] as const;

// The Map page: the board, or the table of where every king stands.
export const MapPageView = ({ game, viewerId, tab, onTab, board }: MapPageViewProps) => (
  <div className="map-page">
    <Tabs tabs={[...TABS]} active={tab} onChange={onTab} label="Map" />
    <div className="map-page__content" role="tabpanel">
      {tab === "board" ? board : <PositionsView game={game} viewerId={viewerId} />}
    </div>
  </div>
);
