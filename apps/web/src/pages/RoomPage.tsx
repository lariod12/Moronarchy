import { useEffect, useState } from "react";
import { ArrowLeft, Copy, Play, RefreshCw } from "lucide-react";
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

export const RoomPage = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const [match, setMatch] = useState<MatchInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const session = roomId ? getPlayerSession(roomId) : null;

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
  }, [roomId]);

  return (
    <main className="phone-frame room-screen">
      <header className="screen-header">
        <button className="icon-button" onClick={() => navigate("/")} aria-label="Back home">
          <ArrowLeft size={20} />
        </button>
        <div>
          <span>Waiting room</span>
          <strong>{roomId?.slice(0, 8)}</strong>
        </div>
        <button className="icon-button" onClick={loadRoom} aria-label="Refresh room">
          <RefreshCw size={20} />
        </button>
      </header>

      <section className="room-code-box">
        <span>Share room code</span>
        <strong>{roomId}</strong>
        <button className="ghost-action" onClick={() => void navigator.clipboard?.writeText(roomId ?? "")}>
          <Copy size={18} />
          Copy
        </button>
      </section>

      <section className="player-list">
        {(match?.players ?? []).map((player) => (
          <div key={player.id} className="player-row">
            <span>P{player.id + 1}</span>
            <strong>{player.name ?? "Open seat"}</strong>
            <em>{player.isConnected ? "Online" : "Waiting"}</em>
          </div>
        ))}
      </section>

      {!session && (
        <p className="hint-text">This browser has not joined the room yet. Join from the home screen first.</p>
      )}

      {error && <p className="error-text">{error}</p>}

      <button
        className="primary-action wide-action"
        disabled={!session}
        onClick={() => roomId && navigate(`/game/${roomId}`)}
      >
        <Play size={20} />
        Enter game
      </button>
    </main>
  );
};
