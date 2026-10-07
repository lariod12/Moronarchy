import type { ReactNode } from "react";
import { cx } from "../cx";
import { Tag } from "../Tag/Tag";
import "./Tile.css";

export interface TileProps {
  title: string;
  icon: ReactNode;
  badge?: string;
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const Tile = ({ title, icon, badge, onClick, disabled, className }: TileProps) => (
  <button type="button" className={cx("ui-tile", className)} onClick={onClick} disabled={disabled}>
    <span className="ui-tile__title">{title}</span>
    <span className="ui-tile__icon" aria-hidden="true">
      {icon}
    </span>
    {badge ? (
      <span className="ui-tile__badge">
        <Tag>{badge}</Tag>
      </span>
    ) : null}
  </button>
);
