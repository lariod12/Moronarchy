import { Avatar } from "../../ui/Avatar/Avatar";
import { cx } from "../../ui/cx";
import { IconButton } from "../../ui/IconButton/IconButton";
import { BackIcon } from "../../ui/icons";
import { StatList } from "../../ui/StatTag/StatTag";
import { CrownButton } from "../CrownButton/CrownButton";
import type { CrownButtonState } from "../CrownButton/CrownButton";
import "./BottomHud.css";

export interface BottomHudProps {
  name: string;
  health: number;
  maxHealth: number;
  coin: number;
  level: number;
  eliminated: boolean;
  crownState: CrownButtonState;
  onAvatarPress?: () => void;
  onBack?: () => void;
  onCrownPress?: () => void;
  onCrownLongPress?: () => void;
  backDisabled?: boolean;
  className?: string;
}

export const BottomHud = ({
  name,
  health,
  maxHealth,
  coin,
  level,
  eliminated,
  crownState,
  onAvatarPress,
  onBack,
  onCrownPress,
  onCrownLongPress,
  backDisabled = false,
  className
}: BottomHudProps) => (
  <footer className={cx("shell-hud", className)}>
    <button type="button" className="shell-hud__avatar" aria-label={`${name}: profile`} onClick={onAvatarPress}>
      <Avatar name={name} crossed={eliminated} size="fill" />
    </button>
    <StatList
      muted={eliminated}
      stats={[
        { label: "health", value: health },
        { label: "coin", value: coin },
        { label: "level", value: level }
      ]}
    />
    {eliminated ? (
      <button type="button" className="shell-hud__game-over" aria-label="Game Over, go Home" onClick={onCrownPress}>
        Game Over
      </button>
    ) : (
      <>
        <IconButton aria-label="Back" className="shell-hud__back" onClick={onBack} disabled={backDisabled}>
          <BackIcon />
        </IconButton>
        <CrownButton state={crownState} onPress={onCrownPress} onLongPress={onCrownLongPress} />
      </>
    )}
    <span className="sr-only">
      Health {health} of {maxHealth}
    </span>
  </footer>
);
