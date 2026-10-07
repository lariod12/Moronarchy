import { createContext, useCallback, useContext, useMemo, useState } from "react";
import type { ReactNode } from "react";

export interface FightRevealValue {
  // The result popup (by its key) whose last round the Fight page has finished showing.
  revealedKey: string | null;
  markRevealed: (key: string) => void;
}

const FightRevealContext = createContext<FightRevealValue>({ revealedKey: null, markRevealed: () => undefined });

// Lets the Fight page tell the modal host that the last round was shown, so the result popup waits for it.
export const FightRevealProvider = ({ children }: { children: ReactNode }) => {
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const markRevealed = useCallback((key: string) => setRevealedKey(key), []);
  const value = useMemo(() => ({ revealedKey, markRevealed }), [revealedKey, markRevealed]);
  return <FightRevealContext.Provider value={value}>{children}</FightRevealContext.Provider>;
};

export const useFightReveal = (): FightRevealValue => useContext(FightRevealContext);
