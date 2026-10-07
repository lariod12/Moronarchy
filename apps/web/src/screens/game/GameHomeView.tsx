import type { GameState, PlayerId } from "@moronarchy/core/engine";
import { GameFrame } from "./GameFrame";
import { HomeHub } from "./HomeHub";
import type { HubPage } from "./HomeHub";

export interface GameHomeViewProps {
  game: GameState;
  viewerId: PlayerId;
  roomCode: string;
  onAvatarPress?: () => void;
  onBack?: () => void;
  onCrownPress?: () => void;
  onCrownLongPress?: () => void;
  onOpen?: (page: HubPage) => void;
}

export const GameHomeView = ({ game, viewerId, roomCode, onOpen, ...handlers }: GameHomeViewProps) => (
  <GameFrame game={game} viewerId={viewerId} roomCode={roomCode} title="Home" backDisabled {...handlers}>
    <HomeHub onOpen={onOpen} />
  </GameFrame>
);
