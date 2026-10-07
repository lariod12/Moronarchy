import { act, render } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";
import { attack, claimTurn, fightRoll, rollDice } from "@moronarchy/core/engine";
import { createMatchState, HIDDEN_ROLL, setReady, sit } from "@moronarchy/core/match";
import type { MatchState } from "@moronarchy/core/match";
import { createScriptedRng, createSeededRng, createTestGame, givePlot, placeKing } from "@moronarchy/core/testing";
import { useMatch } from "../match/MatchProvider";
import type { MatchContextValue } from "../match/MatchProvider";
import { LocalMatchProvider, useSolo } from "./LocalMatchProvider";
import type { SoloValue } from "./LocalMatchProvider";
import { createSoloMatch, startSoloGame } from "./solo-match";
import { loadSolo, SOLO_STORAGE_KEY } from "./solo-settings";

const settings = { name: "Aria", bots: 2, style: "careful", speed: "fast" } as const;

interface Captured {
  match: MatchContextValue;
  solo: SoloValue;
}

const mount = (initial: MatchState) => {
  const captured = {} as Captured;
  const Probe = () => {
    captured.match = useMatch();
    captured.solo = useSolo();
    return null;
  };
  const view = render(
    <MemoryRouter>
      <LocalMatchProvider settings={settings} match={initial}>
        <Probe />
      </LocalMatchProvider>
    </MemoryRouter>
  );
  return { captured, view };
};

const playingMatch = (humanFirst: boolean): MatchState => {
  for (let seed = 1; seed < 300; seed += 1) {
    const match = createSoloMatch(settings);
    startSoloGame(match, createSeededRng(seed));
    if ((match.game?.turn.playerId === "0") === humanFirst) {
      return match;
    }
  }
  throw new Error("No seed found");
};

beforeEach(() => {
  localStorage.clear();
});

describe("LocalMatchProvider", () => {
  it("provides the match context of seat 0 in room SOLO, everyone connected", () => {
    const { captured } = mount(playingMatch(true));
    const { match } = captured;
    expect(match.playerID).toBe("0");
    expect(match.matchID).toBe("SOLO");
    expect(match.roomCode).toBe("SOLO");
    expect(match.selfConnected).toBe(true);
    expect(match.kicked).toBe(false);
    expect(match.leaveTo).toBe("/solo");
    expect(match.players.map((player) => [player.id, player.name, player.isConnected])).toEqual([
      ["0", "Aria", true],
      ["1", "Bot 1", true],
      ["2", "Bot 2", true]
    ]);
  });

  it("starts a lobby match by itself, so the room screen sees lobby to playing", () => {
    const { captured } = mount(createSoloMatch(settings));
    expect(captured.match.state?.stage).toBe("playing");
    expect(captured.match.state?.game?.round).toBe(1);
    expect(loadSolo().match?.stage).toBe("playing");
  });

  it("commits a valid move and saves the match", () => {
    const { captured } = mount(playingMatch(true));
    act(() => captured.match.send("claimTurn"));
    expect(captured.match.state?.game?.turn.step).toBe("preRoll");
    expect(loadSolo().match?.game?.turn.step).toBe("preRoll");
  });

  it("ignores an invalid move without changing anything", () => {
    const { captured } = mount(playingMatch(true));
    const before = captured.match.state;
    act(() => captured.match.send("rollDice"));
    act(() => captured.match.send("noSuchMove"));
    expect(captured.match.state).toBe(before);
  });

  it("never lets the human move for a bot", () => {
    const { captured } = mount(playingMatch(false));
    const before = captured.match.state;
    act(() => captured.match.send("claimTurn"));
    expect(captured.match.state).toBe(before);
  });

  it("lets a bot act through commitBot", () => {
    const initial = playingMatch(false);
    const botId = initial.game?.turn.playerId ?? "";
    const { captured } = mount(initial);
    act(() => captured.solo.commitBot(botId));
    expect(captured.match.state?.game?.turn.step).toBe("preRoll");
  });

  it("hides a bot fight roll from the human view but not from the bots", () => {
    const game = createTestGame(2);
    givePlot(game, "1", 5, 0);
    placeKing(game, "1", 5);
    placeKing(game, "0", 4);
    const rng = createScriptedRng({ d6: [1, 6, 5] });
    claimTurn(game, "0", rng);
    rollDice(game, "0", rng);
    attack(game, "1", rng);
    fightRoll(game, "1", rng);
    const match = createMatchState();
    sit(match, "0", "Aria");
    sit(match, "1", "Bot 1");
    setReady(match, "1", true);
    match.stage = "playing";
    match.game = game;
    const { captured } = mount(match);
    expect(captured.solo.match.game?.fight?.pendingRolls["1"]).toBeGreaterThan(0);
    expect(captured.match.state?.game?.fight?.pendingRolls["1"]).toBe(HIDDEN_ROLL);
  });

  it("restarts after Play Again with a new gamesPlayed and a fresh game", () => {
    const initial = playingMatch(true);
    const game = initial.game;
    if (!game) {
      throw new Error("no game");
    }
    game.phase = "finished";
    initial.stage = "finished";
    const { captured } = mount(initial);
    act(() => captured.match.send("returnToLobby"));
    expect(captured.match.state?.stage).toBe("playing");
    expect(captured.match.state?.gamesPlayed).toBe(initial.gamesPlayed + 1);
    expect(captured.match.state?.game?.phase).toBe("playing");
    expect(captured.match.state?.game?.round).toBe(1);
  });

  it("forgets the saved match on Quit and keeps the settings", () => {
    const { captured } = mount(playingMatch(true));
    act(() => captured.match.send("leaveSeat"));
    expect(loadSolo().match).toBeNull();
    expect(loadSolo().settings).toEqual(settings);
    act(() => captured.match.send("claimTurn"));
    expect(JSON.parse(localStorage.getItem(SOLO_STORAGE_KEY) ?? "{}").match).toBeNull();
  });

  it("saves a speed change in the settings", () => {
    const { captured } = mount(playingMatch(true));
    act(() => captured.solo.setSpeed("slow"));
    expect(captured.solo.settings.speed).toBe("slow");
    expect(loadSolo().settings.speed).toBe("slow");
    expect(loadSolo().match).not.toBeNull();
  });
});
