import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CrownButton } from "./CrownButton";

describe("CrownButton", () => {
  it("shows no bubble while idle or shaking", () => {
    const { rerender } = render(<CrownButton state="idle" />);
    expect(screen.getByRole("button", { name: /^Crown/ })).toBeInTheDocument();
    expect(screen.queryByText("your turn!")).not.toBeInTheDocument();
    rerender(<CrownButton state="shaking" />);
    expect(screen.getByRole("button", { name: "Crown: hold to take your turn" })).toBeInTheDocument();
    expect(screen.queryByText("your turn!")).not.toBeInTheDocument();
  });

  it("shows the turn bubble when active", () => {
    render(<CrownButton state="active" />);
    expect(screen.getByText("your turn!")).toBeInTheDocument();
  });

  it("shows the end turn bubble when the turn can end", () => {
    render(<CrownButton state="canEndTurn" />);
    expect(screen.getByText("end turn!")).toBeInTheDocument();
  });

  it("renders nothing when eliminated or finished", () => {
    const { container, rerender } = render(<CrownButton state="eliminated" />);
    expect(container).toBeEmptyDOMElement();
    rerender(<CrownButton state="finished" />);
    expect(container).toBeEmptyDOMElement();
  });
});
