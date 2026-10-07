import { describe, expect, it } from "vitest";
import { createSeededRng } from "@moronarchy/core/testing";
import { createBrowserRandom } from "./browser-rng";
import { applyBotStep, applyHumanMove, createSoloMatch, getBotIds, getBotStyle, getWaitingBotId, startSoloGame } from "./solo-match";

const settings = { name: "Aria", bots: 3, style: "mixed", speed: "normal" } as const;

const startedMatch = (seed: number, predicate: (turnPlayer: string) => boolean = () => true) => {
  for (let offset = 0; offset < 200; offset += 1) {
    const match = createSoloMatch(settings);
    expect(startSoloGame(match, createSeededRng(seed + offset)).ok).toBe(true);
    if (predicate(match.game?.turn.playerId ?? "")) {
      return match;
    }
  }
  throw new Error("No seed gives the wanted first player");
};

describe("createSoloMatch", () => {
  it("seats the human as host in seat 0 and the bots as Bot 1..N, all bots ready", () => {
    const match = createSoloMatch(settings);
    expect(match.stage).toBe("lobby");
    expect(match.hostId).toBe("0");
    expect(match.seats.map((seat) => [seat.playerId, seat.name])).toEqual([
      ["0", "Aria"],
      ["1", "Bot 1"],
      ["2", "Bot 2"],
      ["3", "Bot 3"]
    ]);
    expect(match.seats.filter((seat) => seat.playerId !== "0").every((seat) => seat.ready)).toBe(true);
    expect(getBotIds(match)).toEqual(["1", "2", "3"]);
  });

  it("gives every new game its own gamesPlayed so remembered popups do not carry over", () => {
    const first = createSoloMatch(settings);
    first.gamesPlayed -= 1;
    expect(createSoloMatch(settings).gamesPlayed).toBeGreaterThan(first.gamesPlayed);
  });
});

describe("getBotStyle", () => {
  it("uses the chosen style, and alternates for Mixed", () => {
    expect(getBotStyle("careful", "2")).toBe("careful");
    expect(getBotStyle("aggressive", "1")).toBe("aggressive");
    expect([1, 2, 3, 4, 5].map((id) => getBotStyle("mixed", String(id)))).toEqual(["careful", "aggressive", "careful", "aggressive", "careful"]);
  });
});

describe("applyHumanMove", () => {
  it("runs a valid move on a copy and refuses invalid ones", () => {
    const match = startedMatch(3, (id) => id === "0");
    const before = JSON.stringify(match);
    expect(applyHumanMove(match, "rollDice", [], createBrowserRandom())).toBeNull();
    expect(applyHumanMove(match, "doesNotExist", [], createBrowserRandom())).toBeNull();
    const next = applyHumanMove(match, "claimTurn", [], createBrowserRandom());
    expect(next?.game?.turn.step).toBe("preRoll");
    expect(JSON.stringify(match)).toBe(before);
  });
});

describe("applyBotStep and getWaitingBotId", () => {
  it("lets a bot act only when the game waits on it", () => {
    const humanFirst = startedMatch(5, (id) => id === "0");
    expect(getWaitingBotId(humanFirst)).toBeUndefined();
    expect(applyBotStep(humanFirst, "1", "careful", createSeededRng(1))).toBeNull();

    const botFirst = startedMatch(5, (id) => id !== "0");
    const botId = botFirst.game?.turn.playerId ?? "";
    expect(getWaitingBotId(botFirst)).toBe(botId);
    const next = applyBotStep(botFirst, botId, "careful", createSeededRng(1));
    expect(next?.game?.turn.step).toBe("preRoll");
  });
});
