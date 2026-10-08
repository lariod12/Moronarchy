import { useEffect, useRef, useState } from "react";
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
  idle: "Crown: tap to watch the Map or go Home",
  shaking: "Crown: hold to take your turn",
  active: "Crown: tap to watch the Map or go Home",
  canEndTurn: "Crown: hold to end your turn"
};

const BUBBLES: Partial<Record<CrownButtonState, string>> = {
  shaking: "hold me!",
  active: "your turn!",
  canEndTurn: "end turn!"
};

// A plain tap is the natural first try, so in the two states where the crown is waiting for a hold, a tap explains
// the gesture instead of navigating away from the page the player is looking at.
const TAP_HINTS: Partial<Record<CrownButtonState, string>> = {
  shaking: "hold to start your turn",
  canEndTurn: "hold to end your turn"
};

export const CROWN_TAP_HINT_MS = 2500;

export const CrownButton = ({ state, onPress, onLongPress, className }: CrownButtonProps) => {
  const [hint, setHint] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setHint(null);
  }, [state]);

  useEffect(
    () => () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    },
    []
  );

  if (state === "eliminated" || state === "finished") {
    return null;
  }

  const handlePress = () => {
    const tapHint = TAP_HINTS[state];
    if (!tapHint) {
      onPress?.();
      return;
    }
    setHint(tapHint);
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => setHint(null), CROWN_TAP_HINT_MS);
  };

  const bubble = hint ?? BUBBLES[state];
  const inverted = state === "active" || state === "canEndTurn";

  return (
    <div className={cx("shell-crown", className)}>
      {bubble ? (
        <SpeechBubble tail="bottom-right" className="shell-crown__bubble" role={hint ? "status" : undefined}>
          {bubble}
        </SpeechBubble>
      ) : null}
      <LongPressButton
        aria-label={LABELS[state]}
        onPress={handlePress}
        onLongPress={onLongPress}
        className={cx("shell-crown__button", inverted && "shell-crown__button--inverted", state === "shaking" && "shell-crown__button--shaking")}
      >
        <CrownIcon className="shell-crown__icon" />
      </LongPressButton>
    </div>
  );
};
