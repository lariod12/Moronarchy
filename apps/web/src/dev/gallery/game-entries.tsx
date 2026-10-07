import type { ReactNode } from "react";
import { getFightView, getFinalFightView, getFinalRanking, getItemCount, getPlot, getPlotFee } from "@moronarchy/core/engine";
import type { GameState, PendingDecision, PlayerId, TileId } from "@moronarchy/core/engine";
import {
  BuyPlotDialog,
  EndTurnDialog,
  FightNoticeDialog,
  FightResultDialog,
  LuckyDieDialog,
  NoticeDialog,
  OwnPlotDialog,
  OwnerChoiceDialog,
  RetreatConfirmDialog,
  VisitorChoiceDialog,
  WaitingDialog
} from "../../game/dialogs/dialogs";
import { describeFightResult, fightNoticeText } from "../../game/fight-result";
import { FIGHT_ITEM_IDS } from "../../game/labels";
import { createCanRun } from "../../game/game-actions";
import { getActivityText, getNotification } from "../../game/log-format";
import { FightView } from "../../screens/fight/FightView";
import { ItemSheet } from "../../screens/fight/ItemSheet";
import { CardPickView } from "../../screens/cards/CardPickView";
import { GameFrame } from "../../screens/game/GameFrame";
import { MapView } from "../../screens/map/MapView";
import { ResultPlaceholderView } from "../../screens/result/ResultPlaceholderView";
import { StationView } from "../../screens/station/StationView";
import type { StationAction, StationScope } from "../../screens/station/StationView";
import { ActivityLine } from "../../shell/ActivityLine/ActivityLine";
import * as scenarios from "./game-fixtures";
import type { GameScenario } from "./game-fixtures";
import { ROOM_CODE } from "./fixtures";
import type { GalleryEntry } from "./types";
import "./gallery.css";

type Log = (action: string) => void;

const positionsOf = (game: GameState): Record<PlayerId, TileId> =>
  Object.fromEntries(game.turnOrder.map((id) => [id, game.kings[id]?.position ?? 1]));

// The pending decision of a scenario, so dialogs show the engine numbers (price, plot, fee).
const pendingOf = <K extends PendingDecision["kind"]>(scenario: GameScenario, kind: K): Extract<PendingDecision, { kind: K }> => {
  const { pending } = scenario.game;
  if (pending?.kind !== kind) {
    throw new Error(`Scenario has no ${kind} decision`);
  }
  return pending as Extract<PendingDecision, { kind: K }>;
};

const feeOf = (game: GameState, plotId: TileId): number => {
  const plot = getPlot(game, plotId);
  return plot ? getPlotFee(game, plot) : 0;
};

const frame = ({ game, viewerId }: GameScenario, title: string, content: ReactNode, log: Log, overlay?: ReactNode): ReactNode => (
  <GameFrame
    game={game}
    viewerId={viewerId}
    roomCode={ROOM_CODE}
    title={title}
    backDisabled={title === "Home"}
    onBack={() => log("back")}
    onCrownPress={() => log("press")}
    onCrownLongPress={() => log("longPress")}
    overlay={overlay}
  >
    {content}
  </GameFrame>
);

const mapContent = (scenario: GameScenario, log: Log, rolling = false): ReactNode => {
  const { game, viewerId } = scenario;
  const canRun = createCanRun(game, viewerId);
  return (
    <MapView
      game={game}
      viewerId={viewerId}
      positions={positionsOf(game)}
      canRoll={canRun("rollDice")}
      canUseHorse={canRun("useItem", "horse")}
      rolling={rolling}
      onRoll={() => log("roll")}
      onUseHorse={() => log("useHorse")}
    />
  );
};

const mapEntry = (id: string, title: string, make: () => GameScenario, rolling = false): GalleryEntry => ({
  id,
  group: "Game",
  title,
  render: (log) => {
    const scenario = make();
    return frame(scenario, "Map", mapContent(scenario, log, rolling), log);
  }
});

