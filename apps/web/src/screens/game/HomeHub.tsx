import { Atom, Boxes, Castle, Dices, SlidersHorizontal, UserRound } from "lucide-react";
import { Tile } from "../../ui/Tile/Tile";
import { TileGrid } from "../../ui/TileGrid/TileGrid";

export interface HomeHubProps {
  // Dice Status opens the Map. The other tiles stay inert until their screens exist (step 6).
  onOpenMap?: () => void;
}

export const HomeHub = ({ onOpenMap }: HomeHubProps) => (
  <TileGrid>
    <Tile title="Stats" icon={<SlidersHorizontal size={56} />} disabled />
    <Tile title="Plots" icon={<Castle size={56} />} disabled />
    <Tile title="Dice Status" icon={<Dices size={56} />} onClick={onOpenMap} disabled={onOpenMap === undefined} />
    <Tile title="Residents" icon={<UserRound size={56} />} disabled />
    <Tile title="Items" icon={<Boxes size={56} />} disabled />
    <Tile title="Events" icon={<Atom size={56} />} disabled />
  </TileGrid>
);
