import { cx } from "../cx";
import { Tag } from "../Tag/Tag";
import "./StatTag.css";

export interface StatTagProps {
  label: string;
  value: string | number;
  muted?: boolean;
  className?: string;
}

export const StatTag = ({ label, value, muted = false, className }: StatTagProps) => (
  <Tag tone={muted ? "muted" : "default"} className={cx("ui-stat-tag", className)}>
    {label}: {value}
  </Tag>
);

export interface StatListProps {
  stats: Array<{ label: string; value: string | number }>;
  muted?: boolean;
  className?: string;
}

export const StatList = ({ stats, muted = false, className }: StatListProps) => (
  <div className={cx("ui-stat-list", className)}>
    {stats.map((stat) => (
      <StatTag key={stat.label} label={stat.label} value={stat.value} muted={muted} />
    ))}
  </div>
);
