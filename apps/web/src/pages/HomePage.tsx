import { FormEvent, useMemo, useState } from "react";
import { motion } from "motion/react";
import { useNavigate } from "react-router";
import { createRoom, joinRoom } from "@/api/lobby";
import { residentProfileIcon } from "../assets/icons";

export const HomePage = () => {
  const navigate = useNavigate();
  const [playerName, setPlayerName] = useState("");
  const [roomCode, setRoomCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const trimmedName = playerName.trim();
  const trimmedRoomCode = roomCode.trim();
  const isJoinFlow = trimmedRoomCode.length > 0;
  const canSubmit = trimmedName.length > 0 && !busy;
  const previewName = useMemo(() => trimmedName || "Player Name", [trimmedName]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!canSubmit) return;

    setBusy(true);
    setError(null);

    try {
      const session = isJoinFlow
        ? await joinRoom(trimmedRoomCode, trimmedName)
        : await createRoom(trimmedName, 4);
      navigate(`/room/${session.matchID}`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not enter room.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main
      className="phone-frame home-screen screen-welcome-create-join"
      data-flow={isJoinFlow ? "join" : "create"}
      data-can-submit={canSubmit}
      aria-label="Welcome create or join room"
    >
      <header className="title-tab">Welcome KingDoom</header>

      <motion.section
        className="profile-card player-preview-card"
        aria-label="Player preview"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="name-display">{previewName}</div>
        <div className="portrait" aria-hidden="true">
          <img className="wire-avatar" src={residentProfileIcon} alt="" />
        </div>
      </motion.section>

      <form onSubmit={handleSubmit} className="form-flow frame-action-panel" aria-label="Create or join form">
        <label className="label-box" htmlFor="player-name">
          Name
        </label>
        <input
          id="player-name"
          className="input-box player-name-input"
          aria-label="King name"
          autoComplete="off"
          maxLength={18}
          value={playerName}
          onChange={(event) => setPlayerName(event.target.value)}
        />

        <label className="label-box join-room-label" htmlFor="room-code">
          Join room
        </label>
        <input
          id="room-code"
          className="input-box room-code-input"
          aria-label="Room code"
          autoComplete="off"
          value={roomCode}
          onChange={(event) => setRoomCode(event.target.value)}
        />

        <button
          className="primary-flow-button"
          aria-label={isJoinFlow ? "Join room" : "Create room"}
          disabled={!canSubmit}
          type="submit"
        >
          {busy ? "..." : isJoinFlow ? "Join" : "Create"}
        </button>
      </form>

      {error && <p className="error-text">{error}</p>}
    </main>
  );
};
