import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Tabs } from "./Tabs";

describe("Tabs", () => {
  it("marks the active tab and reports a change", () => {
    const onChange = vi.fn();
    render(
      <Tabs
        label="Station"
        tabs={[
          { key: "plots", label: "Plots" },
          { key: "shop", label: "Shop" }
        ]}
        active="plots"
        onChange={onChange}
      />
    );
    expect(screen.getByRole("tab", { name: "Plots" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Shop" })).toHaveAttribute("aria-selected", "false");
    fireEvent.click(screen.getByRole("tab", { name: "Shop" }));
    expect(onChange).toHaveBeenCalledWith("shop");
  });
});
