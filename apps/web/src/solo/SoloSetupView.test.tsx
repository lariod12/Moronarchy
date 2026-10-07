import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SOLO_SETTINGS } from "./solo-settings";
import { SoloSetupView } from "./SoloSetupView";

const settings = { ...DEFAULT_SOLO_SETTINGS, name: "Aria" };

describe("SoloSetupView", () => {
  it("shows the defaults: 3 bots, Mixed, Normal", () => {
    render(<SoloSetupView settings={settings} onChange={vi.fn()} onStart={vi.fn()} />);
    const bots = within(screen.getByRole("group", { name: "Bots" }));
    expect(bots.getAllByRole("button").map((button) => button.textContent)).toEqual(["1", "2", "3", "4", "5"]);
    expect(bots.getByRole("button", { name: "3" })).toHaveAttribute("aria-pressed", "true");
    expect(within(screen.getByRole("group", { name: "Bot style" })).getByRole("button", { name: "Mixed" })).toHaveAttribute("aria-pressed", "true");
    expect(within(screen.getByRole("group", { name: "Bot speed" })).getByRole("button", { name: "Normal" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByLabelText("Name")).toHaveValue("Aria");
  });

  it("reports each change with the rest of the settings kept", () => {
    const onChange = vi.fn();
    render(<SoloSetupView settings={settings} onChange={onChange} onStart={vi.fn()} />);
    fireEvent.click(within(screen.getByRole("group", { name: "Bots" })).getByRole("button", { name: "5" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...settings, bots: 5 });
    fireEvent.click(screen.getByRole("button", { name: "Aggressive" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...settings, style: "aggressive" });
    fireEvent.click(screen.getByRole("button", { name: "Slow" }));
    expect(onChange).toHaveBeenLastCalledWith({ ...settings, speed: "slow" });
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Bo" } });
    expect(onChange).toHaveBeenLastCalledWith({ ...settings, name: "Bo" });
  });

  it("starts only with a name", () => {
    const onStart = vi.fn();
    const { rerender } = render(<SoloSetupView settings={{ ...settings, name: "  " }} onChange={vi.fn()} onStart={onStart} />);
    expect(screen.getByRole("button", { name: "Start" })).toBeDisabled();
    rerender(<SoloSetupView settings={settings} onChange={vi.fn()} onStart={onStart} />);
    fireEvent.click(screen.getByRole("button", { name: "Start" }));
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("offers Back only when it can go back", () => {
    const onBack = vi.fn();
    const { rerender } = render(<SoloSetupView settings={settings} onChange={vi.fn()} onStart={vi.fn()} />);
    expect(screen.queryByRole("button", { name: "Back" })).not.toBeInTheDocument();
    rerender(<SoloSetupView settings={settings} onChange={vi.fn()} onStart={vi.fn()} onBack={onBack} />);
    fireEvent.click(screen.getByRole("button", { name: "Back" }));
    expect(onBack).toHaveBeenCalled();
  });
});
