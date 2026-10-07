import { toRankingRows } from "../../game/end-model";
import { getEliminationInfo } from "@moronarchy/core/engine";
import { LoseView } from "../../screens/result/LoseView";
import { RankingView } from "../../screens/result/RankingView";
import { WinView } from "../../screens/result/WinView";
import { frame, mapContent } from "./game-entries";
import * as scenarios from "./game-fixtures";
import type { GameScenario } from "./game-fixtures";
import type { GalleryEntry } from "./types";
import "../../screens/result/ResultFace.css";

const rankingEntry = (id: string, title: string, make: () => GameScenario, isHost: boolean): GalleryEntry => ({
  id,
  group: "End",
  title,
  render: (log) => {
    const { game, viewerId } = make();
    return <RankingView rows={toRankingRows(game, viewerId)} isHost={isHost} onPlayAgain={() => log("playAgain")} onQuit={() => log("quit")} />;
  }
});

const finishedFor = (viewerId: string) => (): GameScenario => ({ ...scenarios.finished(), viewerId });

// The end of the game (wireframes 95 to 99): the Lose face during play, the faces of the finish, the Ranking.
export const END_ENTRIES: GalleryEntry[] = [
  {
    id: "end-lose-midgame",
    group: "End",
    title: "Lose face: knocked out while the game goes on",
    render: (log) => {
      const scenario = scenarios.justEliminated();
      const { round } = getEliminationInfo(scenario.game, scenario.viewerId);
      return frame(
        scenario,
        "Map",
        mapContent(scenario, log),
        log,
        <div className="result-overlay">
          <LoseView round={round} continueLabel="Keep watching" onContinue={() => log("keepWatching")} onLeave={() => log("leaveRoom")} />
        </div>
      );
    }
  },
  {
    id: "end-lose-final",
    group: "End",
    title: "Lose face: knocked out by the finishing move",
    render: (log) => {
      const { game, viewerId } = finishedFor("1")();
      return <LoseView round={getEliminationInfo(game, viewerId).round} continueLabel="See ranking" onContinue={() => log("seeRanking")} onLeave={() => log("leaveRoom")} />;
    }
  },
  {
    id: "end-win",
    group: "End",
    title: "Win face",
    render: (log) => <WinView onContinue={() => log("seeRanking")} />
  },
  rankingEntry("end-ranking-host", "Ranking: host (Play Again enabled)", finishedFor("0"), true),
  rankingEntry("end-ranking-guest", "Ranking: guest (waiting for the host)", finishedFor("1"), false),
  rankingEntry("end-ranking-6-players", "Ranking: six players", () => scenarios.finishedBig("2"), false),
  {
    id: "end-spectator-hud",
    group: "End",
    title: "Spectator on the Map after Keep watching",
    render: (log) => {
      const scenario = scenarios.justEliminated();
      return frame(scenario, "Map", mapContent(scenario, log), log);
    }
  }
];
