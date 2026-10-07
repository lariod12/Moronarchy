import { describe, expect, it } from "vitest";
import { MANAGE_HINT, getManageHint } from "./hints";

describe("getManageHint", () => {
  it("has no hint when the engine accepts the command", () => {
    expect(getManageHint({ ok: true }, "limit")).toBeNull();
  });

  it("points at the Start station when the step or the turn is wrong", () => {
    for (const error of ["WRONG_STEP", "NOT_ALLOWED", "NOT_YOUR_TURN", "PENDING_DECISION"] as const) {
      expect(getManageHint({ ok: false, error }, "limit")).toBe(MANAGE_HINT);
    }
    expect(MANAGE_HINT).toBe("Upgrade at the Start station or while standing on this plot");
  });

  it("explains coin, limits and spectators", () => {
    expect(getManageHint({ ok: false, error: "INSUFFICIENT_COIN" }, "limit")).toBe("Not enough coin");
    expect(getManageHint({ ok: false, error: "LIMIT_REACHED" }, "Highest level reached")).toBe("Highest level reached");
    expect(getManageHint({ ok: false, error: "NOT_ACTOR" }, "limit")).toBe("You are out of the game");
    expect(getManageHint({ ok: false, error: "GAME_OVER" }, "limit")).toBe("The game is over");
    expect(getManageHint({ ok: false, error: "INVALID_TARGET" }, "limit")).toBe("This is not available right now");
  });
});
