import { useMemo } from "react";
import { Navigate, useParams } from "react-router";
import { getPlayerSession, normalizeRoomCode } from "../../api/lobby";
import { MatchProvider } from "../../match/MatchProvider";
import { RoomScreen } from "./RoomScreen";

// Opening a room link without a stored seat sends the visitor to the join form with the code prefilled.
export const RoomRoute = () => {
  const { roomCode = "" } = useParams();
  const code = normalizeRoomCode(roomCode);
  const session = useMemo(() => getPlayerSession(code), [code]);

  if (!session) {
    return <Navigate to={`/?room=${encodeURIComponent(code)}`} replace />;
  }

  return (
    <div className="phone-frame">
      <MatchProvider session={session}>
        <RoomScreen />
      </MatchProvider>
    </div>
  );
};
