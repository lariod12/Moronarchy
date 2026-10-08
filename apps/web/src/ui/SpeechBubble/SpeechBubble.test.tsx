import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SpeechBubble } from "./SpeechBubble";

describe("SpeechBubble", () => {
  it("renders the text with the tail class for the chosen edge", () => {
    render(<SpeechBubble tail="bottom-center">hello</SpeechBubble>);
    const bubble = screen.getByText("hello");
    expect(bubble).toHaveClass("ui-bubble", "ui-bubble--bottom-center");
    expect(bubble.style.getPropertyValue("--ui-bubble-tail-inset")).toBe("");
  });

  it("moves the tail along its edge with tailInset", () => {
    render(
      <SpeechBubble tail="bottom-left" tailInset={6}>
        4
      </SpeechBubble>
    );
    expect(screen.getByText("4").style.getPropertyValue("--ui-bubble-tail-inset")).toBe("6px");
  });

  it("passes a role and extra class through", () => {
    render(
      <SpeechBubble tail="right" role="status" className="extra">
        hint
      </SpeechBubble>
    );
    expect(screen.getByRole("status")).toHaveClass("ui-bubble--right", "extra");
  });
});
