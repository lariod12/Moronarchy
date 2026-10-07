import { useEffect, useId, useRef, useState } from "react";
import type { KeyboardEvent, ReactNode } from "react";
import { MAX_CHAT_TEXT_LENGTH } from "@moronarchy/core/match";
import type { LobbyView as LobbyViewModel, StartBlockedReason } from "@moronarchy/core/match";
import { TopBar } from "../../shell/TopBar/TopBar";
import { Button } from "../../ui/Button/Button";
import { Dialog } from "../../ui/Dialog/Dialog";
import { TextInput } from "../../ui/TextInput/TextInput";
import { SeatCard } from "./SeatCard";
import type { LobbyChatLine, LobbySlotModel } from "./lobby-model";
import "./LobbyView.css";

export const COPIED_BUBBLE_MS = 1500;

const START_HINTS: Record<StartBlockedReason, string> = {
  NOT_HOST: "Only the host can start the game",
  TOO_FEW_PLAYERS: "Need at least 2 players to start",
  NOT_READY: "Everyone must be ready to start"
};

export interface LobbyViewProps {
  roomCode: string;
  slots: Array<LobbySlotModel | null>;
  chat: LobbyChatLine[];
  lobby: LobbyViewModel;
  onCopyCode?: () => void;
  onReadyChange?: (ready: boolean) => void;
  onStart?: () => void;
  onSendChat?: (text: string) => void;
  onKick?: (playerId: string) => void;
  // Seeds for local UI state; lets the gallery show the chat row or the kick dialog directly.
  initialChatOpen?: boolean;
  initialKickTargetId?: string | null;
  overlay?: ReactNode;
}

export const LobbyView = ({
  roomCode,
  slots,
  chat,
  lobby,
  onCopyCode,
  onReadyChange,
  onStart,
  onSendChat,
  onKick,
  initialChatOpen = false,
  initialKickTargetId = null,
  overlay
}: LobbyViewProps) => {
  const [chatOpen, setChatOpen] = useState(initialChatOpen);
  const [draft, setDraft] = useState("");
  const [kickTargetId, setKickTargetId] = useState<string | null>(initialKickTargetId);
  const [copied, setCopied] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const chatInputRef = useRef<HTMLInputElement>(null);
  const startHintId = useId();

  useEffect(() => {
    const log = logRef.current;
    if (log) {
      log.scrollTop = log.scrollHeight;
    }
  }, [chat]);

  useEffect(() => {
    if (chatOpen) {
      chatInputRef.current?.focus();
    }
  }, [chatOpen]);

  useEffect(() => {
    if (!copied) {
      return;
    }
    const timer = setTimeout(() => setCopied(false), COPIED_BUBBLE_MS);
    return () => clearTimeout(timer);
  }, [copied]);

  const kickTarget = kickTargetId ? slots.find((slot) => slot?.playerId === kickTargetId) ?? null : null;
  const startBlocked = lobby.isHost && !lobby.canStart && lobby.startBlockedReason !== null;
  const canSend = lobby.isSeated && draft.trim().length > 0;

  const handleCopy = () => {
    onCopyCode?.();
    setCopied(true);
  };

  const sendDraft = () => {
    const text = draft.trim();
    if (!lobby.isSeated || !text) {
      return;
    }
    onSendChat?.(text);
    setDraft("");
  };

  const handleChatKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.nativeEvent.isComposing) {
      event.preventDefault();
      sendDraft();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setChatOpen(false);
    }
  };

  return (
    <div className="screen lobby">
      <TopBar roomCode={roomCode} onRoomPress={handleCopy} roomBubble={copied ? "copied!" : undefined} />

      <div className="lobby__seats" role="list" aria-label="Players">
        {slots.map((slot, index) => (
          <div role="listitem" key={slot?.playerId ?? `empty-${index}`} className="lobby__seat">
            <SeatCard
              slot={slot}
              onPress={slot && lobby.isHost && !slot.isSelf ? () => setKickTargetId(slot.playerId) : undefined}
            />
          </div>
        ))}
      </div>

      {chatOpen ? (
        <div className="lobby__chat-row">
          <TextInput
            ref={chatInputRef}
            value={draft}
            maxLength={MAX_CHAT_TEXT_LENGTH}
            placeholder="Say something…"
            aria-label="Chat message"
            enterKeyHint="send"
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleChatKeyDown}
          />
          <Button onClick={sendDraft} disabled={!canSend}>
            Send
          </Button>
        </div>
      ) : null}

      <div className="lobby__bar">
        <div className="lobby__log" ref={logRef} role="log" aria-label="Chat" tabIndex={0}>
          {chat.map((line) => (
            <p key={line.seq} className="lobby__log-line">
              {line.isSelf ? `${line.name} (you)` : line.name}: {line.text}
            </p>
          ))}
        </div>
        <Button className="lobby__bar-button" aria-expanded={chatOpen} disabled={!lobby.isSeated} onClick={() => setChatOpen((open) => !open)}>
          Chat
        </Button>
        {lobby.isHost ? (
          <>
            <Button
              className="lobby__bar-button"
              tone="strong"
              disabled={!lobby.canStart}
              aria-describedby={startBlocked ? startHintId : undefined}
              title={startBlocked && lobby.startBlockedReason ? START_HINTS[lobby.startBlockedReason] : undefined}
              onClick={onStart}
            >
              Start
            </Button>
            {startBlocked && lobby.startBlockedReason ? (
              <span id={startHintId} className="sr-only">
                {START_HINTS[lobby.startBlockedReason]}
              </span>
            ) : null}
          </>
        ) : (
          <Button
            className="lobby__bar-button"
            tone={lobby.isReady ? "strong" : "default"}
            aria-pressed={lobby.isReady}
            disabled={!lobby.isSeated}
            onClick={() => onReadyChange?.(!lobby.isReady)}
          >
            Ready
          </Button>
        )}
      </div>

      {kickTarget ? (
        <Dialog
          title={`Kick ${kickTarget.name}?`}
          actions={[
            { label: "No", onSelect: () => setKickTargetId(null) },
            {
              label: "Yes",
              tone: "strong",
              onSelect: () => {
                onKick?.(kickTarget.playerId);
                setKickTargetId(null);
              }
            }
          ]}
          onDismiss={() => setKickTargetId(null)}
        >
          They will be removed from the room.
        </Dialog>
      ) : null}
      {overlay}
    </div>
  );
};
