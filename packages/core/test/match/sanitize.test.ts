import { describe, expect, it } from "vitest";
import { MAX_CHAT_TEXT_LENGTH, MAX_PLAYER_NAME_LENGTH, sanitizeChatText, sanitizePlayerName } from "../../src/match";

describe("sanitizePlayerName", () => {
  it("trims, collapses spaces, removes control characters, and caps player names", () => {
    expect(sanitizePlayerName("  King\u0000   VeryVeryVeryLongName  ")).toBe("King VeryVeryVeryL");
    expect(sanitizePlayerName("a".repeat(40))).toHaveLength(MAX_PLAYER_NAME_LENGTH);
  });

  it("rejects non-string names as empty", () => {
    expect(sanitizePlayerName(null)).toBe("");
    expect(sanitizePlayerName(42)).toBe("");
    expect(sanitizePlayerName("   ")).toBe("");
  });
});

describe("sanitizeChatText", () => {
  it("replaces control characters with spaces and collapses whitespace", () => {
    expect(sanitizeChatText("  hello\u0000world \n\t again\u007f! ")).toBe("hello world again !");
  });

  it("caps the length", () => {
    expect(sanitizeChatText("x".repeat(500))).toHaveLength(MAX_CHAT_TEXT_LENGTH);
  });

  it("rejects non-string and blank input as empty", () => {
    expect(sanitizeChatText(undefined)).toBe("");
    expect(sanitizeChatText({})).toBe("");
    expect(sanitizeChatText(" \u0001 \n ")).toBe("");
  });
});
