import { describe, expect, it } from "vitest";
import { sanitizeChatText } from "./lobby-chat.js";

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