const dialogEntry = (id: string, title: string, make: () => GameScenario, dialog: (scenario: GameScenario, log: Log) => ReactNode): GalleryEntry => ({
  id,
  group: "Game",
  title,
  render: (log) => {
    const scenario = make();
    return frame(scenario, "Map", mapContent(scenario, log), log, dialog(scenario, log));
  }
});

const stationContent = (scenario: GameScenario, scope: StationScope, log: Log, initialTab?: "plots" | "residents" | "shop", initialConfirm?: StationAction): ReactNode => (
  <StationView
    game={scenario.game}
    viewerId={scenario.viewerId}
    scope={scope}
    canRun={createCanRun(scenario.game, scenario.viewerId)}
    initialTab={initialTab}
    initialConfirm={initialConfirm}
    onAction={(action) => log(`action:${action.name}`)}
    onDone={() => log("done")}
  />
);

const stationEntry = (id: string, title: string, initialTab: "plots" | "residents" | "shop", initialConfirm?: StationAction): GalleryEntry => ({
  id,
  group: "Game",
  title,
  render: (log) => {
    const scenario = scenarios.station();
    return frame(scenario, "Start Station", stationContent(scenario, { kind: "station" }, log, initialTab, initialConfirm), log);
  }
});

const cardsEntry = (id: string, title: string, options: { confirm?: boolean; congrats?: boolean }): GalleryEntry => ({
  id,
  group: "Game",
  title,
  render: (log) => {
    const scenario = scenarios.cardPick();
    const pending = scenario.game.pending;
    const offers = pending?.kind === "pickCard" ? pending.offers : [];
    return frame(
      scenario,
      "Upgrade Card",
      <CardPickView
        offers={offers}
        onPick={(index) => log(`pick:${index}`)}
        confirmIndex={options.confirm ? 0 : null}
        onConfirmNo={() => log("No")}
        onConfirmYes={() => log("Yes")}
        congrats={options.congrats ? (offers[0] ?? null) : null}
        onCongratsDone={() => log("Done")}
      />,
      log
    );
  }
});

const activityTexts = (): string[] => {
  const texts: string[] = [];
  const rolled = scenarios.rolled(4);
  texts.push(getActivityText(rolled.game, rolled.viewerId) ?? "");
  const visitor = scenarios.visitorDecision();
  texts.push(getActivityText(visitor.game, "1") ?? "");
  const station = scenarios.station();
  texts.push(getActivityText(station.game, station.viewerId) ?? "");
  const finished = scenarios.finished();
  texts.push(getActivityText(finished.game, finished.viewerId) ?? "");
  return texts.filter((text) => text !== "");
};

const fightContent = (scenario: GameScenario, log: Log): ReactNode => {
  const { game, viewerId } = scenario;
  const view = getFightView(game, viewerId);
  if (!view) {
    throw new Error("Scenario has no running fight");
  }
  const names = Object.fromEntries(Object.values(game.kings).map((king) => [king.id, king.name]));
  const canRun = createCanRun(game, viewerId);
  const viewer = game.kings[viewerId];
  const canUseItem = viewer ? FIGHT_ITEM_IDS.some((itemId) => getItemCount(viewer, itemId) > 0 && canRun("useItem", itemId)) : false;
  return (
    <FightView
      view={view}
      names={names}
      canUseItem={canUseItem}
      onRoll={() => log("roll")}
      onUseItem={() => log("useItem")}
      onRetreat={() => log("retreat")}
    />
  );
};

// The fight page right after the deciding round: built from the stored result, no buttons.
const finalFightContent = ({ game, viewerId }: GameScenario): ReactNode => {
  const view = getFinalFightView(game, viewerId);
  if (!view) {
    throw new Error("Scenario has no finished fight");
  }
  const names = Object.fromEntries(Object.values(game.kings).map((king) => [king.id, king.name]));
  return <FightView view={view} names={names} />;
};

