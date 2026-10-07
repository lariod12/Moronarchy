import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { AbsentBanner, ConnectionBanner } from "./ConnectionBanners";

describe("ConnectionBanner", () => {
  it("shows Reconnecting only while disconnected", () => {
    const { rerender } = render(<ConnectionBanner connected />);
    expect(screen.queryByTestId("connection-banner")).not.toBeInTheDocument();
    rerender(<ConnectionBanner connected={false} />);
    expect(screen.getByRole("status")).toHaveTextContent("Reconnecting…");
  });
});

describe("AbsentBanner", () => {
  it("shows the countdown, the removal in progress and the reconnection", () => {
    const { rerender } = render(<AbsentBanner status={{ kind: "absent", playerId: "1", secondsLeft: 25 }} name="Bob" />);
    expect(screen.getByTestId("absent-banner")).toHaveTextContent("Bob disconnected — removed in ~25s");
    rerender(<AbsentBanner status={{ kind: "absent", playerId: "1", secondsLeft: 0 }} name="Bob" />);
    expect(screen.getByTestId("absent-banner")).toHaveTextContent("Bob disconnected — removing…");
    rerender(<AbsentBanner status={{ kind: "reconnected", playerId: "1" }} name="Bob" />);
    expect(screen.getByTestId("absent-banner")).toHaveTextContent("Bob reconnected");
    rerender(<AbsentBanner status={null} name="" />);
    expect(screen.queryByTestId("absent-banner")).not.toBeInTheDocument();
  });
});
