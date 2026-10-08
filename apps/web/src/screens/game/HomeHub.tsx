import { Atom, Boxes, Castle, Grid3x3, SlidersHorizontal, UserRound } from "lucide-react";
import { Tile } from "../../ui/Tile/Tile";
import { TileGrid } from "../../ui/TileGrid/TileGrid";

export type HubPage = "stats" | "plots" | "map" | "residents" | "items" | "events";

export interface HomeHubProps {
  // Opens the page behind a tile. Without it the tiles are inert (gallery frames without a router).
  onOpen?: (page: HubPage) => void;
}

export const HomeHub = ({ onOpen }: HomeHubProps) => {
  const open = (page: HubPage) => (onOpen ? () => onOpen(page) : undefined);
  const disabled = onOpen === undefined;
  return (
    <TileGrid>
      <Tile title="Map" icon={<Grid3x3 size={56} />} onClick={open("map")} disabled={disabled} />
      <Tile title="Stats" icon={<SlidersHorizontal size={56} />} onClick={open("stats")} disabled={disabled} />
      <Tile title="Plots" icon={<Castle size={56} />} onClick={open("plots")} disabled={disabled} />
      <Tile title="Residents" icon={<UserRound size={56} />} onClick={open("residents")} disabled={disabled} />
      <Tile title="Items" icon={<Boxes size={56} />} onClick={open("items")} disabled={disabled} />
      <Tile title="Events" icon={<Atom size={56} />} onClick={open("events")} disabled={disabled} />
    </TileGrid>
  );
};
