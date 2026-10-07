import type { ReactNode } from "react";
import { cx } from "../cx";
import "./TileGrid.css";

export interface TileGridProps {
  children: ReactNode;
  className?: string;
}

export const TileGrid = ({ children, className }: TileGridProps) => (
  <div className={cx("ui-tile-grid", className)}>{children}</div>
);
