import { cx } from "../../ui/cx";
import { SpeechBubble } from "../../ui/SpeechBubble/SpeechBubble";
import { Tag } from "../../ui/Tag/Tag";
import "./TopBar.css";

export interface TopBarProps {
  round?: number;
  roomCode: string;
  title?: string;
  inflation?: number;
  // Lobby variant: the room code becomes a button (tap to copy) with an optional bubble below it.
  onRoomPress?: () => void;
  roomBubble?: string;
  className?: string;
}

export const TopBar = ({ round, roomCode, title, inflation, onRoomPress, roomBubble, className }: TopBarProps) => {
  const roundLabel =
    round === undefined ? null : inflation !== undefined && inflation > 1 ? `Round ${round} · Fee ×${inflation}` : `Round ${round}`;

  return (
    <header className={cx("shell-top-bar", className)}>
      <div className="shell-top-bar__side">{roundLabel ? <Tag>{roundLabel}</Tag> : null}</div>
      <div className="shell-top-bar__room-wrap">
        {onRoomPress ? (
          <button type="button" className="shell-top-bar__room-button" aria-label={`Room code ${roomCode}, tap to copy`} onClick={onRoomPress}>
            <Tag className="shell-top-bar__room">{roomCode}</Tag>
          </button>
        ) : (
          <Tag className="shell-top-bar__room">{roomCode}</Tag>
        )}
        {roomBubble ? (
          <SpeechBubble tail="top-left" className="shell-top-bar__bubble">
            <span role="status">{roomBubble}</span>
          </SpeechBubble>
        ) : null}
      </div>
      <div className="shell-top-bar__side shell-top-bar__side--end">{title ? <Tag>{title}</Tag> : null}</div>
    </header>
  );
};
