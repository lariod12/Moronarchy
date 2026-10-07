import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createLobbyState,
  lobbyGuestReady,
  lobbyHostCanStart,
  lobbyHostWaiting,
  toLobbyViewProps
} from "../../dev/gallery/lobby-fixtures";
import { COPIED_BUBBLE_MS, LobbyView } from "./LobbyView";

const CODE = "RABCD";

describe("LobbyView seats", () => {
  it("renders 6 slots with 3 empty ones for a 3 player room", () => {
    render(<LobbyView {...toLobbyViewProps(lobbyHostWaiting(), "0", CODE)} />);
    expect(screen.getAllByTestId("seat-card")).toHaveLength(3);
    expect(screen.getAllByTestId("seat-empty")).toHaveLength(3);
    expect(screen.getAllByText("Empty")).toHaveLength(3);
    expect(screen.getAllByRole("listitem")).toHaveLength(6);
  });

  it("puts each seat in the grid cell of its player id", () => {
    const state = createLobbyState({
      seats: [
        { id: "0", name: "Alice" },
        { id: "3", name: "Dan" }
      ]
    });
    render(<LobbyView {...toLobbyViewProps(state, "0", CODE)} />);
    const items = screen.getAllByRole("listitem");
    expect(within(items[3] as HTMLElement).getByText("Dan")).toBeInTheDocument();
    expect(within(items[1] as HTMLElement).getByText("Empty")).toBeInTheDocument();
  });

  it("shows the ready label only on ready seats and the host tag on the host seat", () => {
    render(<LobbyView {...toLobbyViewProps(lobbyHostWaiting(), "0", CODE)} />);
    expect(screen.getAllByText("ready")).toHaveLength(1);
    expect(screen.getAllByText("host")).toHaveLength(1);
    const hostCard = screen.getByRole("group", { name: /^Alice/ });
    expect(within(hostCard).getByText("host")).toBeInTheDocument();
    const bobCard = screen.getByRole("button", { name: /^Bob/ });
    expect(within(bobCard).getByText("ready")).toBeInTheDocument();
  });

  it("dims disconnected players and shows chat bubbles on seats", () => {
    const state = lobbyGuestReady();
    render(
      <LobbyView
        {...toLobbyViewProps(state, "1", CODE, {
          players: [{ id: "3", isConnected: false }],
          bubbles: { "1": "hello there" }
        })}
      />
    );
    expect(screen.getByRole("group", { name: /^Dan/ })).toHaveClass("seat-card--offline");
    expect(screen.getByRole("group", { name: /^Alice/ })).not.toHaveClass("seat-card--offline");
    expect(within(screen.getByRole("group", { name: /^Bob/ })).getByText("hello there")).toBeInTheDocument();
  });
});

describe("LobbyView bottom bar", () => {
  it("lets a guest toggle ready", () => {
    const onReadyChange = vi.fn();
    const state = lobbyHostWaiting();
    const { rerender } = render(<LobbyView {...toLobbyViewProps(state, "2", CODE)} onReadyChange={onReadyChange} />);
    const ready = screen.getByRole("button", { name: "Ready" });
    expect(ready).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(ready);
    expect(onReadyChange).toHaveBeenLastCalledWith(true);

    rerender(<LobbyView {...toLobbyViewProps(state, "1", CODE)} onReadyChange={onReadyChange} />);
    expect(screen.getByRole("button", { name: "Ready" })).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(screen.getByRole("button", { name: "Ready" }));
    expect(onReadyChange).toHaveBeenLastCalledWith(false);
    expect(screen.queryByRole("button", { name: "Start" })).not.toBeInTheDocument();
  });

  it("gives the host a Start button that is disabled until the lobby can start", () => {
    const onStart = vi.fn();
    const { rerender } = render(<LobbyView {...toLobbyViewProps(lobbyHostWaiting(), "0", CODE)} onStart={onStart} />);
    const start = screen.getByRole("button", { name: "Start" });
    expect(start).toBeDisabled();
    expect(start).toHaveAccessibleDescription("Everyone must be ready to start");
    expect(screen.queryByRole("button", { name: "Ready" })).not.toBeInTheDocument();
    fireEvent.click(start);
    expect(onStart).not.toHaveBeenCalled();

    rerender(<LobbyView {...toLobbyViewProps(lobbyHostCanStart(), "0", CODE)} onStart={onStart} />);
    const enabled = screen.getByRole("button", { name: "Start" });
    expect(enabled).toBeEnabled();
    fireEvent.click(enabled);
    expect(onStart).toHaveBeenCalledTimes(1);
  });

  it("explains a start blocked by too few players", () => {
    const state = createLobbyState({ seats: [{ id: "0", name: "Alice" }] });
    render(<LobbyView {...toLobbyViewProps(state, "0", CODE)} />);
    expect(screen.getByRole("button", { name: "Start" })).toHaveAccessibleDescription("Need at least 2 players to start");
  });

  it("renders the chat log with (you) on own lines", () => {
    render(<LobbyView {...toLobbyViewProps(lobbyHostWaiting(), "0", CODE)} />);
    const log = screen.getByRole("log", { name: "Chat" });
    expect(within(log).getByText("Alice (you): Do something")).toBeInTheDocument();
    expect(within(log).getByText("Bob: stupid userr")).toBeInTheDocument();
  });
});

