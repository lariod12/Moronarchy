import { FormEvent, useState } from "react";
import { motion } from "motion/react";
import { Crown, LogIn, Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { createRoom, joinRoom } from "@/api/lobby";

export const HomePage = () => {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("King");
  const [numPlayers, setNumPlayers] = useState(2);
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleCreate = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      const session = await createRoom(playerName.trim() || "King", numPlayers);
      navigate(`/room/${session.matchID}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not create room.");
    } finally {
      setBusy(false);
    }
  };

  const handleJoin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!roomCode.trim()) return;

    setBusy(true);
    setError(null);

    try {
      const session = await joinRoom(roomCode.trim(), playerName.trim() || "King");
      navigate(`/room/${session.matchID}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not join room.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="phone-frame home-screen">
      <motion.section className="hero-panel" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }}>
        <div className="hero-crown">
          <Crown size={42} />
        </div>
        <span>Moronarchy MVP</span>
        <h1>Claim land. Tax rivals. Keep the crown.</h1>
      </motion.section>

      <section className="form-stack">
        <label>
          King name
          <input value={playerName} maxLength={18} onChange={(event) => setPlayerName(event.target.value)} />
        </label>

        <form onSubmit={handleCreate} className="action-form">
          <label>
            Players
            <select value={numPlayers} onChange={(event) => setNumPlayers(Number(event.target.value))}>
              <option value={2}>2 players</option>
              <option value={3}>3 players</option>
              <option value={4}>4 players</option>
            </select>
          </label>
          <button className="primary-action" disabled={busy} type="submit">
            <Plus size={18} />
            Create room
          </button>
        </form>

        <form onSubmit={handleJoin} className="action-form">
          <label>
            Room code
            <input
              value={roomCode}
              placeholder="Match ID"
              onChange={(event) => setRoomCode(event.target.value)}
            />
          </label>
          <button className="ghost-action" disabled={busy || !roomCode.trim()} type="submit">
            <LogIn size={18} />
            Join room
          </button>
        </form>
      </section>

      {error && <p className="error-text">{error}</p>}
    </main>
  );
};
