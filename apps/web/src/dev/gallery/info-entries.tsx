import { useState } from "react";
import type { ReactNode } from "react";
import { getResidentsByKind } from "@moronarchy/core/engine";
import type { GameState, ItemId, PlayerId, ResidentKind, TileId } from "@moronarchy/core/engine";
import { createCanRun, createRunCheck } from "../../game/game-actions";
import { ITEM_LABELS, RESIDENT_LABELS, plotLabel } from "../../game/labels";
import { EventsView } from "../../screens/events/EventsView";
import { ItemDetailView } from "../../screens/items/ItemDetailView";
import { ItemsView } from "../../screens/items/ItemsView";
import { MapPageView } from "../../screens/map/MapPageView";
import type { MapTab } from "../../screens/map/MapPageView";
import { PlotDetailView } from "../../screens/plots/PlotDetailView";
import { PlotsView } from "../../screens/plots/PlotsView";
import type { PlotsLayout, PlotsScope } from "../../screens/plots/PlotsView";
import { ResidentDetailView } from "../../screens/residents/ResidentDetailView";
import { ResidentsKindView } from "../../screens/residents/ResidentsKindView";
import type { ResidentsLayout } from "../../screens/residents/ResidentsKindView";
import { ResidentsView } from "../../screens/residents/ResidentsView";
import { StatsView } from "../../screens/stats/StatsView";
import type { StationAction } from "../../screens/station/station-confirm";
import { frame } from "./game-entries";
import type { Log } from "./game-entries";
import * as scenarios from "./game-fixtures";
import type { GameScenario } from "./game-fixtures";
import type { GalleryEntry } from "./types";

// Gallery group "Info": the in-game information pages, on states built with real engine commands.

const StatsDemo = ({ game, viewerId, initialPlayerId, log }: { game: GameState; viewerId: PlayerId; initialPlayerId: PlayerId; log: Log }) => {
  const [playerId, setPlayerId] = useState(initialPlayerId);
  const order = game.turnOrder;
  const step = (delta: number) => () => {
    const index = order.indexOf(playerId);
    const target = order[(index + delta + order.length) % order.length];
    if (target !== undefined) {
      log(`stats:${target}`);
      setPlayerId(target);
    }
  };
  return <StatsView game={game} playerId={playerId} viewerId={viewerId} onPrev={step(-1)} onNext={step(1)} />;
};

const PlotsDemo = ({ scenario, scope: initialScope, layout: initialLayout, log }: { scenario: GameScenario; scope: PlotsScope; layout: PlotsLayout; log: Log }) => {
  const [scope, setScope] = useState(initialScope);
  const [layout, setLayout] = useState(initialLayout);
  return (
    <PlotsView
      game={scenario.game}
      viewerId={scenario.viewerId}
      scope={scope}
      layout={layout}
      onScope={setScope}
      onLayout={setLayout}
      onOpenPlot={(plotId) => log(`plot:${plotId}`)}
    />
  );
};

const ResidentsKindDemo = ({ scenario, kind, layout: initialLayout, log }: { scenario: GameScenario; kind: ResidentKind; layout: ResidentsLayout; log: Log }) => {
  const [layout, setLayout] = useState(initialLayout);
  return (
    <ResidentsKindView
      game={scenario.game}
      viewerId={scenario.viewerId}
      kind={kind}
      layout={layout}
      onLayout={setLayout}
      onOpenResident={(resident) => log(`resident:${resident.id}`)}
    />
  );
};

const MapTabsDemo = ({ scenario, tab: initialTab }: { scenario: GameScenario; tab: MapTab }) => {
  const [tab, setTab] = useState(initialTab);
  return <MapPageView game={scenario.game} viewerId={scenario.viewerId} tab={tab} onTab={setTab} board={<p>The board tab is shown on the Map entries.</p>} />;
};

const entry = (id: string, title: string, render: (log: Log) => ReactNode): GalleryEntry => ({ id, group: "Info", title, render });

const firstResidentId = (scenario: GameScenario, kind: ResidentKind): string => {
  const resident = getResidentsByKind(scenario.game, scenario.viewerId)[kind][0];
  if (!resident) {
    throw new Error(`Scenario has no ${kind}`);
  }
  return resident.id;
};

const statsEntry = (id: string, title: string, make: () => GameScenario, playerId: PlayerId): GalleryEntry =>
  entry(id, title, (log) => {
    const scenario = make();
    return frame(scenario, "Players Info", <StatsDemo game={scenario.game} viewerId={scenario.viewerId} initialPlayerId={playerId} log={log} />, log);
  });

const plotsEntry = (id: string, title: string, make: () => GameScenario, scope: PlotsScope, layout: PlotsLayout): GalleryEntry =>
  entry(id, title, (log) => {
    const scenario = make();
    return frame(scenario, "Plots", <PlotsDemo scenario={scenario} scope={scope} layout={layout} log={log} />, log);
  });

