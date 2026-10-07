import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Dialog } from "./Dialog";

describe("Dialog", () => {
  it("renders an accessible dialog with title and body", () => {
    render(
      <Dialog title="End of turn" actions={[{ label: "No", onSelect: vi.fn() }]}>
        Are you sure?
      </Dialog>
    );
    const dialog = screen.getByRole("dialog", { name: "End of turn" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByText("Are you sure?")).toBeInTheDocument();
  });

  it("focuses the first action and calls action handlers", () => {
    const onNo = vi.fn();
    const onYes = vi.fn();
    render(
      <Dialog
        title="End of turn"
        actions={[
          { label: "No", onSelect: onNo },
          { label: "Yes", onSelect: onYes }
        ]}
      >
        Body
      </Dialog>
    );
    expect(screen.getByRole("button", { name: "No" })).toHaveFocus();
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(onYes).toHaveBeenCalledTimes(1);
    expect(onNo).not.toHaveBeenCalled();
  });

  it("calls onDismiss on Escape", () => {
    const onDismiss = vi.fn();
    render(
      <Dialog title="Congratulation!" actions={[{ label: "Done", onSelect: vi.fn() }]} onDismiss={onDismiss}>
        Body
      </Dialog>
    );
    fireEvent.keyDown(screen.getByRole("button", { name: "Done" }), { key: "Escape" });
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
