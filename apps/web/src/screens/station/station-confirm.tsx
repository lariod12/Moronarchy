import {
  ITEMS,
  getPlot,
  getPlotHealCost,
  getPlotUpgradeCost,
  getResidentHealCost,
  getResidentRecruitCost,
  getResidentUpgradeCost
} from "@moronarchy/core/engine";
import type { GameState, ItemId, Resident, ResidentId, ResidentKind, TileId } from "@moronarchy/core/engine";
import { ITEM_LABELS, RESIDENT_LABELS, plotLabel } from "../../game/labels";
import { Dialog } from "../../ui/Dialog/Dialog";

// What the Start Station, the Manage page and the info screens can ask the engine to do with plots, residents and the shop.
export type StationAction =
  | { name: "upgradePlot"; plotId: TileId }
  | { name: "healPlot"; plotId: TileId }
  | { name: "recruitResident"; plotId: TileId; kind: ResidentKind }
  | { name: "upgradeResident"; residentId: ResidentId }
  | { name: "healResident"; residentId: ResidentId }
  | { name: "buyItem"; itemId: ItemId };

export interface Confirm {
  title: string;
  text: string;
  action: StationAction;
}

export const costLabel = (label: string, cost: number | null): string => (cost !== null && cost > 0 ? `${label} ${cost}` : label);

export const residentName = (resident: Pick<Resident, "kind" | "name">): string => `${RESIDENT_LABELS[resident.kind]} ${resident.name}`;

// The "Spend X coin …?" question for an action, with the cost taken from the engine selectors.
export function describeConfirm(game: GameState, action: StationAction): Confirm {
  switch (action.name) {
    case "upgradePlot": {
      const plot = getPlot(game, action.plotId);
      const cost = plot ? getPlotUpgradeCost(plot) : null;
      return { title: "Upgrade", text: `Spend ${cost ?? 0} coin for next level of ${plotLabel(action.plotId)}?`, action };
    }
    case "healPlot": {
      const plot = getPlot(game, action.plotId);
      return { title: "Heal", text: `Spend ${plot ? getPlotHealCost(plot) : 0} coin to heal ${plotLabel(action.plotId)}?`, action };
    }
    case "recruitResident":
      return {
        title: "Recruit",
        text: `Spend ${getResidentRecruitCost(action.kind)} coin to recruit a ${RESIDENT_LABELS[action.kind]} on ${plotLabel(action.plotId)}?`,
        action
      };
    case "upgradeResident": {
      const resident = game.residents[action.residentId];
      const cost = resident ? getResidentUpgradeCost(resident) : null;
      return { title: "Upgrade", text: `Spend ${cost ?? 0} coin for next level of ${resident ? residentName(resident) : "this resident"}?`, action };
    }
    case "healResident": {
      const resident = game.residents[action.residentId];
      return {
        title: "Heal",
        text: `Spend ${resident ? getResidentHealCost(resident) : 0} coin to heal ${resident ? residentName(resident) : "this resident"}?`,
        action
      };
    }
    case "buyItem":
      return { title: "Buy", text: `Spend ${ITEMS[action.itemId].price} coin to buy ${ITEM_LABELS[action.itemId]}?`, action };
  }
}

export interface StationConfirmDialogProps {
  confirm: Confirm;
  onNo: () => void;
  onYes: () => void;
}

export const StationConfirmDialog = ({ confirm, onNo, onYes }: StationConfirmDialogProps) => (
  <Dialog
    title={confirm.title}
    actions={[
      { label: "No", onSelect: onNo },
      { label: "Yes", tone: "strong", onSelect: onYes }
    ]}
    onDismiss={onNo}
  >
    {confirm.text}
  </Dialog>
);
