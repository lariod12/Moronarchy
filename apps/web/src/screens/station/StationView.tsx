import { useState } from "react";
import {
  ITEM_IDS,
  ITEMS,
  getItemCount,
  getLatestLogEntry,
  getMaxResidents,
  getOwnedPlots,
  getPlot,
  getPlotHealCost,
  getPlotIncome,
  getPlotMaxHealth,
  getPlotUpgradeCost,
  getResidentHealCost,
  getResidentRecruitCost,
  getResidentStats,
  getResidentUpgradeCost,
  getResidentsOnPlot
} from "@moronarchy/core/engine";
import type { GameState, PlayerId, Plot, ResidentKind, TileId } from "@moronarchy/core/engine";
import type { CanRun } from "../../game/game-actions";
import { ITEM_LABELS, RESIDENT_LABELS, plotLabel } from "../../game/labels";
import { Button } from "../../ui/Button/Button";
import { Tabs } from "../../ui/Tabs/Tabs";
import { Tag } from "../../ui/Tag/Tag";
import { StationConfirmDialog, costLabel, describeConfirm, residentName } from "./station-confirm";
import type { Confirm, StationAction } from "./station-confirm";
import "./StationView.css";

export type { StationAction } from "./station-confirm";

export type StationScope = { kind: "station" } | { kind: "plot"; plotId: TileId };

type StationTab = "plots" | "residents" | "shop";

export interface StationViewProps {
  game: GameState;
  viewerId: PlayerId;
  scope: StationScope;
  canRun: CanRun;
  onAction: (action: StationAction) => void;
  onDone: () => void;
  initialTab?: StationTab;
  // Gallery hook: open with an "Are you sure?" already showing.
  initialConfirm?: StationAction;
}

const getSummary = (game: GameState, viewerId: PlayerId, scope: StationScope): string => {
  if (scope.kind === "plot") {
    const plot = getPlot(game, scope.plotId);
    return plot
      ? `${plotLabel(plot.id)} · Level ${plot.level} · Residents ${plot.residentIds.length}/${getMaxResidents(plot)}`
      : plotLabel(scope.plotId);
  }
  const lap = getLatestLogEntry(game, "lapCompleted", viewerId);
  if (!lap) {
    return "Start Station";
  }
  return `Lap complete: +${Number(lap.data.bonus ?? 0)} coin · Level ${Number(lap.data.level ?? 1)} · Income +${Number(lap.data.income ?? 0)}`;
};

// Start Station (every own plot, resident and the shop) or one plot landed on (no shop). Nothing here knows the rules:
// costs come from the engine selectors and every button asks `canRun`.
export const StationView = ({ game, viewerId, scope, canRun, onAction, onDone, initialTab = "plots", initialConfirm }: StationViewProps) => {
  const [tab, setTab] = useState<StationTab>(initialTab);
  const [confirm, setConfirm] = useState<Confirm | null>(() => (initialConfirm ? describeConfirm(game, initialConfirm) : null));

  const plots: Plot[] = scope.kind === "station" ? getOwnedPlots(game, viewerId) : [getPlot(game, scope.plotId)].filter((plot): plot is Plot => plot !== undefined);
  const tabs = scope.kind === "station" ? ([{ key: "plots", label: "Plots" }, { key: "residents", label: "Residents" }, { key: "shop", label: "Shop" }] as const) : ([{ key: "plots", label: "Plots" }, { key: "residents", label: "Residents" }] as const);
  const activeTab: StationTab = tabs.some((entry) => entry.key === tab) ? tab : "plots";
  const doneLabel = scope.kind === "station" && game.turn.remainingSteps > 0 ? "Continue moving" : "Done";

  const ask = (action: StationAction): void => setConfirm(describeConfirm(game, action));

  return (
    <div className="station">
      <p className="station__summary" data-testid="station-summary">
        {getSummary(game, viewerId, scope)}
      </p>
      <Tabs tabs={[...tabs]} active={activeTab} onChange={setTab} label="Station" />
      <div className="station__list" role="tabpanel">
        {activeTab === "plots" ? <PlotRows game={game} plots={plots} canRun={canRun} onAction={onAction} ask={ask} /> : null}
        {activeTab === "residents" ? <ResidentRows game={game} plots={plots} canRun={canRun} onAction={onAction} ask={ask} /> : null}
        {activeTab === "shop" ? <ShopRows game={game} viewerId={viewerId} canRun={canRun} ask={ask} /> : null}
      </div>
      <Button tone="strong" className="station__done" onClick={onDone}>
        {doneLabel}
      </Button>
      {confirm ? (
        <StationConfirmDialog
          confirm={confirm}
          onNo={() => setConfirm(null)}
          onYes={() => {
            setConfirm(null);
            onAction(confirm.action);
          }}
        />
      ) : null}
    </div>
  );
};

