import { cx } from "../../ui/cx";
import "./ActivityLine.css";

export interface ActivityLineProps {
  text: string | null;
  className?: string;
}

// One line under the TopBar with the newest thing that happened in the game.
export const ActivityLine = ({ text, className }: ActivityLineProps) => (
  <p role="status" data-testid="activity-line" className={cx("shell-activity", className)}>
    {text ?? " "}
  </p>
);
