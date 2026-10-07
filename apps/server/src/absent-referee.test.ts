import { afterEach, describe, expect, it, vi } from "vitest";
import { createMatchState, setReady, sit, startGame } from "@moronarchy/core/match";
import type { MatchState } from "@moronarchy/core/match";
import { createSeededRng } from "@moronarchy/core/testing";
import { startAbsentReferee } from "./absent-referee.js";
import type { AbsentReferee } from "./absent-referee.js";
import { createPresenceTracker } from "./presence.js";

const playingMatch = (): MatchState => {
  const match = createMatchState();
  sit(match, "0", "Ann");
  sit(match, "1", "Bob");
  sit(match, "2", "Cy");
  setReady(match, "1", true);
  setReady(match, "2", true);
  startGame(match, "0", createSeededRng(7));
  return match;
};

const NAMES: Record<string, string> = { "0": "Ann", "1": "Bob", "2": "Cy" };

interface Rig {
  match: MatchState;
  time: { now: number };
  forfeit: ReturnType<typeof vi.fn>;
  referee: AbsentReferee;
  setPlayers: (players: Record<string, boolean | undefined>) => void;
  turnPlayer: () => string;
  bystander: () => string;
}

const referees: AbsentReferee[] = [];

const rig = (options: { timeoutMs?: number; isSocketConnected?: (matchID: string, playerID: string) => boolean } = {}): Rig => {
  const match = playingMatch();
  const time = { now: 10_000 };
  const presence = createPresenceTracker(() => time.now);
  const forfeit = vi.fn(async (_matchID: string, _playerID: string, _credentials: string) => undefined);
  const referee = startAbsentReferee({
    db: {
      fetch: async () => ({
        state: { G: match },
        metadata: { players: { "0": { credentials: "c0" }, "1": { credentials: "c1" }, "2": { credentials: "c2" } } }
      })
    },
    presence,
    timeoutMs: options.timeoutMs ?? 30_000,
    intervalMs: 3_600_000,
    now: () => time.now,
    forfeit,
    ...(options.isSocketConnected ? { isSocketConnected: options.isSocketConnected } : {})
  });
  referees.push(referee);
  const setPlayers = (players: Record<string, boolean | undefined>): void => {
    presence.update(
      "m1",
      Object.fromEntries(Object.entries(players).map(([id, isConnected]) => [id, { name: NAMES[id], isConnected }]))
    );
  };
  const turnPlayer = (): string => match.game?.turn.playerId ?? "";
  return {
    match,
    time,
    forfeit,
    referee,
    setPlayers,
    turnPlayer,
    bystander: () => ["0", "1", "2"].find((id) => id !== turnPlayer()) as string
  };
};

afterEach(() => {
  for (const referee of referees.splice(0)) {
    referee.stop();
  }
});

