import { cx } from "../../ui/cx";
import { CrownIcon } from "../../ui/icons";
import { LongPressButton } from "../../ui/LongPressButton/LongPressButton";
import { SpeechBubble } from "../../ui/SpeechBubble/SpeechBubble";
import "./CrownButton.css";

export type CrownButtonState = "idle" | "shaking" | "active" | "canEndTurn" | "eliminated" | "finished";

export interface CrownButtonProps {
  state: CrownButtonState;
  onPress?: () => void;
  onLongPress?: () => void;
  className?: string;
}

const LABELS: Record<"idle" | "shaking" | "active" | "canEndTurn", string> = {
  idle: "Crown: tap to go home, hold to refresh",
  shaking: "Crown: hold to take your turn",
  active: "Crown: tap to go home, hold to refresh your turn",
  canEndTurn: "Crown: hold to end your turn"
};

const BUBBLES: Partial<Record<CrownButtonState, string>> = {
  active: "your turn!",
  canEndTurn: "end turn!"
};

export const CrownButton = ({ state, onPress, onLongPress, className }: CrownButtonProps) => {
  if (state === "eliminated" || state === "finished") {
    return null;
  }

  const bubble = BUBBLES[state];
  const inverted = state === "active" || state === "canEndTurn";

  return (
    <div className={cx("shell-crown", className)}>
      {bubble ? (
        <SpeechBubble tail="bottom-right" className="shell-crown__bubble">
          {bubble}
        </SpeechBubble>
      ) : null}
      <LongPressButton
        aria-label={LABELS[state]}
        onPress={onPress}
        onLongPress={onLongPress}
        className={cx("shell-crown__button", inverted && "shell-crown__button--inverted", state === "shaking" && "shell-crown__button--shaking")}
      >
        <CrownIcon className="shell-crown__icon" />
      </LongPressButton>
    </div>
  );
};
