import { describe, expect, it } from "vitest";
import * as scenarios from "../dev/gallery/game-fixtures";
import { getForcedPage, getPageName } from "./forced-route";

describe("getForcedPage", () => {
  it("forces the card pick, then the station, for the turn player only", () => {
    const pick = scenarios.cardPick();
    expect(getForcedPage(pick.game, "0", false)).toBe("cards");
    expect(getForcedPage(pick.game, "1", false)).toBeNull();
    const station = scenarios.station();
    expect(getForcedPage(station.game, "0", false)).toBe("station");
  });

  it("forces nothing while the king walks or outside Start", () => {
    const pick = scenarios.cardPick();
    expect(getForcedPage(pick.game, "0", true)).toBeNull();
    expect(getForcedPage(scenarios.mapStart().game, "0", false)).toBeNull();
    expect(getForcedPage(scenarios.buyDecision().game, "0", false)).toBeNull();
  });

  it("forces nothing once the match is over", () => {
    expect(getForcedPage(scenarios.finished().game, "0", false)).toBeNull();
  });
});

describe("getPageName", () => {
  it("reads the page under the room", () => {
    expect(getPageName("/room/R001/map")).toBe("map");
    expect(getPageName("/room/R001/manage/12")).toBe("manage");
    expect(getPageName("/room/R001")).toBe("home");
    expect(getPageName("/room/R001/")).toBe("home");
  });
});

describe("getForcedPage during a fight", () => {
  it("forces both kings of a duel to the fight page, but not a bystander", () => {
    const { game } = scenarios.fightKingMid();
    expect(getForcedPage(game, "1", false)).toBe("fight");
    expect(getForcedPage(game, "0", false)).toBe("fight");
    expect(getForcedPage(game, "2", false)).toBeNull();
  });

  it("forces the visitor but not the absent owner of a siege", () => {
    const { game } = scenarios.fightStartedElsewhere();
    expect(getForcedPage(game, "0", false)).toBe("fight");
    expect(getForcedPage(game, "1", false)).toBeNull();
  });

  it("waits for the walk to finish and lets go once the fight is over", () => {
    expect(getForcedPage(scenarios.fightKingMid().game, "1", true)).toBeNull();
    expect(getForcedPage(scenarios.fightWon().game, "0", false)).toBeNull();
  });
});
