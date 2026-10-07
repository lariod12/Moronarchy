import { useEffect, useRef, useState } from "react";
import type { ChatMessage } from "@moronarchy/core/match";

export const CHAT_BUBBLE_MS = 3000;

const getLastSeq = (chat: ChatMessage[]): number => chat.reduce((max, message) => Math.max(max, message.seq), 0);

// Maps playerId -> text of that player's latest chat message while it is still fresh.
// Messages that already exist when the hook mounts (history) never produce a bubble.
export const useChatBubbles = (chat: ChatMessage[], durationMs: number = CHAT_BUBBLE_MS): Record<string, string> => {
  const [bubbles, setBubbles] = useState<Record<string, { seq: number; text: string }>>({});
  const lastSeqRef = useRef<number | null>(null);
  const timersRef = useRef(new Map<string, ReturnType<typeof setTimeout>>());

  useEffect(() => {
    if (lastSeqRef.current === null) {
      lastSeqRef.current = getLastSeq(chat);
      return;
    }
    const lastSeq = lastSeqRef.current;
    const fresh = chat.filter((message) => message.seq > lastSeq);
    if (fresh.length === 0) {
      return;
    }
    lastSeqRef.current = getLastSeq(fresh);

    const latestByPlayer = new Map<string, ChatMessage>();
    for (const message of fresh) {
      latestByPlayer.set(message.playerId, message);
    }
    for (const [playerId, message] of latestByPlayer) {
      const previous = timersRef.current.get(playerId);
      if (previous) {
        clearTimeout(previous);
      }
      setBubbles((current) => ({ ...current, [playerId]: { seq: message.seq, text: message.text } }));
      timersRef.current.set(
        playerId,
        setTimeout(() => {
          timersRef.current.delete(playerId);
          setBubbles((current) => {
            if (current[playerId]?.seq !== message.seq) {
              return current;
            }
            const next = { ...current };
            delete next[playerId];
            return next;
          });
        }, durationMs)
      );
    }
  }, [chat, durationMs]);

  useEffect(() => {
    const timers = timersRef.current;
    return () => {
      for (const timer of timers.values()) {
        clearTimeout(timer);
      }
      timers.clear();
    };
  }, []);

  return Object.fromEntries(Object.entries(bubbles).map(([playerId, bubble]) => [playerId, bubble.text]));
};
