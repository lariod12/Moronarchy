import { describe, expect, it } from "vitest";
import { sanitizePlayerName } from "./security.js";

describe("server lobby security", () => {
  it("trims, collapses spaces, removes control characters, and caps player names", () => {
    expect(sanitizePlayerName("  King\u0000   VeryVeryVeryLongName  ")).toBe("King VeryVeryVeryL");
  });

  it("rejects non-string names as empty", () => {
    expect(sanitizePlayerName(null)).toBe("");
  });
});
