import { Atom, Boxes, Castle, Dices, SlidersHorizontal, UserRound } from "lucide-react";
import { Tile } from "../../ui/Tile/Tile";
import { TileGrid } from "../../ui/TileGrid/TileGrid";

export interface HomeHubProps {
  // Tiles are inert placeholders until their screens exist (steps 5-6).
  disabled?: boolean;
}

export const HomeHub = ({ disabled = false }: HomeHubProps) => (
  <TileGrid>
    <Tile title="Stats" icon={<SlidersHorizontal size={56} />} disabled={disabled} />
    <Tile title="Plots" icon={<Castle size={56} />} disabled={disabled} />
    <Tile title="Dice Status" icon={<Dices size={56} />} disabled={disabled} />
    <Tile title="Residents" icon={<UserRound size={56} />} disabled={disabled} />
    <Tile title="Items" icon={<Boxes size={56} />} disabled={disabled} />
    <Tile title="Events" icon={<Atom size={56} />} disabled={disabled} />
  </TileGrid>
);
