import { describe, expect, it } from "vitest";
import { createMatchState, runGameCommand, setReady, sit, startGame, syncStage } from "../../src/match";
import type { GameCommandName, MatchResult, MatchState } from "../../src/match";
import { createScriptedRng, createSeededRng, stepBot } from "../../src/testing";

const ok = (result: MatchResult): void => {
  expect(result).toEqual({ ok: true });
};
const fails = (result: MatchResult, error: string): void => {
  expect(result).toEqual({ ok: false, error });
};

const playingMatch = (seed = 11): MatchState => {
  const state = createMatchState();
  ok(sit(state, "0", "Ann"));
  ok(sit(state, "1", "Bob"));
  ok(setReady(state, "1", true));
  ok(startGame(state, "0", createSeededRng(seed)));
  return state;
};

const turnPlayer = (state: MatchState): string => (state.game as NonNullable<MatchState["game"]>).turn.playerId;

describe("runGameCommand", () => {
  it("rejects commands before the game starts", () => {
    const state = createMatchState();
    ok(sit(state, "0", "Ann"));
    fails(runGameCommand(state, "0", createSeededRng(1), "claimTurn", []), "WRONG_STAGE");
  });

  it("rejects bad arguments without mutating state", () => {
    const state = playingMatch();
    const actor = turnPlayer(state);
    const rng = createSeededRng(5);
    const before = JSON.stringify(state);
    const cases: [GameCommandName, unknown[]][] = [
      ["buyItem", ["nope"]],
      ["buyItem", ["__proto__"]],
      ["buyItem", ["constructor"]],
      ["buyItem", []],
      ["useItem", ["__proto__"]],
      ["useItem", [42]],
      ["useItem", ["sickle", { plotId: 1 }]],
      ["useItem", ["sickle", "3"]],
      ["useItem", ["sickle", { plotId: 2.5 }]],
      ["upgradePlot", [1]],
      ["upgradePlot", [41]],
      ["upgradePlot", [2.5]],
      ["upgradePlot", ["3"]],
      ["healPlot", [undefined]],
      ["recruitResident", [3, "dragon"]],
      ["recruitResident", [1, "warrior"]],
      ["upgradeResident", []],
      ["upgradeResident", ["__proto__"]],
      ["healResident", ["missing"]],
      ["healResident", [""]],
      ["pickCard", [1.5]],
      ["pickCard", ["0"]]
    ];
    for (const [name, args] of cases) {
      fails(runGameCommand(state, actor, rng, name, args), "INVALID_ARGUMENT");
    }
    expect(JSON.stringify(state)).toBe(before);
  });

  it("ignores extra arguments and forwards engine errors", () => {
    const state = playingMatch();
    const actor = turnPlayer(state);
    const other = actor === "0" ? "1" : "0";
    const rng = createScriptedRng({ d6: [3] });
    fails(runGameCommand(state, other, rng, "claimTurn", []), "NOT_YOUR_TURN");
    fails(runGameCommand(state, actor, rng, "rollDice", []), "WRONG_STEP");
    ok(runGameCommand(state, actor, rng, "claimTurn", ["ignored", 1, {}]));
  });

  it("runs a valid claimTurn then rollDice flow", () => {
    const state = playingMatch();
    const actor = turnPlayer(state);
    const rng = createScriptedRng({ d6: [4] });
    ok(runGameCommand(state, actor, rng, "claimTurn", []));
    expect(state.game?.turn.step).toBe("preRoll");
    ok(runGameCommand(state, actor, rng, "rollDice", []));
    expect(state.game?.turn.rolled).toBe(true);
    expect(state.game?.turn.dice?.value).toBe(4);
    expect(state.stage).toBe("playing");
  });

  it("moves the match to finished once the engine game is over", () => {
    const state = playingMatch(21);
    const game = state.game as NonNullable<MatchState["game"]>;
    const rng = createSeededRng(21);
    let guard = 0;
    while (game.phase === "playing" && guard < 200000) {
      stepBot(game, rng, "aggressive");
      guard += 1;
    }
    expect(game.phase).toBe("finished");
    expect(state.stage).toBe("playing");
    syncStage(state);
    expect(state.stage).toBe("finished");
    fails(runGameCommand(state, "0", rng, "endTurn", []), "WRONG_STAGE");
  });
});
