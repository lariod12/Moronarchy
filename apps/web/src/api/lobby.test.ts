import { describe, expect, it } from "vitest";
import { sanitizePlayerName } from "./lobby";

describe("lobby client helpers", () => {
  it("sanitizes player names before sending them to the lobby API", () => {
    expect(sanitizePlayerName("  Bob\u0007   The King With A Very Long Name ")).toBe("Bob The King With");
  });

  it("falls back to King when the name is blank", () => {
    expect(sanitizePlayerName("   ")).toBe("King");
  });
});
