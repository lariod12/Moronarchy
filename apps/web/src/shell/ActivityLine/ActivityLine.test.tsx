import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ActivityLine } from "./ActivityLine";

describe("ActivityLine", () => {
  it("shows the newest activity text", () => {
    render(<ActivityLine text="Bob rolled 4 → Plot 15" />);
    expect(screen.getByTestId("activity-line")).toHaveTextContent("Bob rolled 4 → Plot 15");
  });

  it("keeps its height when there is nothing to show", () => {
    render(<ActivityLine text={null} />);
    expect(screen.getByTestId("activity-line").textContent).toBe(" ");
  });
});
