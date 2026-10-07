import type { CardOffer, TileId } from "@moronarchy/core/engine";
import { Dialog } from "../../ui/Dialog/Dialog";
import { CARD_LABELS, plotLabel } from "../labels";

// Text straight from the design (screen 12).
export const END_TURN_TEXT = "This action will be end turn and you cannot interactive some action. Are you sure?";

// Fights are not playable yet (step 5B), so Attack is shown but never sendable.
export const FIGHT_SOON_HINT = "Fights arrive in the next update";
export const PEACE_TREATY_HINT = "Peace Treaty: no attacks";

export const cardText = (offer: CardOffer): string => `${CARD_LABELS[offer.type]} +${offer.value}`;

const attackHint = (canAttack: boolean): string => (canAttack ? FIGHT_SOON_HINT : PEACE_TREATY_HINT);

export interface BuyPlotDialogProps {
  plotId: TileId;
  price: number;
  reason: "empty" | "destroyed";
  canAfford: boolean;
  onSkip: () => void;
  onBuy: () => void;
}

export const BuyPlotDialog = ({ plotId, price, reason, canAfford, onSkip, onBuy }: BuyPlotDialogProps) => (
  <Dialog
    title={plotLabel(plotId)}
    actions={[
      { label: "Skip", onSelect: onSkip },
      { label: "Buy", onSelect: onBuy, tone: "strong", disabled: !canAfford }
    ]}
  >
    {reason === "destroyed"
      ? `You broke ${plotLabel(plotId)}. Buy it now for ${price} coin?`
      : `Buy this plot for ${price} coin?`}
    {canAfford ? null : <p className="ui-dialog__hint">Not enough coin</p>}
  </Dialog>
);

export interface VisitorChoiceDialogProps {
  ownerName: string;
  plotId: TileId;
  fee: number;
  canAttack: boolean;
  onPay: () => void;
}

export const VisitorChoiceDialog = ({ ownerName, plotId, fee, canAttack, onPay }: VisitorChoiceDialogProps) => (
  <Dialog
    title="Message"
    actions={[
      { label: `Pay ${fee}`, onSelect: onPay, tone: "strong" },
      { label: "Attack", onSelect: () => undefined, disabled: true }
    ]}
  >
    {`You get in ${ownerName}'s plot (${plotLabel(plotId)}). Pay ${fee} coin or attack?`}
    <p className="ui-dialog__hint">{attackHint(canAttack)}</p>
  </Dialog>
);

export interface OwnerChoiceDialogProps {
  visitorName: string;
  plotId: TileId;
  fee: number;
  canAttack: boolean;
  onCollect: () => void;
}

export const OwnerChoiceDialog = ({ visitorName, plotId, fee, canAttack, onCollect }: OwnerChoiceDialogProps) => (
  <Dialog
    title="Message"
    actions={[
      { label: "Collect", onSelect: onCollect, tone: "strong" },
      { label: "Attack", onSelect: () => undefined, disabled: true }
    ]}
  >
    {`${visitorName} stopped on your ${plotLabel(plotId)}. Collect ${fee} coin or attack?`}
    <p className="ui-dialog__hint">{attackHint(canAttack)}</p>
  </Dialog>
);

export interface WaitingDialogProps {
  ownerName: string;
}

// No actions and no dismiss: it closes by itself when the owner has decided.
export const WaitingDialog = ({ ownerName }: WaitingDialogProps) => (
  <Dialog title="Message" actions={[]}>
    {`You stand on ${ownerName}'s plot, waiting for decision…`}
  </Dialog>
);

export interface LuckyDieDialogProps {
  value: number;
  bonus: number;
  onReroll: () => void;
  onMove: () => void;
}

export const LuckyDieDialog = ({ value, bonus, onReroll, onMove }: LuckyDieDialogProps) => (
  <Dialog
    title={`You rolled ${value}`}
    actions={[
      { label: "Reroll (Lucky Die)", onSelect: onReroll },
      { label: "Move", onSelect: onMove, tone: "strong" }
    ]}
  >
    {bonus > 0 ? `You will move ${value + bonus} steps (${value} + ${bonus} bonus).` : `You will move ${value} steps.`}
  </Dialog>
);

export interface EndTurnDialogProps {
  onNo: () => void;
  onYes: () => void;
}

export const EndTurnDialog = ({ onNo, onYes }: EndTurnDialogProps) => (
  <Dialog
    title="End of turn"
    actions={[
      { label: "No", onSelect: onNo },
      { label: "Yes", onSelect: onYes, tone: "strong" }
    ]}
    onDismiss={onNo}
  >
    {END_TURN_TEXT}
  </Dialog>
);

export interface OwnPlotDialogProps {
  plotId: TileId;
  onManage: () => void;
  onDone: () => void;
}

export const OwnPlotDialog = ({ plotId, onManage, onDone }: OwnPlotDialogProps) => (
  <Dialog
    title={`Your plot (${plotLabel(plotId)})`}
    actions={[
      { label: "Manage", onSelect: onManage, tone: "strong" },
      { label: "Done", onSelect: onDone }
    ]}
    onDismiss={onDone}
  >
    Upgrade it, heal it or recruit residents before you end your turn.
  </Dialog>
);

export interface NoticeDialogProps {
  title: string;
  text: string;
  onDone: () => void;
}

export const NoticeDialog = ({ title, text, onDone }: NoticeDialogProps) => (
  <Dialog title={title} actions={[{ label: "Done", onSelect: onDone }]} onDismiss={onDone}>
    {text}
  </Dialog>
);

export interface CardConfirmDialogProps {
  offer: CardOffer;
  onNo: () => void;
  onYes: () => void;
}

export const CardConfirmDialog = ({ offer, onNo, onYes }: CardConfirmDialogProps) => (
  <Dialog
    title="You have picked"
    actions={[
      { label: "No", onSelect: onNo },
      { label: "Yes", onSelect: onYes, tone: "strong" }
    ]}
    onDismiss={onNo}
  >
    {`${cardText(offer)}. Are you sure?`}
  </Dialog>
);

export interface CardCongratsDialogProps {
  offer: CardOffer;
  onDone: () => void;
}

export const CardCongratsDialog = ({ offer, onDone }: CardCongratsDialogProps) => (
  <Dialog title="Congratulation!" actions={[{ label: "Done", onSelect: onDone }]} onDismiss={onDone}>
    {`You got ${cardText(offer)}`}
  </Dialog>
);

