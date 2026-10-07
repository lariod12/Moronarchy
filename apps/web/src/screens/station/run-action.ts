import type { GameActions } from "../../game/game-actions";
import type { StationAction } from "./station-confirm";

// Sends a plot / resident / shop action to the engine.
export const runStationAction = (actions: GameActions, action: StationAction): void => {
  switch (action.name) {
    case "upgradePlot":
      return actions.upgradePlot(action.plotId);
    case "healPlot":
      return actions.healPlot(action.plotId);
    case "recruitResident":
      return actions.recruitResident(action.plotId, action.kind);
    case "upgradeResident":
      return actions.upgradeResident(action.residentId);
    case "healResident":
      return actions.healResident(action.residentId);
    case "buyItem":
      return actions.buyItem(action.itemId);
  }
};
