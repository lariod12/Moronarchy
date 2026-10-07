import type { ReactNode } from "react";
import type { GameState, PlayerId } from "@moronarchy/core/engine";
import { toHudModel, toTopBarModel } from "../../game/hud-model";
import { getActivityText } from "../../game/log-format";
import { ActivityLine } from "../../shell/ActivityLine/ActivityLine";
import { BottomHud } from "../../shell/BottomHud/BottomHud";
import { GameShell } from "../../shell/GameShell/GameShell";
import { TopBar } from "../../shell/TopBar/TopBar";

export interface GameFrameProps {
  game: GameState;
  viewerId: PlayerId;
  roomCode: string;
  title: string;
  backDisabled?: boolean;
  onAvatarPress?: () => void;
  onBack?: () => void;
  onCrownPress?: () => void;
  onCrownLongPress?: () => void;
  // Notices under the activity line (connection and absent-player banners).
  banners?: ReactNode;
  overlay?: ReactNode;
  children: ReactNode;
}

// The in-game page chrome: TopBar, activity line, the page, the HUD and an overlay slot for modals.
export const GameFrame = ({
  game,
  viewerId,
  roomCode,
  title,
  backDisabled,
  onAvatarPress,
  onBack,
  onCrownPress,
  onCrownLongPress,
  banners,
  overlay,
  children
}: GameFrameProps) => (
  <GameShell
    top={
      <>
        <TopBar {...toTopBarModel(game, roomCode, title)} />
        <ActivityLine text={getActivityText(game, viewerId)} />
        {banners}
      </>
    }
    hud={
      <BottomHud
        {...toHudModel(game, viewerId)}
        backDisabled={backDisabled}
        onAvatarPress={onAvatarPress}
        onBack={onBack}
        onCrownPress={onCrownPress}
        onCrownLongPress={onCrownLongPress}
      />
    }
    overlay={overlay}
  >
    {children}
  </GameShell>
);
