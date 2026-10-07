import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BotControlView } from "./BotControl";

const setup = (overrides: Partial<Parameters<typeof BotControlView>[0]> = {}) => {
  const handlers = { onToggle: vi.fn(), onSpeedChange: vi.fn(), onPauseChange: vi.fn(), onNewGame: vi.fn() };
  render(<BotControlView speed="normal" paused={false} expanded {...handlers} {...overrides} />);
  return handlers;
};

describe("BotControlView", () => {
  it("shows only the chip while collapsed", () => {
    setup({ expanded: false });
    expect(screen.getByRole("button", { name: "Bots" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("button", { name: "Pause" })).not.toBeInTheDocument();
  });

  it("opens and marks the current speed", () => {
    const { onToggle } = setup();
    expect(screen.getByRole("button", { name: "Normal" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Fast" })).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(screen.getByRole("button", { name: "Bots" }));
    expect(onToggle).toHaveBeenCalled();
  });

  it("reports speed, pause and new game", () => {
    const { onSpeedChange, onPauseChange, onNewGame } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Slow" }));
    expect(onSpeedChange).toHaveBeenCalledWith("slow");
    fireEvent.click(screen.getByRole("button", { name: "Pause" }));
    expect(onPauseChange).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "New game" }));
    expect(onNewGame).toHaveBeenCalled();
  });

  it("says Bots paused and offers Resume while paused", () => {
    const { onPauseChange } = setup({ paused: true });
    expect(screen.getByRole("button", { name: "Bots paused" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Resume" }));
    expect(onPauseChange).toHaveBeenCalledWith(false);
  });
});
