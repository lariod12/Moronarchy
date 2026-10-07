import { useCallback } from "react";
import { useNavigate } from "react-router";
import { clearPlayerSession } from "../api/lobby";
import { useMatch } from "./MatchProvider";

// Quit: gives the seat back (the match accepts that between games), forgets the session and goes to Welcome.
// It does not wait for the server: the move is sent first, then the page moves on.
export const useLeaveRoom = (): (() => void) => {
  const { matchID, send, leaveTo = "/" } = useMatch();
  const navigate = useNavigate();
  return useCallback(() => {
    send("leaveSeat");
    clearPlayerSession(matchID);
    navigate(leaveTo, { replace: true });
  }, [send, matchID, leaveTo, navigate]);
};