const plotDetailEntry = (id: string, title: string, make: () => GameScenario, plotId: TileId, initialConfirm?: StationAction): GalleryEntry =>
  entry(id, title, (log) => {
    const scenario = make();
    return frame(
      scenario,
      plotLabel(plotId),
      <PlotDetailView
        game={scenario.game}
        viewerId={scenario.viewerId}
        plotId={plotId}
        check={createRunCheck(scenario.game, scenario.viewerId)}
        initialConfirm={initialConfirm}
        onAction={(action) => log(`action:${action.name}`)}
        onOpenResident={(resident) => log(`resident:${resident.id}`)}
      />,
      log
    );
  });

const itemDetailEntry = (id: string, title: string, make: () => GameScenario, itemId: ItemId, initialDialog?: "description" | "choosePlot"): GalleryEntry =>
  entry(id, title, (log) => {
    const scenario = make();
    return frame(
      scenario,
      ITEM_LABELS[itemId],
      <ItemDetailView
        game={scenario.game}
        viewerId={scenario.viewerId}
        itemId={itemId}
        canRun={createCanRun(scenario.game, scenario.viewerId)}
        initialDialog={initialDialog}
        onUse={(used, target) => log(target ? `use:${used}:${target.plotId}` : `use:${used}`)}
      />,
      log
    );
  });

export const INFO_ENTRIES: GalleryEntry[] = [
  statsEntry("stats-me", "Stats: my king", scenarios.infoGame, "0"),
  statsEntry("stats-other", "Stats: another king with equipment bonuses", scenarios.infoGame, "1"),
  statsEntry("stats-eliminated", "Stats: an eliminated king", scenarios.infoEliminated, "2"),
  plotsEntry("plots-mine-table", "Plots: mine, table", scenarios.infoGame, "mine", "table"),
  plotsEntry("plots-all-table", "Plots: all, table with Owner", scenarios.infoGame, "all", "table"),
  plotsEntry("plots-grid", "Plots: grid", scenarios.infoGame, "mine", "grid"),
  plotsEntry("plots-empty", "Plots: none owned yet", scenarios.mapStart, "mine", "table"),
  plotDetailEntry("plot-detail-upgradable", "Plot detail: Upgrade open at the Start Station", scenarios.station, 5),
  plotDetailEntry("plot-detail-locked", "Plot detail: Upgrade locked with a hint", scenarios.infoGame, 12),
  plotDetailEntry("plot-upgrade-confirm", "Plot detail: confirm the upgrade", scenarios.station, 5, { name: "upgradePlot", plotId: 5 }),
  entry("residents-overview", "Residents: overview", (log) => {
    const scenario = scenarios.infoGame();
    return frame(scenario, "Residents", <ResidentsView game={scenario.game} viewerId={scenario.viewerId} onOpenKind={(kind) => log(`kind:${kind}`)} />, log);
  }),
  entry("residents-warrior-table", "Residents: Warrior table", (log) => {
    const scenario = scenarios.infoGame();
    return frame(scenario, RESIDENT_LABELS.warrior, <ResidentsKindDemo scenario={scenario} kind="warrior" layout="table" log={log} />, log);
  }),
  entry("residents-farmer-grid", "Residents: Farmer grid", (log) => {
    const scenario = scenarios.infoGame();
    return frame(scenario, RESIDENT_LABELS.farmer, <ResidentsKindDemo scenario={scenario} kind="farmer" layout="grid" log={log} />, log);
  }),
  entry("resident-detail", "Resident detail", (log) => {
    const scenario = scenarios.infoGame();
    return frame(
      scenario,
      "Residents",
      <ResidentDetailView
        game={scenario.game}
        viewerId={scenario.viewerId}
        residentId={firstResidentId(scenario, "warrior")}
        check={createRunCheck(scenario.game, scenario.viewerId)}
        onAction={(action) => log(`action:${action.name}`)}
      />,
      log
    );
  }),
  entry("items-grid", "Items: grid", (log) => {
    const scenario = scenarios.infoGame();
    return frame(scenario, "Items", <ItemsView game={scenario.game} viewerId={scenario.viewerId} onOpenItem={(itemId) => log(`item:${itemId}`)} />, log);
  }),
  entry("items-empty", "Items: empty bag", (log) => {
    const scenario = scenarios.mapStart();
    return frame(scenario, "Items", <ItemsView game={scenario.game} viewerId={scenario.viewerId} onOpenItem={(itemId) => log(`item:${itemId}`)} />, log);
  }),
  itemDetailEntry("item-detail", "Item detail: Horse", scenarios.infoGame, "horse"),
  itemDetailEntry("item-description", "Item detail: Description popup", scenarios.infoGame, "horse", "description"),
  itemDetailEntry("item-choose-plot", "Item detail: choose a plot for the Sickle", scenarios.infoGame, "sickle", "choosePlot"),
  entry("events-list", "Events: active global and personal events", (log) => {
    const scenario = scenarios.eventsGame();
    return frame(scenario, "Events", <EventsView game={scenario.game} viewerId={scenario.viewerId} />, log);
  }),
  entry("events-empty", "Events: nothing yet", (log) => {
    const scenario = scenarios.mapStart();
    return frame(scenario, "Events", <EventsView game={scenario.game} viewerId={scenario.viewerId} />, log);
  }),
  entry("map-positions", "Map: Positions tab", (log) => {
    const scenario = scenarios.infoEliminated();
    return frame(scenario, "Map", <MapTabsDemo scenario={scenario} tab="positions" />, log);
  })
];
