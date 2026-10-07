import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LongPressButton } from "./LongPressButton";

const setup = (props: { disabled?: boolean } = {}) => {
  const onPress = vi.fn();
  const onLongPress = vi.fn();
  render(
    <LongPressButton aria-label="Crown" holdMs={600} onPress={onPress} onLongPress={onLongPress} {...props}>
      X
    </LongPressButton>
  );
  return { button: screen.getByRole("button", { name: "Crown" }), onPress, onLongPress };
};

describe("LongPressButton", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("calls onPress only for a quick tap", () => {
    const { button, onPress, onLongPress } = setup();
    fireEvent.pointerDown(button);
    act(() => {
      vi.advanceTimersByTime(200);
    });
    fireEvent.pointerUp(button);
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("fires onLongPress once at the threshold and not onPress on release", () => {
    const { button, onPress, onLongPress } = setup();
    fireEvent.pointerDown(button);
    expect(button).toHaveAttribute("data-holding", "true");
    act(() => {
      vi.advanceTimersByTime(600);
    });
    expect(onLongPress).toHaveBeenCalledTimes(1);
    act(() => {
      vi.advanceTimersByTime(2000);
    });
    fireEvent.pointerUp(button);
    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
    expect(button).not.toHaveAttribute("data-holding");
  });

  it("cancels on pointer leave", () => {
    const { button, onPress, onLongPress } = setup();
    fireEvent.pointerDown(button);
    fireEvent.pointerLeave(button);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    fireEvent.pointerUp(button);
    expect(onPress).not.toHaveBeenCalled();
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("supports a keyboard tap", () => {
    const { button, onPress, onLongPress } = setup();
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyDown(button, { key: "Enter", repeat: true });
    fireEvent.keyUp(button, { key: "Enter" });
    expect(onPress).toHaveBeenCalledTimes(1);
    expect(onLongPress).not.toHaveBeenCalled();
  });

  it("supports a keyboard hold", () => {
    const { button, onPress, onLongPress } = setup();
    fireEvent.keyDown(button, { key: " " });
    act(() => {
      vi.advanceTimersByTime(600);
    });
    fireEvent.keyUp(button, { key: " " });
    expect(onLongPress).toHaveBeenCalledTimes(1);
    expect(onPress).not.toHaveBeenCalled();
  });

  it("ignores input when disabled", () => {
    const { button, onPress, onLongPress } = setup({ disabled: true });
    fireEvent.pointerDown(button);
    act(() => {
      vi.advanceTimersByTime(1000);
    });
    fireEvent.pointerUp(button);
    fireEvent.keyDown(button, { key: "Enter" });
    fireEvent.keyUp(button, { key: "Enter" });
    expect(onPress).not.toHaveBeenCalled();
    expect(onLongPress).not.toHaveBeenCalled();
  });
});
