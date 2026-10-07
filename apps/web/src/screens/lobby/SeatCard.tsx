import { cx } from "../../ui/cx";
import { AvatarSilhouette } from "../../ui/icons";
import { SpeechBubble } from "../../ui/SpeechBubble/SpeechBubble";
import { Tag } from "../../ui/Tag/Tag";
import type { LobbySlotModel } from "./lobby-model";

export interface SeatCardProps {
  slot: LobbySlotModel | null;
  // Set when the viewer may act on this seat (host tapping another player).
  onPress?: () => void;
}

export const SeatCard = ({ slot, onPress }: SeatCardProps) => {
  if (!slot) {
    return (
      <div className="seat-card seat-card--empty" data-testid="seat-empty">
        <span className="seat-card__empty-label">Empty</span>
        <AvatarSilhouette className="seat-card__figure" />
      </div>
    );
  }

  const status = [slot.isSelf ? "you" : null, slot.isHost ? "host" : null, slot.ready ? "ready" : null, slot.connected ? null : "offline"]
    .filter(Boolean)
    .join(", ");
  const className = cx("seat-card", !slot.connected && "seat-card--offline", onPress && "seat-card--pressable");
  const content = (
    <>
      <Tag className="seat-card__name">{slot.name}</Tag>
      {slot.ready ? <span className="seat-card__ready">ready</span> : null}
      {slot.isHost ? <Tag className="seat-card__host">host</Tag> : null}
      <AvatarSilhouette className="seat-card__figure" />
      {slot.bubbleText ? (
        <SpeechBubble tail="left" className="seat-card__bubble">
          <span className="seat-card__bubble-text">{slot.bubbleText}</span>
        </SpeechBubble>
      ) : null}
    </>
  );
  const common = {
    className,
    "aria-label": status ? `${slot.name} (${status})` : slot.name,
    "data-testid": "seat-card",
    "data-player-id": slot.playerId
  };

  return onPress ? (
    <button type="button" {...common} onClick={onPress}>
      {content}
    </button>
  ) : (
    <div role="group" {...common}>
      {content}
    </div>
  );
};
