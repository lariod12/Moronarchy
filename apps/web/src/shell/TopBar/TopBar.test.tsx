import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TopBar } from "./TopBar";

describe("TopBar", () => {
  it("shows round, room code and page title", () => {
    render(<TopBar round={1} roomCode="RABCD" title="Home" />);
    expect(screen.getByText("Round 1")).toBeInTheDocument();
    expect(screen.getByText("RABCD")).toBeInTheDocument();
    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });

  it("shows the fee multiplier once inflation kicks in", () => {
    render(<TopBar round={22} roomCode="RABCD" inflation={1.25} />);
    expect(screen.getByText("Round 22 · Fee ×1.25")).toBeInTheDocument();
  });

  it("turns the room code into a copy button with a bubble in the lobby variant", () => {
    const onRoomPress = vi.fn();
    const { rerender } = render(<TopBar roomCode="RABCD" onRoomPress={onRoomPress} />);
    fireEvent.click(screen.getByRole("button", { name: /RABCD/ }));
    expect(onRoomPress).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("copied!")).not.toBeInTheDocument();
    rerender(<TopBar roomCode="RABCD" onRoomPress={onRoomPress} roomBubble="copied!" />);
    expect(screen.getByText("copied!")).toBeInTheDocument();
  });
});
