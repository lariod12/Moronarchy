import type { ReactNode } from "react";
import { cx } from "../cx";
import { Tag } from "../Tag/Tag";
import "./Tile.css";

export interface TileProps {
  title: string;
  icon: ReactNode;
  // One tag, or several stacked in the bottom-right corner.
  badge?: string | string[];
  onClick?: () => void;
  disabled?: boolean;
  className?: string;
}

export const Tile = ({ title, icon, badge, onClick, disabled, className }: TileProps) => {
  const badges = badge === undefined ? [] : typeof badge === "string" ? [badge] : badge;
  return (
    <button type="button" className={cx("ui-tile", className)} onClick={onClick} disabled={disabled}>
      <span className="ui-tile__title">{title}</span>
      <span className="ui-tile__icon" aria-hidden="true">
        {icon}
      </span>
      {badges.length > 0 ? (
        <span className="ui-tile__badge">
          {badges.map((text) => (
            <Tag key={text}>{text}</Tag>
          ))}
        </span>
      ) : null}
    </button>
  );
};
