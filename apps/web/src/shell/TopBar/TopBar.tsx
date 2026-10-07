import { cx } from "../../ui/cx";
import { Tag } from "../../ui/Tag/Tag";
import "./TopBar.css";

export interface TopBarProps {
  round?: number;
  roomCode: string;
  title?: string;
  inflation?: number;
  className?: string;
}

export const TopBar = ({ round, roomCode, title, inflation, className }: TopBarProps) => {
  const roundLabel =
    round === undefined ? null : inflation !== undefined && inflation > 1 ? `Round ${round} · Fee ×${inflation}` : `Round ${round}`;

  return (
    <header className={cx("shell-top-bar", className)}>
      <div className="shell-top-bar__side">{roundLabel ? <Tag>{roundLabel}</Tag> : null}</div>
      <Tag className="shell-top-bar__room">{roomCode}</Tag>
      <div className="shell-top-bar__side shell-top-bar__side--end">{title ? <Tag>{title}</Tag> : null}</div>
    </header>
  );
};
