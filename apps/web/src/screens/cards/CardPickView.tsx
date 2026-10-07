import { Clover, Coins, Heart, Shield, Sword } from "lucide-react";
import type { ReactNode } from "react";
import type { CardOffer, CardType } from "@moronarchy/core/engine";
import { CardCongratsDialog, CardConfirmDialog } from "../../game/dialogs/dialogs";
import { CARD_LABELS } from "../../game/labels";
import { Tag } from "../../ui/Tag/Tag";
import "./CardPickView.css";

const CARD_ICONS: Record<CardType, ReactNode> = {
  maxHealth: <Heart size={64} />,
  attack: <Sword size={64} />,
  defense: <Shield size={64} />,
  lucky: <Clover size={64} />,
  coin: <Coins size={64} />
};

export interface CardPickViewProps {
  offers: CardOffer[];
  onPick: (index: number) => void;
  // Index of the card waiting for "Are you sure?".
  confirmIndex?: number | null;
  onConfirmNo?: () => void;
  onConfirmYes?: () => void;
  // The card that was just taken ("Congratulation!").
  congrats?: CardOffer | null;
  onCongratsDone?: () => void;
}

export const CardPickView = ({ offers, onPick, confirmIndex = null, onConfirmNo, onConfirmYes, congrats = null, onCongratsDone }: CardPickViewProps) => {
  const confirming = confirmIndex === null ? undefined : offers[confirmIndex];
  return (
    <div className="card-pick">
      <ul className="card-pick__grid">
        {offers.map((offer, index) => (
          <li key={`${offer.type}-${index}`} className="card-pick__cell">
            <button type="button" className="card-pick__card" data-testid="upgrade-card" onClick={() => onPick(index)}>
              <span className="card-pick__name">{CARD_LABELS[offer.type]}</span>
              <span className="card-pick__icon" aria-hidden="true">
                {CARD_ICONS[offer.type]}
              </span>
              <Tag className="card-pick__value">{`+${offer.value}`}</Tag>
            </button>
          </li>
        ))}
      </ul>
      {confirming ? <CardConfirmDialog offer={confirming} onNo={() => onConfirmNo?.()} onYes={() => onConfirmYes?.()} /> : null}
      {congrats ? <CardCongratsDialog offer={congrats} onDone={() => onCongratsDone?.()} /> : null}
    </div>
  );
};
