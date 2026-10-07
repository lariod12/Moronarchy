import { cx } from "../cx";
import "./HealthBar.css";

export interface HealthBarProps {
  current: number;
  max: number;
  className?: string;
}

export const HealthBar = ({ current, max, className }: HealthBarProps) => {
  const ratio = max > 0 ? Math.min(1, Math.max(0, current / max)) : 0;
  return (
    <div
      role="meter"
      aria-label="Health"
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={current}
      className={cx("ui-health-bar", className)}
    >
      <span className="ui-health-bar__fill" style={{ width: `${ratio * 100}%` }} />
      <span className="ui-health-bar__text">
        {current}/{max}
      </span>
    </div>
  );
};
