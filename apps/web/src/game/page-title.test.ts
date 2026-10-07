import { describe, expect, it } from "vitest";
import { getPageTitle } from "./page-title";

describe("getPageTitle", () => {
  it.each([
    ["/room/R001", "Home"],
    ["/room/R001/home", "Home"],
    ["/room/R001/map", "Map"],
    ["/room/R001/cards", "Upgrade Card"],
    ["/room/R001/station", "Start Station"],
    ["/room/R001/fight", "Fight"],
    ["/room/R001/manage/12", "Plot 12"],
    ["/room/R001/stats/1", "Players Info"],
    ["/room/R001/plots", "Plots"],
    ["/room/R001/plots/7", "Plot 7"],
    ["/room/R001/residents", "Residents"],
    ["/room/R001/residents/warrior", "Warrior"],
    ["/room/R001/residents/farmer", "Farmer"],
    ["/room/R001/residents/warrior/r12", "Residents"],
    ["/room/R001/items", "Items"],
    ["/room/R001/items/horse", "Horse"],
    ["/room/R001/items/woodShield", "Wood Shield"],
    ["/room/R001/items/nonsense", "Items"],
    ["/room/R001/events", "Events"]
  ])("%s -> %s", (path, title) => {
    expect(getPageTitle(path)).toBe(title);
  });
});
