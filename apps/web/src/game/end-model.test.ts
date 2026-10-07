import { describe, expect, it } from "vitest";
import * as scenarios from "../dev/gallery/game-fixtures";
import { getEndFace, getLoseFace, getWinFace, toRankingRows } from "./end-model";

const none = new Set<string>();

describe("end faces", () => {
  it("gives a king who just went bankrupt the Lose face with the round, once", () => {
    const { game, viewerId } = scenarios.justEliminated();
    const face = getLoseFace(game, viewerId, 0, none);
    expect(face).toMatchObject({ kind: "lose", round: 3, reason: "bankrupt" });
    expect(face?.key).toMatch(/^lose:\d+$/);
    expect(getLoseFace(game, viewerId, 0, new Set([face?.key ?? ""]))).toBeNull();
  });

  it("gives nobody else a Lose face, and nobody a face while they are alive", () => {
    const { game } = scenarios.justEliminated();
    expect(getLoseFace(game, "0", 0, none)).toBeNull();
    expect(getLoseFace(game, "2", 0, none)).toBeNull();
    expect(getWinFace(game, "0", 0, none)).toBeNull();
  });

  it("does not replay a face that happened before the tab joined (seen seq caught up)", () => {
    const { game, viewerId } = scenarios.justEliminated();
    const newest = game.log[game.log.length - 1]?.seq ?? 0;
    expect(getLoseFace(game, viewerId, newest, none)).toBeNull();
  });

  it("at the finish: Win for the winner, Lose for the king of the finishing move, nothing for a bystander", () => {
    const { game } = scenarios.finished();
    expect(getEndFace(game, "0", 0, none)).toMatchObject({ kind: "win", round: null });
    expect(getEndFace(game, "1", 0, none)).toMatchObject({ kind: "lose", round: 2 });
    // Cara went out earlier and already pressed Keep watching:
    const caraKey = getLoseFace(game, "2", 0, none)?.key ?? "";
    expect(getEndFace(game, "2", 0, new Set([caraKey]))).toBeNull();
    expect(getEndFace(game, "0", 0, new Set([getWinFace(game, "0", 0, none)?.key ?? ""]))).toBeNull();
  });

  it("gives the winner no Win face while the game is still on", () => {
    const { game } = scenarios.justEliminated();
    expect(getWinFace(game, "0", 0, none)).toBeNull();
  });
});

describe("toRankingRows", () => {
  it("lists the winner first, then the kings in reverse order of elimination, with their round", () => {
    const { game } = scenarios.finishedBig("2");
    expect(toRankingRows(game, "2")).toEqual([
      { playerId: "0", name: "Alice", isSelf: false, rank: 1, outRound: null, outReason: null },
      { playerId: "1", name: "Bob", isSelf: false, rank: 2, outRound: 7, outReason: "bankrupt" },
      { playerId: "2", name: "Cara", isSelf: true, rank: 3, outRound: 6, outReason: "bankrupt" },
      { playerId: "3", name: "Dan", isSelf: false, rank: 4, outRound: 5, outReason: "bankrupt" },
      { playerId: "4", name: "Eve", isSelf: false, rank: 5, outRound: 4, outReason: "bankrupt" },
      { playerId: "5", name: "Finn", isSelf: false, rank: 6, outRound: 3, outReason: "bankrupt" }
    ]);
  });
});

describe("leaving the game (disconnected)", () => {
  it("gives a removed king the Lose face with the reason left, once", () => {
    const { game, viewerId } = scenarios.justRemoved();
    const face = getLoseFace(game, viewerId, 0, none);
    expect(face).toMatchObject({ kind: "lose", round: 2, reason: "left" });
    expect(getLoseFace(game, viewerId, 0, new Set([face?.key ?? ""]))).toBeNull();
    const newest = game.log[game.log.length - 1]?.seq ?? 0;
    expect(getLoseFace(game, viewerId, newest, none)).toBeNull();
    expect(getLoseFace(game, "0", 0, none)).toBeNull();
  });

  it("ranks a king who left next to the bankrupt ones and tells them apart", () => {
    const { game } = scenarios.finishedWithLeaver("0");
    expect(toRankingRows(game, "0")).toEqual([
      { playerId: "0", name: "Alice", isSelf: true, rank: 1, outRound: null, outReason: null },
      { playerId: "2", name: "Cara", isSelf: false, rank: 2, outRound: 3, outReason: "left" },
      { playerId: "1", name: "Bob", isSelf: false, rank: 3, outRound: 2, outReason: "bankrupt" }
    ]);
    expect(getEndFace(game, "0", 0, none)).toMatchObject({ kind: "win" });
    expect(getEndFace(game, "2", 0, none)).toMatchObject({ kind: "lose", round: 3, reason: "left" });
  });
});
