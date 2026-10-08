import type { CardOffer, TileId } from "@moronarchy/core/engine";
import { Dialog } from "../../ui/Dialog/Dialog";
import { CARD_LABELS, plotLabel } from "../labels";

// Text straight from the design (screen 12).
export const END_TURN_TEXT = "This action will be end turn and you cannot interactive some action. Are you sure?";

export const PEACE_TREATY_HINT = "Peace Treaty: no attacks";

export const cardText = (offer: CardOffer): string => `${CARD_LABELS[offer.type]} +${offer.value}`;

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

// The rules only allow attacks outside a Peace Treaty (`canAttack`); `attackEnabled` is what the engine says right now.
export interface VisitorChoiceDialogProps {
  ownerName: string;
  plotId: TileId;
  fee: number;
  canAttack: boolean;
  attackEnabled?: boolean;
  onPay: () => void;
  onAttack: () => void;
}

export const VisitorChoiceDialog = ({ ownerName, plotId, fee, canAttack, attackEnabled = canAttack, onPay, onAttack }: VisitorChoiceDialogProps) => (
  <Dialog
    title="Message"
    actions={[
      { label: `Pay ${fee}`, onSelect: onPay, tone: "strong" },
      { label: "Attack", onSelect: onAttack, disabled: !attackEnabled }
    ]}
  >
    {`You get in ${ownerName}'s plot (${plotLabel(plotId)}). Pay ${fee} coin or attack?`}
    {canAttack ? null : <p className="ui-dialog__hint">{PEACE_TREATY_HINT}</p>}
  </Dialog>
);

export interface OwnerChoiceDialogProps {
  visitorName: string;
  plotId: TileId;
  fee: number;
  canAttack: boolean;
  attackEnabled?: boolean;
  onCollect: () => void;
  onAttack: () => void;
}

export const OwnerChoiceDialog = ({ visitorName, plotId, fee, canAttack, attackEnabled = canAttack, onCollect, onAttack }: OwnerChoiceDialogProps) => (
  <Dialog
    title="Message"
    actions={[
      { label: "Collect", onSelect: onCollect, tone: "strong" },
      { label: "Attack", onSelect: onAttack, disabled: !attackEnabled }
    ]}
  >
    {`${visitorName} stopped on your ${plotLabel(plotId)}. Collect ${fee} coin or attack?`}
    {canAttack ? null : <p className="ui-dialog__hint">{PEACE_TREATY_HINT}</p>}
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

export interface FightNoticeDialogProps {
  text: string;
  onWatch: () => void;
  onLater: () => void;
}

// A fight started that the viewer is not part of (or an attack on the viewer's own plot while they are away).
export const FightNoticeDialog = ({ text, onWatch, onLater }: FightNoticeDialogProps) => (
  <Dialog
    title="Fight!"
    actions={[
      { label: "Later", onSelect: onLater },
      { label: "Watch", onSelect: onWatch, tone: "strong" }
    ]}
    onDismiss={onLater}
  >
    {text}
  </Dialog>
);

export interface FightResultDialogProps {
  title: string;
  lines: string[];
  onDone: () => void;
}

export const FightResultDialog = ({ title, lines, onDone }: FightResultDialogProps) => (
  <Dialog title={title} actions={[{ label: "Done", onSelect: onDone, tone: "strong" }]} onDismiss={onDone}>
    <ul className="ui-dialog__lines" data-testid="fight-result-lines">
      {lines.map((line) => (
        <li key={line}>{line}</li>
      ))}
    </ul>
  </Dialog>
);

export interface RetreatConfirmDialogProps {
  fee: number;
  onNo: () => void;
  onYes: () => void;
}

export const RetreatConfirmDialog = ({ fee, onNo, onYes }: RetreatConfirmDialogProps) => (
  <Dialog
    title="Retreat"
    actions={[
      { label: "No", onSelect: onNo },
      { label: "Yes", onSelect: onYes, tone: "strong" }
    ]}
    onDismiss={onNo}
  >
    {fee > 0 ? `Retreat counts as a loss. You will pay ${fee} coin.` : "Retreat counts as a loss."}
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