describe("absent referee", () => {
  it("removes a disconnected turn player after the timeout, with their stored credentials", async () => {
    const r = rig();
    const absent = r.turnPlayer();
    r.setPlayers({ "0": true, "1": true, "2": true });
    r.setPlayers({ [absent]: false });
    await r.referee.check();
    expect(r.forfeit).not.toHaveBeenCalled();
    r.time.now += 29_999;
    await r.referee.check();
    expect(r.forfeit).not.toHaveBeenCalled();
    r.time.now += 1;
    await r.referee.check();
    expect(r.forfeit).toHaveBeenCalledTimes(1);
    expect(r.forfeit).toHaveBeenCalledWith("m1", absent, `c${absent}`);
  });

  it("uses the configured timeout", async () => {
    const r = rig({ timeoutMs: 400 });
    const absent = r.turnPlayer();
    r.setPlayers({ "0": true, "1": true, "2": true });
    r.setPlayers({ [absent]: false });
    await r.referee.check();
    r.time.now += 399;
    await r.referee.check();
    expect(r.forfeit).not.toHaveBeenCalled();
    r.time.now += 1;
    await r.referee.check();
    expect(r.forfeit).toHaveBeenCalledTimes(1);
  });

  it("leaves a player alone whom the game is not waiting on", async () => {
    const r = rig();
    r.setPlayers({ "0": true, "1": true, "2": true });
    r.setPlayers({ [r.bystander()]: false });
    await r.referee.check();
    r.time.now += 120_000;
    await r.referee.check();
    expect(r.forfeit).not.toHaveBeenCalled();
  });

  it("starts the clock when the game starts waiting on the absent player, not before", async () => {
    const r = rig();
    const absent = r.bystander();
    r.setPlayers({ "0": true, "1": true, "2": true });
    r.setPlayers({ [absent]: false });
    await r.referee.check();
    r.time.now += 100_000;
    await r.referee.check();
    expect(r.forfeit).not.toHaveBeenCalled();
    // The turn reaches the absent player.
    (r.match.game as NonNullable<MatchState["game"]>).turn.playerId = absent;
    await r.referee.check();
    r.time.now += 29_000;
    await r.referee.check();
    expect(r.forfeit).not.toHaveBeenCalled();
    r.time.now += 1_000;
    await r.referee.check();
    expect(r.forfeit).toHaveBeenCalledTimes(1);
    expect(r.forfeit).toHaveBeenCalledWith("m1", absent, `c${absent}`);
  });

  it("waits again from zero when the player reconnects in time and drops out later", async () => {
    const r = rig();
    const absent = r.turnPlayer();
    r.setPlayers({ "0": true, "1": true, "2": true });
    r.setPlayers({ [absent]: false });
    await r.referee.check();
    r.time.now += 20_000;
    await r.referee.check();
    r.setPlayers({ [absent]: true });
    await r.referee.check();
    r.time.now += 60_000;
    await r.referee.check();
    expect(r.forfeit).not.toHaveBeenCalled();
    r.setPlayers({ [absent]: false });
    await r.referee.check();
    r.time.now += 29_000;
    await r.referee.check();
    expect(r.forfeit).not.toHaveBeenCalled();
    r.time.now += 1_000;
    await r.referee.check();
    expect(r.forfeit).toHaveBeenCalledTimes(1);
  });

  it("never removes anyone in the lobby or after the game", async () => {
    const r = rig();
    const absent = r.turnPlayer();
    r.setPlayers({ "0": true, "1": true, "2": true });
    r.setPlayers({ [absent]: false });
    r.match.stage = "finished";
    await r.referee.check();
    r.time.now += 120_000;
    await r.referee.check();
    r.match.stage = "lobby";
    await r.referee.check();
    r.time.now += 120_000;
    await r.referee.check();
    expect(r.forfeit).not.toHaveBeenCalled();
  });

  it("skips a player who still has a live socket", async () => {
    const live = new Set<string>();
    const r = rig({ isSocketConnected: (matchID, playerID) => live.has(`${matchID}:${playerID}`) });
    const absent = r.turnPlayer();
    live.add(`m1:${absent}`);
    r.setPlayers({ "0": true, "1": true, "2": true });
    r.setPlayers({ [absent]: false });
    await r.referee.check();
    r.time.now += 120_000;
    await r.referee.check();
    expect(r.forfeit).not.toHaveBeenCalled();
    live.clear();
    await r.referee.check();
    r.time.now += 30_000;
    await r.referee.check();
    expect(r.forfeit).toHaveBeenCalledTimes(1);
  });

  it("sends one forfeit at a time per player and retries a failed one later", async () => {
    const r = rig({ timeoutMs: 1000 });
    const absent = r.turnPlayer();
    let release: () => void = () => undefined;
    r.forfeit.mockImplementationOnce(() => new Promise<undefined>((resolve) => (release = () => resolve(undefined))));
    r.setPlayers({ "0": true, "1": true, "2": true });
    r.setPlayers({ [absent]: false });
    await r.referee.check();
    r.time.now += 1000;
    await r.referee.check();
    await r.referee.check();
    expect(r.forfeit).toHaveBeenCalledTimes(1);
    release();
    await Promise.resolve();
    await Promise.resolve();
    // It finished but the player is still in the game (it failed): not retried at once, retried after a pause.
    await r.referee.check();
    expect(r.forfeit).toHaveBeenCalledTimes(1);
    r.time.now += 5000;
    await r.referee.check();
    expect(r.forfeit).toHaveBeenCalledTimes(2);
  });

  it("reports errors instead of throwing", async () => {
    const onError = vi.fn();
    const presence = createPresenceTracker();
    presence.update("m1", { "0": { name: "Ann", isConnected: true } });
    presence.update("m1", { "0": { name: "Ann", isConnected: false } });
    const referee = startAbsentReferee({
      db: { fetch: async () => Promise.reject(new Error("db down")) },
      presence,
      timeoutMs: 1,
      intervalMs: 3_600_000,
      forfeit: vi.fn(async () => undefined),
      onError
    });
    referees.push(referee);
    await expect(referee.check()).resolves.toBeUndefined();
    expect(onError).toHaveBeenCalledWith(expect.any(Error), "m1", "0");
  });
});
