import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, KeyboardEvent, MouseEvent, PointerEvent, ReactNode } from "react";
import { cx } from "../cx";
import "./LongPressButton.css";

export interface LongPressButtonProps {
  "aria-label": string;
  children: ReactNode;
  onPress?: () => void;
  onLongPress?: () => void;
  holdMs?: number;
  disabled?: boolean;
  className?: string;
}

export const LongPressButton = ({
  children,
  onPress,
  onLongPress,
  holdMs = 600,
  disabled = false,
  className,
  "aria-label": ariaLabel
}: LongPressButtonProps) => {
  const [holding, setHolding] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const holdingRef = useRef(false);
  const firedRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => clearTimer, [clearTimer]);

  const start = () => {
    if (disabled || holdingRef.current) {
      return;
    }
    holdingRef.current = true;
    firedRef.current = false;
    setHolding(true);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      firedRef.current = true;
      onLongPress?.();
    }, holdMs);
  };

  const release = () => {
    if (!holdingRef.current) {
      return;
    }
    clearTimer();
    holdingRef.current = false;
    setHolding(false);
    if (!firedRef.current) {
      onPress?.();
    }
  };

  const cancel = () => {
    if (!holdingRef.current) {
      return;
    }
    clearTimer();
    holdingRef.current = false;
    firedRef.current = false;
    setHolding(false);
  };

  const handlePointerDown = (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button > 0) {
      return;
    }
    start();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    if (!event.repeat) {
      start();
    }
  };

  const handleKeyUp = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }
    event.preventDefault();
    release();
  };

  // Assistive technology activates with a click that has no pointer or key events before it.
  const handleClick = (event: MouseEvent<HTMLButtonElement>) => {
    if (event.detail === 0 && !disabled && !holdingRef.current) {
      onPress?.();
    }
  };

  return (
    <button
      type="button"
      className={cx("ui-long-press", className)}
      style={{ "--hold-ms": `${holdMs}ms` } as CSSProperties}
      aria-label={ariaLabel}
      disabled={disabled}
      data-holding={holding ? "true" : undefined}
      onPointerDown={handlePointerDown}
      onPointerUp={release}
      onPointerLeave={cancel}
      onPointerCancel={cancel}
      onKeyDown={handleKeyDown}
      onKeyUp={handleKeyUp}
      onBlur={cancel}
      onClick={handleClick}
      onContextMenu={(event) => event.preventDefault()}
    >
      <span className="ui-long-press__fill" aria-hidden="true" />
      <span className="ui-long-press__content">{children}</span>
    </button>
  );
};
