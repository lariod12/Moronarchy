import type { GameState, PlayerId } from "@moronarchy/core/engine";
import { toHudModel, toTopBarModel } from "../../game/hud-model";
import { BottomHud } from "../../shell/BottomHud/BottomHud";
import { GameShell } from "../../shell/GameShell/GameShell";
import { TopBar } from "../../shell/TopBar/TopBar";
import { HomeHub } from "./HomeHub";

export interface GameHomeViewProps {
  game: GameState;
  viewerId: PlayerId;
  roomCode: string;
  onAvatarPress?: () => void;
  onBack?: () => void;
  onCrownPress?: () => void;
  onCrownLongPress?: () => void;
}

export const GameHomeView = ({ game, viewerId, roomCode, onAvatarPress, onBack, onCrownPress, onCrownLongPress }: GameHomeViewProps) => (
  <GameShell
    top={<TopBar {...toTopBarModel(game, roomCode, "Home")} />}
    hud={
      <BottomHud
        {...toHudModel(game, viewerId)}
        onAvatarPress={onAvatarPress}
        onBack={onBack}
        onCrownPress={onCrownPress}
        onCrownLongPress={onCrownLongPress}
      />
    }
  >
    <HomeHub disabled />
  </GameShell>
);
