import { type FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { getPlayerSession, getRoom } from "@/api/lobby";

interface MatchPlayer {
  id: number;
  name?: string;
  isConnected?: boolean;
}

interface MatchInfo {
  matchID: string;
  players: MatchPlayer[];
}

const DEFAULT_ROOM_CAPACITY = 4;

export const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("Do something ..");
  const [latestMessage, setLatestMessage] = useState("Do something ..");
  const [chatLines, setChatLines] = useState([
    "Player 1: Do something",
    "Player 1: don't leave me alone"
  ]);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [roomCodeCopied, setRoomCodeCopied] = useState(false);
  const session = roomId ? getPlayerSession(roomId) : null;
  const playerSlot = session ? Number(session.playerID) + 1 : 1;
  const playerLabel = `Player ${playerSlot}`;
  const activePlayers = match?.players.filter((player) => player.name) ?? [];
  const roomCapacity = match?.players.length ?? DEFAULT_ROOM_CAPACITY;
  const visiblePlayers = activePlayers.length > 0
    ? activePlayers
    : session
      ? [{ id: Number(session.playerID), name: session.playerName, isConnected: true }]
      : [];
  const hasOpenPlayerSlot = visiblePlayers.length < roomCapacity;
  const canStart = isReady && activePlayers.length >= 2;

  const loadRoom = async () => {
    if (!roomId) return;
    setError(null);
    try {
      setMatch((await getRoom(roomId)) as MatchInfo);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not load room.");
    }
  };

  useEffect(() => {
    void loadRoom();
    const refreshTimer = window.setInterval(() => {
      void loadRoom();
    }, 2500);

    return () => window.clearInterval(refreshTimer);
  }, [roomId]);

  useEffect(() => {
    if (countdown === null) return undefined;
    if (countdown <= 0) {
      if (roomId) navigate(`/game/${roomId}`);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setCountdown((value) => (value === null ? null : value - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [countdown, navigate, roomId]);

  const formatSpeechBubbleText = (message: string): string => {
    return message.length <= 22 ? message : `${message.slice(0, 22).trim()}...`;
  };

  const handleChatOrCancel = () => {
    if (isReady) {
      setIsReady(false);
      setLatestMessage("");
      setChatLines((lines) => [...lines, `${playerLabel}: cancel ready`]);
      return;
    }

    setIsChatOpen(true);
  };

  const handleReadyOrStart = () => {
    if (!isReady) {
      setIsReady(true);
      setLatestMessage("Ready!");
      setChatLines((lines) => [...lines, `${playerLabel}: ready`]);
      return;
    }

    if (canStart) {
      setCountdown(3);
    }
  };

  const handleSendChat = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message) return;

    setChatLines((lines) => [...lines, `${playerLabel}: ${message}`]);
    setLatestMessage(message);
    setChatInput("");
    setIsChatOpen(false);
    window.setTimeout(() => {
      setLatestMessage((current) => (current === message ? "" : current));
    }, 3000);
  };

  const handleCopyRoomCode = async () => {
    if (!roomId) return;

    try {
      await navigator.clipboard.writeText(roomId);
      setRoomCodeCopied(true);
      window.setTimeout(() => setRoomCodeCopied(false), 1800);
    } catch {
      setError("Could not copy room code.");
    }
  };

  const renderPlayerCard = (player: MatchPlayer) => {
    const slot = player.id + 1;
    const isCurrentPlayer = playerSlot === slot;
    const isHost = player.id === 0;
    const bubble = isCurrentPlayer
      ? (isReady ? "Ready!" : formatSpeechBubbleText(latestMessage))
      : player.isConnected
        ? "Joined"
        : "";

    return (
      <article
        key={player.id}
        className={[
          "lobby-player-card",
          isCurrentPlayer ? "is-you" : "",
          isHost ? "is-host" : "",
          "is-active"
        ].join(" ")}
        data-player-slot={slot}
      >
        <div className="player-name-tab">{`Player ${slot}`}</div>
        {bubble && (
          <div className="speech-bubble">
            <span className="speech-text">{bubble}</span>
          </div>
        )}
        <div className="player-avatar" aria-hidden="true">
          <div className="avatar-head" />
          <div className="avatar-body" />
        </div>
      </article>
    );
  };

  return (
    <main className="phone-frame room-screen screen-room-lobby" data-ready-state={isReady ? "ready" : "idle"}>
      <header className="room-code-tab room-code-box">
        <span className="sr-only">Waiting room</span>
        <strong>{roomId ?? "R001"}</strong>
      </header>

      <section className={`lobby-grid ${hasOpenPlayerSlot ? "is-waiting" : ""}`} aria-label="Room players">
        {visiblePlayers.map(renderPlayerCard)}
        {hasOpenPlayerSlot && (
          <div className="waiting-for-player">
            <strong>Waiting for other player</strong>
            <span>Share the room code so another king can join.</span>
            <button
              className="copy-room-code-button"
              type="button"
              aria-label="Copy room code"
              onClick={() => void handleCopyRoomCode()}
            >
              {roomCodeCopied ? "Copied" : "Copy code"}
            </button>
          </div>
        )}
      </section>

      {!session && (
        <p className="hint-text">This browser has not joined the room yet. Join from the home screen first.</p>
      )}

      {error && <p className="error-text">{error}</p>}

      <footer className="lobby-footer">
        <section className="chat-log" aria-label="Lobby chat log">
          <div className="chat-scroll">
            <div className="chat-lines">
              {chatLines.map((line, index) => (
                <span key={`${line}-${index}`}>{line}</span>
              ))}
            </div>
          </div>
          <span className="scroll-rail" aria-hidden="true">
            <i className="scroll-thumb" />
          </span>
        </section>
        <div className="footer-actions">
          <button className="lobby-action" disabled={!session || countdown !== null} onClick={handleChatOrCancel}>
            {isReady ? "Cancel" : "Chat"}
          </button>
          <button
            className="lobby-action is-primary"
            disabled={!session || countdown !== null || (isReady && !canStart)}
            onClick={handleReadyOrStart}
          >
            {isReady ? (canStart ? "Start" : "Waiting") : "Ready"}
          </button>
        </div>
      </footer>

      {isChatOpen && (
        <section className="chat-modal" onClick={() => setIsChatOpen(false)}>
          <form className="chat-dialog" onSubmit={handleSendChat} onClick={(event) => event.stopPropagation()}>
            <strong>Lobby Chat</strong>
            <input
              className="chat-input"
              aria-label="Chat message"
              autoComplete="off"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
            />
            <div className="chat-dialog-actions">
              <button type="button" onClick={() => setIsChatOpen(false)}>
                Close
              </button>
              <button type="submit">Send</button>
            </div>
          </form>
        </section>
      )}

      {countdown !== null && (
        <section className="start-modal" aria-label="Game starting countdown">
          <button
            className="start-dialog"
            type="button"
            aria-live="polite"
            onClick={() => setCountdown((value) => (value === null ? null : value - 1))}
          >
            <strong>Game Starting</strong>
            <span className="start-countdown">{Math.max(countdown, 1)}</span>
          </button>
        </section>
      )}
    </main>
  );
};
