import type { ReactNode } from "react";
import { cx } from "../cx";
import "./SpeechBubble.css";

export interface SpeechBubbleProps {
  children: ReactNode;
  tail: "bottom-left" | "bottom-right" | "top-left" | "left";
  className?: string;
}

export const SpeechBubble = ({ children, tail, className }: SpeechBubbleProps) => (
  <div className={cx("ui-bubble", `ui-bubble--${tail}`, className)}>{children}</div>
);