interface RowsProps {
  game: GameState;
  canRun: CanRun;
  onAction: (action: StationAction) => void;
  ask: (action: StationAction) => void;
}

const PlotRows = ({ game, plots, canRun, onAction, ask }: RowsProps & { plots: Plot[] }) =>
  plots.length === 0 ? (
    <p className="station__empty">You do not own any plot yet.</p>
  ) : (
    <ul className="station__rows">
      {plots.map((plot) => {
        const upgradeCost = getPlotUpgradeCost(plot);
        const healCost = getPlotHealCost(plot);
        return (
          <li key={plot.id} className="station__row" data-testid="station-plot-row">
            <div className="station__info">
              <span className="station__name">{plotLabel(plot.id)}</span>
              <Tag>{`Lv ${plot.level}`}</Tag>
              <span className="station__meta">
                {`Health ${plot.health}/${getPlotMaxHealth(plot.level)} · Income ${getPlotIncome(game, plot)} · Residents ${plot.residentIds.length}/${getMaxResidents(plot)}`}
              </span>
            </div>
            <div className="station__buttons">
              <Button size="sm" disabled={!canRun("upgradePlot", plot.id)} onClick={() => ask({ name: "upgradePlot", plotId: plot.id })}>
                {costLabel("Upgrade", upgradeCost)}
              </Button>
              <Button size="sm" disabled={!canRun("healPlot", plot.id)} onClick={() => onAction({ name: "healPlot", plotId: plot.id })}>
                {costLabel("Heal", healCost)}
              </Button>
            </div>
          </li>
        );
      })}
    </ul>
  );

const RECRUIT_KINDS: ResidentKind[] = ["warrior", "farmer"];

const ResidentRows = ({ game, plots, canRun, onAction, ask }: RowsProps & { plots: Plot[] }) =>
  plots.length === 0 ? (
    <p className="station__empty">You do not own any plot yet.</p>
  ) : (
    <div className="station__groups">
      {plots.map((plot) => (
        <section key={plot.id} className="station__group" aria-label={plotLabel(plot.id)}>
          <h3 className="station__group-title">{`${plotLabel(plot.id)} · Residents ${plot.residentIds.length}/${getMaxResidents(plot)}`}</h3>
          <ul className="station__rows">
            {getResidentsOnPlot(game, plot.id).map((resident) => {
              const stats = getResidentStats(resident);
              return (
                <li key={resident.id} className="station__row" data-testid="station-resident-row">
                  <div className="station__info">
                    <span className="station__name">{residentName(resident)}</span>
                    <Tag>{`Lv ${resident.level}`}</Tag>
                    <span className="station__meta">{`Health ${resident.health}/${stats.maxHealth}`}</span>
                  </div>
                  <div className="station__buttons">
                    <Button size="sm" disabled={!canRun("upgradeResident", resident.id)} onClick={() => ask({ name: "upgradeResident", residentId: resident.id })}>
                      {costLabel("Upgrade", getResidentUpgradeCost(resident))}
                    </Button>
                    <Button size="sm" disabled={!canRun("healResident", resident.id)} onClick={() => onAction({ name: "healResident", residentId: resident.id })}>
                      {costLabel("Heal", getResidentHealCost(resident))}
                    </Button>
                  </div>
                </li>
              );
            })}
            <li className="station__row station__row--recruit" data-testid="station-recruit-row">
              <span className="station__name">Recruit</span>
              <div className="station__buttons">
                {RECRUIT_KINDS.map((kind) => (
                  <Button key={kind} size="sm" disabled={!canRun("recruitResident", plot.id, kind)} onClick={() => ask({ name: "recruitResident", plotId: plot.id, kind })}>
                    {`Recruit ${RESIDENT_LABELS[kind]} ${getResidentRecruitCost(kind)}`}
                  </Button>
                ))}
              </div>
            </li>
          </ul>
        </section>
      ))}
    </div>
  );

const ShopRows = ({ game, viewerId, canRun, ask }: Pick<RowsProps, "game" | "canRun" | "ask"> & { viewerId: PlayerId }) => {
  const king = game.kings[viewerId];
  return (
    <ul className="station__rows">
      {ITEM_IDS.map((itemId) => (
        <li key={itemId} className="station__row" data-testid="station-shop-row">
          <div className="station__info">
            <span className="station__name">{ITEM_LABELS[itemId]}</span>
            <Tag>{`x${king ? getItemCount(king, itemId) : 0}`}</Tag>
          </div>
          <div className="station__buttons">
            <Button size="sm" disabled={!canRun("buyItem", itemId)} onClick={() => ask({ name: "buyItem", itemId })}>
              {`Buy ${ITEMS[itemId].price}`}
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
};
