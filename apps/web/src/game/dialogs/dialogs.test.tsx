import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { FightNoticeDialog, FightResultDialog, OwnerChoiceDialog, RetreatConfirmDialog, VisitorChoiceDialog } from "./dialogs";

describe("attack dialogs", () => {
  it("enables Attack and shows no hint when attacks are allowed", () => {
    const onAttack = vi.fn();
    render(<VisitorChoiceDialog ownerName="Bob" plotId={5} fee={30} canAttack onPay={() => undefined} onAttack={onAttack} />);
    fireEvent.click(screen.getByRole("button", { name: "Attack" }));
    expect(onAttack).toHaveBeenCalledTimes(1);
    expect(screen.queryByText("Peace Treaty: no attacks")).not.toBeInTheDocument();
  });

  it("disables Attack with the Peace Treaty hint when the rules forbid it", () => {
    render(<OwnerChoiceDialog visitorName="Alice" plotId={5} fee={30} canAttack={false} onCollect={() => undefined} onAttack={() => undefined} />);
    expect(screen.getByRole("button", { name: "Attack" })).toBeDisabled();
    expect(screen.getByText("Peace Treaty: no attacks")).toBeInTheDocument();
  });

  it("disables Attack without a hint when the engine refuses right now", () => {
    render(<VisitorChoiceDialog ownerName="Bob" plotId={5} fee={30} canAttack attackEnabled={false} onPay={() => undefined} onAttack={() => undefined} />);
    expect(screen.getByRole("button", { name: "Attack" })).toBeDisabled();
    expect(screen.queryByText("Peace Treaty: no attacks")).not.toBeInTheDocument();
  });
});

describe("fight dialogs", () => {
  it("offers Watch and Later", () => {
    const onWatch = vi.fn();
    const onLater = vi.fn();
    render(<FightNoticeDialog text="Alice is attacking Plot 12 (Bob)" onWatch={onWatch} onLater={onLater} />);
    fireEvent.click(screen.getByRole("button", { name: "Watch" }));
    fireEvent.click(screen.getByRole("button", { name: "Later" }));
    expect(onWatch).toHaveBeenCalledTimes(1);
    expect(onLater).toHaveBeenCalledTimes(1);
  });

  it("lists the result lines and closes with Done", () => {
    const onDone = vi.fn();
    render(<FightResultDialog title="Victory!" lines={["Winner: You", "Plot 12 was destroyed"]} onDone={onDone} />);
    expect(screen.getByRole("dialog", { name: "Victory!" })).toHaveTextContent("Plot 12 was destroyed");
    fireEvent.click(screen.getByRole("button", { name: "Done" }));
    expect(onDone).toHaveBeenCalled();
  });

  it("asks for confirmation of a retreat with the fee", () => {
    const onYes = vi.fn();
    const onNo = vi.fn();
    render(<RetreatConfirmDialog fee={40} onNo={onNo} onYes={onYes} />);
    expect(screen.getByRole("dialog")).toHaveTextContent("Retreat counts as a loss. You will pay 40 coin.");
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(onYes).toHaveBeenCalled();
    expect(onNo).toHaveBeenCalled();
  });

  it("drops the payment sentence when a retreat is free", () => {
    render(<RetreatConfirmDialog fee={0} onNo={() => undefined} onYes={() => undefined} />);
    expect(screen.getByRole("dialog")).toHaveTextContent("Retreat counts as a loss.");
    expect(screen.getByRole("dialog")).not.toHaveTextContent("will pay");
  });
});
