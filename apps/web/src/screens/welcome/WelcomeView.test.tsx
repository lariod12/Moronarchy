import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WelcomeView } from "./WelcomeView";

describe("WelcomeView", () => {
  it("shows Create while the room input is empty and Join once it has a value", () => {
    const { rerender } = render(<WelcomeView name="Alice" roomCode="" />);
    expect(screen.getByRole("button", { name: "Create" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Join" })).not.toBeInTheDocument();
    rerender(<WelcomeView name="Alice" roomCode="RABCD" />);
    expect(screen.getByRole("button", { name: "Join" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create" })).not.toBeInTheDocument();
  });

  it("disables the primary button until a name is entered", () => {
    const { rerender } = render(<WelcomeView name="" roomCode="" />);
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
    rerender(<WelcomeView name="   " roomCode="RABCD" />);
    expect(screen.getByRole("button", { name: "Join" })).toBeDisabled();
    rerender(<WelcomeView name="Bob" roomCode="RABCD" />);
    expect(screen.getByRole("button", { name: "Join" })).toBeEnabled();
  });

  it("previews the typed name above the avatar", () => {
    const { rerender } = render(<WelcomeView name="" roomCode="" />);
    expect(screen.getByTestId("welcome-preview")).toHaveTextContent("Player Name");
    rerender(<WelcomeView name="Alice" roomCode="" />);
    expect(screen.getByTestId("welcome-preview")).toHaveTextContent("Alice");
  });

  it("reports input changes and submits through the form", () => {
    const onNameChange = vi.fn();
    const onRoomCodeChange = vi.fn();
    const onSubmit = vi.fn();
    render(<WelcomeView name="Alice" roomCode="" onNameChange={onNameChange} onRoomCodeChange={onRoomCodeChange} onSubmit={onSubmit} />);
    fireEvent.change(screen.getByLabelText("Name"), { target: { value: "Alicia" } });
    expect(onNameChange).toHaveBeenCalledWith("Alicia");
    fireEvent.change(screen.getByLabelText("Join room"), { target: { value: "rab" } });
    expect(onRoomCodeChange).toHaveBeenCalledWith("rab");
    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("does not submit without a name", () => {
    const onSubmit = vi.fn();
    const { container } = render(<WelcomeView name="" roomCode="" onSubmit={onSubmit} />);
    const form = container.querySelector("form");
    if (!form) {
      throw new Error("form missing");
    }
    fireEvent.submit(form);
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("shows the error under the room input and links it to the field", () => {
    render(<WelcomeView name="Bob" roomCode="RZZZZ" error="Room not found" />);
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent("Room not found");
    expect(screen.getByLabelText("Join room")).toHaveAttribute("aria-describedby", alert.id);
    expect(screen.getByLabelText("Join room")).toHaveAttribute("aria-invalid", "true");
  });

  it("shows the blocking overlay and locks the button while busy", () => {
    const { rerender } = render(<WelcomeView name="Bob" roomCode="" busy="creating" />);
    expect(screen.getByRole("status")).toHaveTextContent("Waiting for creating room");
    expect(screen.getByRole("button", { name: "Create" })).toBeDisabled();
    rerender(<WelcomeView name="Bob" roomCode="RABCD" busy="joining" />);
    expect(screen.getByRole("status")).toHaveTextContent("Joining room");
    expect(screen.getByRole("button", { name: "Join" })).toBeDisabled();
  });

  it("shows no overlay or error by default", () => {
    render(<WelcomeView name="Bob" roomCode="" />);
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
  });

  it("offers Play vs bots only when it can open the solo setup, even without a name", () => {
    const onPlaySolo = vi.fn();
    const { rerender } = render(<WelcomeView name="" roomCode="" />);
    expect(screen.queryByRole("button", { name: "Play vs bots" })).not.toBeInTheDocument();
    rerender(<WelcomeView name="" roomCode="" onPlaySolo={onPlaySolo} />);
    fireEvent.click(screen.getByRole("button", { name: "Play vs bots" }));
    expect(onPlaySolo).toHaveBeenCalledTimes(1);
  });
});