const fightEntry = (id: string, title: string, make: () => GameScenario, overlay?: (scenario: GameScenario, log: Log) => ReactNode): GalleryEntry => ({
  id,
  group: "Fight",
  title,
  render: (log) => {
    const scenario = make();
    return frame(scenario, "Fight", fightContent(scenario, log), log, overlay ? overlay(scenario, log) : undefined);
  }
});

// Popups of the fight flow sit on the Map, like every other decision popup.
const fightDialogEntry = (id: string, title: string, make: () => GameScenario, dialog: (scenario: GameScenario, log: Log) => ReactNode): GalleryEntry => ({
  id,
  group: "Fight",
  title,
  render: (log) => {
    const scenario = make();
    return frame(scenario, "Map", mapContent(scenario, log), log, dialog(scenario, log));
  }
});

const resultDialog = (scenario: GameScenario, log: Log): ReactNode => {
  const model = describeFightResult(scenario.game, scenario.viewerId);
  return model ? <FightResultDialog title={model.title} lines={model.lines} onDone={() => log("Done")} /> : null;
};

const itemSheetEntries = (scenario: GameScenario) => {
  const canRun = createCanRun(scenario.game, scenario.viewerId);
  const viewer = scenario.game.kings[scenario.viewerId];
  return FIGHT_ITEM_IDS.flatMap((itemId) => {
    const count = viewer ? getItemCount(viewer, itemId) : 0;
    return count > 0 ? [{ itemId, count, enabled: canRun("useItem", itemId) }] : [];
  });
};

const FIGHT_ENTRIES: GalleryEntry[] = [
  fightEntry("fight-king-start", "Fight: duel about to start (attacker)", scenarios.fightKingStart),
  fightEntry("fight-king-mid", "Fight: duel at 1-1 with damage shown", scenarios.fightKingMid),
  fightEntry("fight-waiting", "Fight: waiting for the other king to roll", scenarios.fightWaiting),
  fightEntry("fight-garrison", "Fight: against a garrison, residents killed", scenarios.fightGarrison),
  fightEntry("fight-plot", "Fight: against a passive plot, a Blocked round", scenarios.fightPlot),
  fightEntry("fight-buffs", "Fight: War Horn and Wood Shield active", scenarios.fightBuffs),
  fightEntry("fight-item-sheet", "Fight: item sheet", scenarios.fightKingStart, (scenario, log) => (
    <ItemSheet items={itemSheetEntries(scenario)} onUse={(itemId) => log(`use:${itemId}`)} onClose={() => log("Close")} />
  )),
  fightEntry("fight-retreat-confirm", "Fight: retreat confirmation", () => scenarios.fightGarrison(), (scenario, log) => (
    <RetreatConfirmDialog fee={getFightView(scenario.game, scenario.viewerId)?.retreatFee ?? 0} onNo={() => log("No")} onYes={() => log("Yes")} />
  )),
  {
    id: "fight-final-round",
    group: "Fight",
    title: "Fight: deciding round shown, fight over",
    render: (log) => {
      const scenario = scenarios.fightWon();
      return frame(scenario, "Fight", finalFightContent(scenario), log);
    }
  },
  fightEntry("fight-spectator", "Fight: spectator, no buttons", scenarios.fightSpectator),
  fightDialogEntry("fight-result-victory", "Fight result: Victory", scenarios.fightWon, resultDialog),
  fightDialogEntry("fight-result-defeat", "Fight result: Defeat", scenarios.fightLost, resultDialog),
  fightDialogEntry("fight-result-destroyed", "Fight result: plot destroyed", scenarios.fightDestroyed, resultDialog),
  fightDialogEntry("fight-result-retreat", "Fight result: retreat", scenarios.fightRetreated, resultDialog),
  fightDialogEntry("dialog-fight-notice", "Dialog: a fight you can watch", () => scenarios.fightStartedElsewhere("2"), (scenario, log) => {
    const fight = scenario.game.fight;
    return fight && fight.attacker.type === "king" ? (
      <FightNoticeDialog
        text={fightNoticeText(scenario.game, scenario.viewerId, fight.attacker.playerId, fight.plotId, getPlot(scenario.game, fight.plotId)?.ownerId ?? null)}
        onWatch={() => log("Watch")}
        onLater={() => log("Later")}
      />
    ) : null;
  }),
  fightDialogEntry("dialog-fight-notice-owner", "Dialog: your plot is attacked", () => scenarios.fightStartedElsewhere("1"), (scenario, log) => {
    const fight = scenario.game.fight;
    return fight && fight.attacker.type === "king" ? (
      <FightNoticeDialog
        text={fightNoticeText(scenario.game, scenario.viewerId, fight.attacker.playerId, fight.plotId, getPlot(scenario.game, fight.plotId)?.ownerId ?? null)}
        onWatch={() => log("Watch")}
        onLater={() => log("Later")}
      />
    ) : null;
  }),
  dialogEntry("dialog-visitor-attack", "Dialog: visitor with Attack enabled", scenarios.visitorDecision, (scenario, log) => {
    const { plotId, canAttack } = pendingOf(scenario, "visitorChoice");
    const attackEnabled = canAttack && createCanRun(scenario.game, scenario.viewerId)("attack");
    return <VisitorChoiceDialog ownerName="Bob" plotId={plotId} fee={feeOf(scenario.game, plotId)} canAttack={canAttack} attackEnabled={attackEnabled} onPay={() => log("Pay")} onAttack={() => log("Attack")} />;
  })
];

