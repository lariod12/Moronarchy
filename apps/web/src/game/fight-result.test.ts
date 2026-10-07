import { describe, expect, it } from "vitest";
import * as scenarios from "../dev/gallery/game-fixtures";
import { describeFightResult, fightNoticeText } from "./fight-result";

describe("describeFightResult", () => {
  it("celebrates the attacker who beat the garrison: loot and dead residents", () => {
    const { game, viewerId } = scenarios.fightWon();
    const model = describeFightResult(game, viewerId);
    expect(model?.role).toBe("attacker");
    expect(model?.title).toBe("Victory!");
    expect(model?.lines[0]).toBe("Winner: You");
    expect(model?.lines).toContain(`You looted ${game.lastFight?.loot} coin`);
    expect(model?.lines).toContain(`${game.lastFight?.residentsKilled} residents were killed`);
    expect(game.lastFight?.residentsKilled).toBeGreaterThan(0);
    expect(game.lastFight?.loot).toBeGreaterThan(0);
  });

  it("tells the owner who won, without Victory or Defeat", () => {
    const { game } = scenarios.fightWon();
    const model = describeFightResult(game, "1");
    expect(model?.role).toBe("owner");
    expect(model?.title).toBe("Fight over");
    expect(model?.lines[0]).toBe("Winner: Alice");
    expect(model?.lines.some((line) => line.includes("looted") && line.endsWith("from you"))).toBe(true);
  });

  it("says Defeat and who paid whom when the attacker loses", () => {
    const { game, viewerId } = scenarios.fightLost();
    const model = describeFightResult(game, viewerId);
    expect(model?.title).toBe("Defeat");
    expect(model?.lines[0]).toBe("Winner: The residents");
    expect(model?.lines).toContain(`You paid ${game.lastFight?.feePaid} coin to Bob`);
    expect(describeFightResult(game, "1")?.lines).toContain(`Alice paid you ${game.lastFight?.feePaid} coin`);
  });

  it("reports a destroyed plot, also to the owner who just lost it", () => {
    const { game } = scenarios.fightDestroyed();
    expect(game.lastFight?.plotOutcome).toBe("destroyed");
    expect(describeFightResult(game, "0")?.lines).toContain("Plot 5 was destroyed");
    const owner = describeFightResult(game, "1");
    expect(owner?.role).toBe("owner");
    expect(owner?.lines).toContain("Plot 5 was destroyed");
  });

  it("notes a retreat", () => {
    const { game } = scenarios.fightRetreated();
    const model = describeFightResult(game, "0");
    expect(model?.title).toBe("Defeat");
    expect(model?.lines).toContain("You retreated. It counts as a loss.");
    expect(describeFightResult(game, "1")?.lines).toContain("Alice retreated. It counts as a loss.");
  });

  it("is null for people who had nothing to do with the fight, unless they watched it", () => {
    const { game } = scenarios.fightWon();
    expect(describeFightResult(game, "2")).toBeNull();
    expect(describeFightResult(game, "2", true)).toMatchObject({ role: "spectator", title: "Fight over" });
    expect(describeFightResult(game, "2", true)?.lines[0]).toBe("Winner: Alice");
    // Being involved wins over watching.
    expect(describeFightResult(game, "0", true)?.role).toBe("attacker");
    expect(describeFightResult(scenarios.mapStart().game, "0")).toBeNull();
  });
});

describe("fightNoticeText", () => {
  it("words the notice for a bystander and for the owner", () => {
    const { game } = scenarios.fightStartedElsewhere();
    expect(fightNoticeText(game, "2", "0", 5, "1")).toBe("Alice is attacking Plot 5 (Bob)");
    expect(fightNoticeText(game, "1", "0", 5, "1")).toBe("Alice is attacking your Plot 5!");
  });
});
