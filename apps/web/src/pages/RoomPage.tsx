import { type FormEvent, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import { getPlayerSession, getRoom } from "@/api/lobby";
import { getLobbyChatUrl, type LobbyChatMessage, type LobbyChatServerMessage } from "@/api/lobby-chat";

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
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<LobbyChatMessage[]>([]);
  const [speechByPlayer, setSpeechByPlayer] = useState<Record<string, string>>({});
  const [readyByPlayer, setReadyByPlayer] = useState<Record<string, boolean>>({});
  const [chatSocket, setChatSocket] = useState<WebSocket | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [roomCodeCopied, setRoomCodeCopied] = useState(false);
  const session = roomId ? getPlayerSession(roomId) : null;
  const sessionKey = session ? `${session.matchID}:${session.playerID}:${session.playerName}` : "";
  const playerSlot = session ? Number(session.playerID) + 1 : 1;
  const isHost = session?.playerID === "0";
  const isReady = session ? Boolean(readyByPlayer[session.playerID]) : false;
  const activePlayers = match?.players.filter((player) => player.name) ?? [];
  const activeNonHostPlayers = activePlayers.filter((player) => player.id !== 0);
  const roomCapacity = match?.players.length ?? DEFAULT_ROOM_CAPACITY;
  const visiblePlayers = activePlayers.length > 0
    ? activePlayers
    : session
      ? [{ id: Number(session.playerID), name: session.playerName, isConnected: true }]
      : [];
  const hasOpenPlayerSlot = visiblePlayers.length < roomCapacity;
  const allCurrentPlayersReady = activePlayers.length >= 2
    && activeNonHostPlayers.length > 0
    && activeNonHostPlayers.every((player) => readyByPlayer[String(player.id)]);
  const canStart = isHost && allCurrentPlayersReady;

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
    if (!roomId || !session) {
      setChatSocket(null);
      return undefined;
    }

    let socket: WebSocket | null = null;
    const connectTimer = window.setTimeout(() => {
      socket = new WebSocket(getLobbyChatUrl());

      socket.addEventListener("open", () => {
        socket?.send(JSON.stringify({
          type: "join",
          matchID: roomId,
          playerID: session.playerID,
          playerName: session.playerName
        }));
      });

      socket.addEventListener("message", (event) => {
        try {
          const payload = JSON.parse(event.data as string) as LobbyChatServerMessage;
          if (payload.type === "snapshot") {
            setChatMessages(payload.messages);
            setSpeechByPlayer(payload.speechByPlayer);
            setReadyByPlayer(payload.readyByPlayer);
            return;
          }

          if (payload.type === "message") {
            setChatMessages((messages) => {
              if (messages.some((message) => message.id === payload.message.id)) return messages;
              return [...messages, payload.message];
            });
            setSpeechByPlayer(payload.speechByPlayer);
            return;
          }

          if (payload.type === "speech") {
            setSpeechByPlayer(payload.speechByPlayer);
            return;
          }

          if (payload.type === "ready") {
            setReadyByPlayer(payload.readyByPlayer);
            return;
          }

          if (payload.type === "start") {
            setCountdown(3);
          }
        } catch {
          setError("Could not read lobby chat update.");
        }
      });

      socket.addEventListener("error", () => {
        setError("Lobby chat websocket is not connected.");
      });

      setChatSocket(socket);
    }, 0);

    return () => {
      window.clearTimeout(connectTimer);
      socket?.close();
      setChatSocket((current) => (current === socket ? null : current));
    };
  }, [roomId, sessionKey]);

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
      if (session && roomId && chatSocket?.readyState === WebSocket.OPEN) {
        chatSocket.send(JSON.stringify({
          type: "ready",
          matchID: roomId,
          playerID: session.playerID,
          playerName: session.playerName,
          isReady: false
        }));
      }
      return;
    }

    setIsChatOpen(true);
  };

  const handleReadyOrStart = () => {
    if (!session || !roomId || chatSocket?.readyState !== WebSocket.OPEN) {
      setError("Lobby websocket is not connected.");
      return;
    }

    if (isHost) {
      if (!canStart) return;

      chatSocket.send(JSON.stringify({
        type: "start",
        matchID: roomId,
        playerID: session.playerID,
        playerName: session.playerName
      }));
      return;
    }

    if (isReady) return;

    chatSocket.send(JSON.stringify({
      type: "ready",
      matchID: roomId,
      playerID: session.playerID,
      playerName: session.playerName,
      isReady: true
    }));
  };

  const handleSendChat = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const message = chatInput.trim();
    if (!message) return;

    if (!session || !roomId || chatSocket?.readyState !== WebSocket.OPEN) {
      setError("Lobby chat websocket is not connected.");
      return;
    }

    chatSocket.send(JSON.stringify({
      type: "message",
      matchID: roomId,
      playerID: session.playerID,
      playerName: session.playerName,
      text: message
    }));
    setChatInput("");
    setIsChatOpen(false);
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
    const isPlayerHost = player.id === 0;
    const isPlayerReady = Boolean(readyByPlayer[String(player.id)]);
    const latestSpeech = speechByPlayer[String(player.id)] ?? "";
    const bubble = latestSpeech ? formatSpeechBubbleText(latestSpeech) : isPlayerReady ? "Ready!" : "";

    return (
      <article
        key={player.id}
        className={[
          "lobby-player-card",
          isCurrentPlayer ? "is-you" : "",
          isPlayerHost ? "is-host" : "",
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
              {chatMessages.length > 0 ? (
                chatMessages.map((message) => (
                  <span key={message.id}>{`Player ${Number(message.playerID) + 1}: ${message.text}`}</span>
                ))
              ) : (
                <span className="chat-empty-line">Lobby chat is empty.</span>
              )}
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
            disabled={!session || countdown !== null || (isHost ? !canStart : isReady)}
            onClick={handleReadyOrStart}
          >
            {isHost ? (canStart ? "Start" : "Waiting...") : isReady ? "Waiting" : "Ready"}
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
              placeholder="Do something .."
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