export const GAME_ENTRIES: GalleryEntry[] = [
  mapEntry("map-start", "Map: four kings on Start, ready to roll", scenarios.mapStart),
  mapEntry("map-midgame", "Map: mid-game ownership and tokens", scenarios.mapMidgame),
  mapEntry("map-rolling", "Map: die rolling", scenarios.mapStart, true),
  mapEntry("map-horse", "Map: Use Horse available", scenarios.mapHorse),
  dialogEntry("dialog-buy", "Dialog: buy plot", scenarios.buyDecision, (scenario, log) => {
    const { plotId, price } = pendingOf(scenario, "buyPlot");
    return <BuyPlotDialog plotId={plotId} price={price} reason="empty" canAfford onSkip={() => log("Skip")} onBuy={() => log("Buy")} />;
  }),
  dialogEntry("dialog-buy-destroyed", "Dialog: buy destroyed plot (cannot afford)", () => scenarios.buyDecision({ destroyed: true, poor: true }), (scenario, log) => {
      const { plotId, price } = pendingOf(scenario, "buyPlot");
      return <BuyPlotDialog plotId={plotId} price={price} reason="destroyed" canAfford={false} onSkip={() => log("Skip")} onBuy={() => log("Buy")} />;
    }),
  dialogEntry("dialog-visitor", "Dialog: visitor pays or attacks", scenarios.visitorDecision, (scenario, log) => {
    const { plotId, canAttack } = pendingOf(scenario, "visitorChoice");
    return <VisitorChoiceDialog ownerName="Bob" plotId={plotId} fee={feeOf(scenario.game, plotId)} canAttack={canAttack} attackEnabled={canAttack && createCanRun(scenario.game, scenario.viewerId)("attack")} onPay={() => log("Pay")} onAttack={() => log("Attack")} />;
  }),
  dialogEntry("dialog-visitor-peace", "Dialog: visitor under Peace Treaty", () => scenarios.visitorDecision({ peace: true }), (scenario, log) => {
      const { plotId, canAttack } = pendingOf(scenario, "visitorChoice");
      return <VisitorChoiceDialog ownerName="Bob" plotId={plotId} fee={feeOf(scenario.game, plotId)} canAttack={canAttack} attackEnabled={canAttack && createCanRun(scenario.game, scenario.viewerId)("attack")} onPay={() => log("Pay")} onAttack={() => log("Attack")} />;
    }),
  dialogEntry("dialog-owner", "Dialog: owner collects or attacks", () => scenarios.ownerDecision("1"), (scenario, log) => {
      const { plotId, canAttack } = pendingOf(scenario, "ownerChoice");
      return <OwnerChoiceDialog visitorName="Alice" plotId={plotId} fee={feeOf(scenario.game, plotId)} canAttack={canAttack} attackEnabled={canAttack && createCanRun(scenario.game, scenario.viewerId)("attack")} onCollect={() => log("Collect")} onAttack={() => log("Attack")} />;
    }),
  dialogEntry("dialog-waiting", "Dialog: waiting for the owner", () => scenarios.ownerDecision("0"), () => <WaitingDialog ownerName="Bob" />),
  dialogEntry("dialog-lucky-die", "Dialog: Lucky Die", scenarios.luckyDieChoice, (scenario, log) => (
    <LuckyDieDialog value={scenario.game.turn.dice?.value ?? 1} bonus={scenario.game.turn.dice?.bonus ?? 0} onReroll={() => log("Reroll")} onMove={() => log("Move")} />
  )),
  dialogEntry("dialog-end-turn", "Dialog: end of turn", scenarios.canEndTurn, (_, log) => (
    <EndTurnDialog onNo={() => log("No")} onYes={() => log("Yes")} />
  )),
  dialogEntry("dialog-own-plot", "Dialog: your plot", scenarios.ownPlot, (scenario, log) => (
    <OwnPlotDialog plotId={scenario.game.turn.manageablePlotId ?? 0} onManage={() => log("Manage")} onDone={() => log("Done")} />
  )),
  dialogEntry("dialog-notice", "Dialog: fee received", scenarios.feeCollected, (scenario, log) => {
    const entry = scenario.game.log.find((candidate) => candidate.type === "feePaid");
    const notification = entry ? getNotification(entry, scenario.game, scenario.viewerId) : null;
    return notification ? <NoticeDialog title={notification.title} text={notification.text} onDone={() => log("Done")} /> : null;
  }),
  cardsEntry("cards-pick", "Cards: pick one of three", {}),
  cardsEntry("cards-confirm", "Cards: are you sure?", { confirm: true }),
  cardsEntry("cards-congrats", "Cards: congratulation", { congrats: true }),
  stationEntry("station-plots", "Station: plots", "plots"),
  stationEntry("station-residents", "Station: residents and recruits", "residents"),
  stationEntry("station-shop", "Station: shop", "shop"),
  stationEntry("station-confirm", "Station: confirm an upgrade", "plots", { name: "upgradePlot", plotId: 5 }),
  {
    id: "manage-plot",
    group: "Game",
    title: "Manage: the plot you landed on",
    render: (log) => {
      const scenario = scenarios.ownPlot();
      return frame(scenario, "Plot 5", stationContent(scenario, { kind: "plot", plotId: 5 }, log), log);
    }
  },
  {
    id: "activity-line",
    group: "Game",
    title: "Activity line",
    render: () => (
      <div className="gallery-stack">
        {activityTexts().map((text) => (
          <ActivityLine key={text} text={text} />
        ))}
        <ActivityLine text={null} />
      </div>
    )
  },
  {
    id: "result-placeholder",
    group: "Game",
    title: "Result placeholder (host)",
    render: (log) => {
      const { game } = scenarios.finished();
      return (
        <ResultPlaceholderView
          winnerName={game.winnerId ? (game.kings[game.winnerId]?.name ?? null) : null}
          ranking={getFinalRanking(game).map((playerId) => ({ playerId, name: game.kings[playerId]?.name ?? "Someone" }))}
          isHost
          onBackToLobby={() => log("backToLobby")}
          onQuit={() => log("quit")}
        />
      );
    }
  },
  ...FIGHT_ENTRIES,
  {
    id: "shell-spectator",
    group: "Shell",
    title: "Shell: spectator on the Map",
    render: (log) => {
      const scenario = scenarios.spectator();
      return frame(scenario, "Map", mapContent(scenario, log), log);
    }
  }
];
