import { describe, expect, it } from "vitest";
import { pickStartingPlayerId, sanitizeChatText } from "./lobby-chat.js";

describe("sanitizeChatText", () => {
  it("removes control characters and normalizes whitespace", () => {
    expect(sanitizeChatText("  hello\n\tking\u0000  ")).toBe("hello king");
  });

  it("limits chat text length", () => {
    expect(sanitizeChatText("abcdefghijklmnopqrstuvwxyz", 8)).toBe("abcdefgh");
  });

  it("returns an empty string for non-string values", () => {
    expect(sanitizeChatText(undefined)).toBe("");
  });
});

describe("pickStartingPlayerId", () => {
  it("selects from host and ready players only", () => {
    expect(pickStartingPlayerId({ "1": true, "2": false, "3": true }, () => 0)).toBe("0");
    expect(pickStartingPlayerId({ "1": true, "2": false, "3": true }, () => 0.5)).toBe("1");
    expect(pickStartingPlayerId({ "1": true, "2": false, "3": true }, () => 0.99)).toBe("3");
  });
});
