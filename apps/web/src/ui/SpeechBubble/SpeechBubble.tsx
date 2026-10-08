import type { CSSProperties, ReactNode } from "react";
import { cx } from "../cx";
import "./SpeechBubble.css";

// Which edge the tail sticks out of, and where along that edge.
export type SpeechBubbleTail =
  | "bottom-left"
  | "bottom-center"
  | "bottom-right"
  | "top-left"
  | "top-right"
  | "left"
  | "right";

export interface SpeechBubbleProps {
  children: ReactNode;
  tail: SpeechBubbleTail;
  // Distance in px from the corner the tail is named after (ignored for "bottom-center"). Default 16.
  tailInset?: number;
  className?: string;
  // e.g. "status" so screen readers announce a transient hint.
  role?: string;
}

// The one standard speech bubble of the wireframe: rounded box with a chevron tail that shares the bubble's border.
// Place the bubble with CSS in the caller (position: absolute next to the speaker) and pick the tail edge that faces
// the speaker; never restyle the tail itself.
export const SpeechBubble = ({ children, tail, tailInset, className, role }: SpeechBubbleProps) => (
  <div
    className={cx("ui-bubble", `ui-bubble--${tail}`, className)}
    role={role}
    style={tailInset === undefined ? undefined : ({ "--ui-bubble-tail-inset": `${tailInset}px` } as CSSProperties)}
  >
    {children}
  </div>
);