describe("LobbyView chat input", () => {
  const openChat = () => {
    fireEvent.click(screen.getByRole("button", { name: "Chat" }));
    return screen.getByPlaceholderText("Say something…");
  };

  it("opens the input row from the Chat button and closes it with Escape", () => {
    render(<LobbyView {...toLobbyViewProps(lobbyHostWaiting(), "1", CODE)} />);
    expect(screen.queryByPlaceholderText("Say something…")).not.toBeInTheDocument();
    const input = openChat();
    expect(input).toHaveFocus();
    expect(screen.getByRole("button", { name: "Send" })).toBeDisabled();
    fireEvent.keyDown(input, { key: "Escape" });
    expect(screen.queryByPlaceholderText("Say something…")).not.toBeInTheDocument();
  });

  it("sends on Enter, clears the input and keeps the row open", () => {
    const onSendChat = vi.fn();
    render(<LobbyView {...toLobbyViewProps(lobbyHostWaiting(), "1", CODE)} onSendChat={onSendChat} />);
    const input = openChat();
    fireEvent.change(input, { target: { value: "  hello  " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSendChat).toHaveBeenCalledWith("hello");
    expect(input).toHaveValue("");
    expect(screen.getByPlaceholderText("Say something…")).toBeInTheDocument();
  });

  it("sends with the Send button but ignores blank text", () => {
    const onSendChat = vi.fn();
    render(<LobbyView {...toLobbyViewProps(lobbyHostWaiting(), "1", CODE)} onSendChat={onSendChat} />);
    const input = openChat();
    fireEvent.change(input, { target: { value: "   " } });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onSendChat).not.toHaveBeenCalled();
    fireEvent.change(input, { target: { value: "hi" } });
    fireEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(onSendChat).toHaveBeenCalledWith("hi");
  });

  it("limits the message length", () => {
    render(<LobbyView {...toLobbyViewProps(lobbyHostWaiting(), "1", CODE)} />);
    expect(openChat()).toHaveAttribute("maxlength", "120");
  });
});

describe("LobbyView kick dialog", () => {
  it("lets the host kick another player after confirming", () => {
    const onKick = vi.fn();
    render(<LobbyView {...toLobbyViewProps(lobbyHostWaiting(), "0", CODE)} onKick={onKick} />);
    fireEvent.click(screen.getByRole("button", { name: /^Bob/ }));
    expect(screen.getByRole("dialog", { name: "Kick Bob?" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Yes" }));
    expect(onKick).toHaveBeenCalledWith("1");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("cancels with No and does not kick", () => {
    const onKick = vi.fn();
    render(<LobbyView {...toLobbyViewProps(lobbyHostWaiting(), "0", CODE)} onKick={onKick} />);
    fireEvent.click(screen.getByRole("button", { name: /^Cara/ }));
    fireEvent.click(screen.getByRole("button", { name: "No" }));
    expect(onKick).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("does not offer kicking to guests or on the host's own seat", () => {
    const { rerender } = render(<LobbyView {...toLobbyViewProps(lobbyHostWaiting(), "1", CODE)} />);
    expect(screen.queryByRole("button", { name: /^Cara/ })).not.toBeInTheDocument();
    rerender(<LobbyView {...toLobbyViewProps(lobbyHostWaiting(), "0", CODE)} />);
    expect(screen.queryByRole("button", { name: /^Alice/ })).not.toBeInTheDocument();
  });
});

describe("LobbyView room code", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("copies the code on tap and shows the copied bubble for 1.5 seconds", () => {
    const onCopyCode = vi.fn();
    render(<LobbyView {...toLobbyViewProps(lobbyHostWaiting(), "0", CODE)} onCopyCode={onCopyCode} />);
    expect(screen.getByText(CODE)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Room code/ }));
    expect(onCopyCode).toHaveBeenCalledTimes(1);
    expect(screen.getByText("copied!")).toBeInTheDocument();
    act(() => {
      vi.advanceTimersByTime(COPIED_BUBBLE_MS + 50);
    });
    expect(screen.queryByText("copied!")).not.toBeInTheDocument();
  });
});

describe("LobbyView overlay", () => {
  it("renders the supplied overlay on top of the lobby", () => {
    render(<LobbyView {...toLobbyViewProps(lobbyHostCanStart(), "0", CODE)} overlay={<div role="status">Game Starting 2</div>} />);
    expect(screen.getByRole("status")).toHaveTextContent("Game Starting 2");
  });
});
