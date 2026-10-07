import type { ReactNode } from "react";
import { cx } from "../cx";
import "./Tag.css";

export interface TagProps {
  children: ReactNode;
  tone?: "default" | "muted";
  className?: string;
}

export const Tag = ({ children, tone = "default", className }: TagProps) => (
  <span className={cx("ui-tag", tone === "muted" && "ui-tag--muted", className)}>{children}</span>
);
