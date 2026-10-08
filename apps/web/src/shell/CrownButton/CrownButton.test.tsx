import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CROWN_TAP_HINT_MS, CrownButton } from "./CrownButton";

const tap = (button: HTMLElement): void => {
  fireEvent.pointerDown(button);
  fireEvent.pointerUp(button);
};

describe("CrownButton", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows no bubble while idle and asks to be held while shaking", () => {
    const { rerender } = render(<CrownButton state="idle" />);
    expect(screen.getByRole("button", { name: /^Crown/ })).toBeInTheDocument();
    expect(screen.queryByText("hold me!")).not.toBeInTheDocument();
    rerender(<CrownButton state="shaking" />);
    expect(screen.getByRole("button", { name: "Crown: hold to take your turn" })).toBeInTheDocument();
    expect(screen.getByText("hold me!")).toBeInTheDocument();
  });

  it("shows the turn bubble when active", () => {
    render(<CrownButton state="active" />);
    expect(screen.getByText("your turn!")).toBeInTheDocument();
  });

  it("shows the end turn bubble when the turn can end", () => {
    render(<CrownButton state="canEndTurn" />);
    expect(screen.getByText("end turn!")).toBeInTheDocument();
  });

  it("explains the hold on a tap while shaking instead of navigating, then restores the bubble", () => {
    vi.useFakeTimers();
    const onPress = vi.fn();
    render(<CrownButton state="shaking" onPress={onPress} />);
    tap(screen.getByRole("button", { name: /hold to take your turn/ }));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("hold to start your turn");
    act(() => {
      vi.advanceTimersByTime(CROWN_TAP_HINT_MS);
    });
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("hold me!")).toBeInTheDocument();
  });

  it("explains the hold on a tap when the turn can end", () => {
    const onPress = vi.fn();
    render(<CrownButton state="canEndTurn" onPress={onPress} />);
    tap(screen.getByRole("button", { name: /hold to end your turn/ }));
    expect(onPress).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent("hold to end your turn");
  });

  it("still goes home on a tap when idle or active", () => {
    const onPress = vi.fn();
    const { rerender } = render(<CrownButton state="idle" onPress={onPress} />);
    tap(screen.getByRole("button", { name: /^Crown/ }));
    rerender(<CrownButton state="active" onPress={onPress} />);
    tap(screen.getByRole("button", { name: /^Crown/ }));
    expect(onPress).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
  });

  it("drops a pending hint when the state changes", () => {
    const { rerender } = render(<CrownButton state="shaking" />);
    tap(screen.getByRole("button", { name: /hold to take your turn/ }));
    expect(screen.getByRole("status")).toBeInTheDocument();
    rerender(<CrownButton state="active" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByText("your turn!")).toBeInTheDocument();
  });

  it("renders nothing when eliminated or finished", () => {
    const { container, rerender } = render(<CrownButton state="eliminated" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<CrownButton state="finished" />);
    expect(container).toBeEmptyDOMElement();
  });
});
