import { getEliminationInfo } from "@moronarchy/core/engine";
import { toRankingRows } from "../../game/end-model";
import { LoseView } from "../../screens/result/LoseView";
import { RankingView } from "../../screens/result/RankingView";
import { PositionsView } from "../../screens/map/PositionsView";
import { AbsentBanner, ConnectionBanner } from "../../shell/ConnectionBanners/ConnectionBanners";
import { frame, mapContent } from "./game-entries";
import * as scenarios from "./game-fixtures";
import type { GalleryEntry } from "./types";
import "../../screens/result/ResultFace.css";

// Gallery group "Robustness": what the game shows when somebody's connection drops or a player was removed for it.
export const ROBUSTNESS_ENTRIES: GalleryEntry[] = [
  {
    id: "banner-reconnecting",
    group: "Robustness",
    title: "Banner: this client is reconnecting",
    render: (log) => {
      const scenario = scenarios.waitingForAlice();
      return frame(scenario, "Map", mapContent(scenario, log), log, undefined, <ConnectionBanner connected={false} />);
    }
  },
  {
    id: "banner-absent",
    group: "Robustness",
    title: "Banner: the game waits on a disconnected king",
    render: (log) => {
      const scenario = scenarios.waitingForAlice();
      return frame(
        scenario,
        "Map",
        mapContent(scenario, log, false, new Set(["0"])),
        log,
        undefined,
        <AbsentBanner status={{ kind: "absent", playerId: "0", secondsLeft: 25 }} name="Alice" />
      );
    }
  },
  {
    id: "map-offline-token",
    group: "Robustness",
    title: "Map: an offline king's token is dimmed",
    render: (log) => {
      const scenario = scenarios.mapMidgame();
      return frame(scenario, "Map", mapContent(scenario, log, false, new Set(["2"])), log);
    }
  },
  {
    id: "positions-offline",
    group: "Robustness",
    title: "Map: Positions tab with an offline king",
    render: (log) => {
      const scenario = scenarios.mapMidgame();
      return frame(scenario, "Map", <PositionsView game={scenario.game} viewerId={scenario.viewerId} offlineIds={new Set(["1"])} />, log);
    }
  },
  {
    id: "ranking-left",
    group: "Robustness",
    title: "Ranking: one king left, one went bankrupt",
    render: (log) => {
      const { game, viewerId } = scenarios.finishedWithLeaver("0");
      return <RankingView rows={toRankingRows(game, viewerId)} isHost onPlayAgain={() => log("playAgain")} onQuit={() => log("quit")} />;
    }
  },
  {
    id: "lose-left",
    group: "Robustness",
    title: "Lose face: removed after disconnecting",
    render: (log) => {
      const scenario = scenarios.justRemoved();
      const { round, reason } = getEliminationInfo(scenario.game, scenario.viewerId);
      return frame(
        scenario,
        "Map",
        mapContent(scenario, log),
        log,
        <div className="result-overlay">
          <LoseView round={round} reason={reason} continueLabel="Keep watching" onContinue={() => log("keepWatching")} onLeave={() => log("leaveRoom")} />
        </div>
      );
    }
  }
];
