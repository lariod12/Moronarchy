import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { createRoom, describeLobbyError, joinRoom, LobbyError, normalizeRoomCode } from "../../api/lobby";
import type { LobbyErrorCode } from "../../api/lobby";
import { WelcomeView } from "./WelcomeView";
import type { WelcomeBusy } from "./WelcomeView";

export const WelcomeScreen = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [name, setName] = useState("");
  const [roomCode, setRoomCode] = useState(() => normalizeRoomCode(searchParams.get("room") ?? ""));
  const [busy, setBusy] = useState<WelcomeBusy>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    if (busy) {
      return;
    }
    const joining = roomCode.trim().length > 0;
    setError(null);
    setBusy(joining ? "joining" : "creating");
    try {
      const session = joining ? await joinRoom(roomCode, name) : await createRoom(name);
      navigate(`/room/${session.matchID}`);
    } catch (caught) {
      const code: LobbyErrorCode = caught instanceof LobbyError ? caught.code : "NETWORK";
      setError(describeLobbyError(code));
      setBusy(null);
    }
  };

  return (
    <div className="phone-frame">
      <WelcomeView
        name={name}
        roomCode={roomCode}
        busy={busy}
        error={error}
        onNameChange={setName}
        onRoomCodeChange={(value) => {
          setRoomCode(value.toUpperCase());
          setError(null);
        }}
        onSubmit={() => void handleSubmit()}
      />
    </div>
  );
};
