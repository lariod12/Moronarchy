import type { ReactNode } from "react";
import { cx } from "../cx";
import "./Tag.css";

export interface TagProps {
  children: ReactNode;
  tone?: "default" | "muted";
  className?: string;
  "data-testid"?: string;
}

export const Tag = ({ children, tone = "default", className, "data-testid": testId }: TagProps) => (
  <span className={cx("ui-tag", tone === "muted" && "ui-tag--muted", className)} data-testid={testId}>
    {children}
  </span>
);
