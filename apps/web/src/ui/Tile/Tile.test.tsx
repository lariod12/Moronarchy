import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Tile } from "./Tile";

describe("Tile", () => {
  it("shows the title and one badge", () => {
    render(<Tile title="Items" icon={<svg />} badge="x4" />);
    expect(screen.getByRole("button", { name: /Items/ })).toHaveTextContent("x4");
  });

  it("stacks several badges", () => {
    render(<Tile title="Warrior" icon={<svg />} badge={["Plot 5", "Name: 01"]} />);
    const tile = screen.getByRole("button", { name: /Warrior/ });
    expect(tile).toHaveTextContent("Plot 5");
    expect(tile).toHaveTextContent("Name: 01");
  });

  it("is a button that can be disabled", () => {
    const onClick = vi.fn();
    const { rerender } = render(<Tile title="Plots" icon={<svg />} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: "Plots" }));
    expect(onClick).toHaveBeenCalledTimes(1);
    rerender(<Tile title="Plots" icon={<svg />} onClick={onClick} disabled />);
    expect(screen.getByRole("button", { name: "Plots" })).toBeDisabled();
  });
});
