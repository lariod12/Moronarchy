import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { BottomHud } from "./BottomHud";
import type { BottomHudProps } from "./BottomHud";

const baseProps: BottomHudProps = {
  name: "King 0",
  health: 100,
  maxHealth: 100,
  coin: 100,
  level: 1,
  eliminated: false,
  crownState: "idle"
};

describe("BottomHud", () => {
  it("shows stats, back and crown buttons for a living king", () => {
    render(<BottomHud {...baseProps} />);
    expect(screen.getByText("health: 100")).toBeInTheDocument();
    expect(screen.getByText("coin: 100")).toBeInTheDocument();
    expect(screen.getByText("level: 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Back" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^Crown/ })).toBeInTheDocument();
    expect(screen.queryByText("Game Over")).not.toBeInTheDocument();
  });

  it("shows Game Over without Back and Crown when eliminated", () => {
    render(<BottomHud {...baseProps} eliminated crownState="eliminated" />);
    expect(screen.getByText("Game Over")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Crown/ })).not.toBeInTheDocument();
  });

  it("lets an eliminated spectator tap Game Over to go Home, like the Crown", () => {
    const onCrownPress = vi.fn();
    render(<BottomHud {...baseProps} eliminated crownState="eliminated" onCrownPress={onCrownPress} />);
    fireEvent.click(screen.getByRole("button", { name: /^Game Over/ }));
    expect(onCrownPress).toHaveBeenCalledTimes(1);
  });
});
