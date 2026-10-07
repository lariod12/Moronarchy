import type { GameState, PlayerId } from "@moronarchy/core/engine";
import { GameFrame } from "./GameFrame";
import { HomeHub } from "./HomeHub";

export interface GameHomeViewProps {
  game: GameState;
  viewerId: PlayerId;
  roomCode: string;
  onAvatarPress?: () => void;
  onBack?: () => void;
  onCrownPress?: () => void;
  onCrownLongPress?: () => void;
  onOpenMap?: () => void;
}

export const GameHomeView = ({ game, viewerId, roomCode, onOpenMap, ...handlers }: GameHomeViewProps) => (
  <GameFrame game={game} viewerId={viewerId} roomCode={roomCode} title="Home" backDisabled {...handlers}>
    <HomeHub onOpenMap={onOpenMap} />
  </GameFrame>
);
