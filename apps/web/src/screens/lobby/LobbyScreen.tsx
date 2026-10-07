import type { ReactNode } from "react";
import { getLobbyView } from "@moronarchy/core/match";
import { useMatch } from "../../match/MatchProvider";
import { LobbyView } from "./LobbyView";
import { toChatLines, toLobbySlots } from "./lobby-model";
import { useChatBubbles } from "./useChatBubbles";

const copyToClipboard = (text: string): void => {
  try {
    void navigator.clipboard?.writeText(text).catch(() => undefined);
  } catch {
    // Clipboard access can be blocked; the "copied!" bubble is cosmetic.
  }
};

export interface LobbyScreenProps {
  overlay?: ReactNode;
}

export const LobbyScreen = ({ overlay }: LobbyScreenProps) => {
  const { state, playerID, roomCode, players, selfConnected, send } = useMatch();
  const bubbles = useChatBubbles(state?.chat ?? []);
  if (!state) {
    return null;
  }

  return (
    <LobbyView
      roomCode={roomCode}
      slots={toLobbySlots(state, playerID, players, bubbles)}
      chat={toChatLines(state, playerID)}
      lobby={getLobbyView(state, playerID)}
      onCopyCode={() => copyToClipboard(roomCode)}
      onReadyChange={(ready) => send("setReady", ready)}
      onStart={() => send("startGame")}
      onSendChat={(text) => send("sendChat", text)}
      onKick={(targetId) => send("kickSeat", targetId)}
      selfConnected={selfConnected}
      overlay={overlay}
    />
  );
};
