import { createContext, useContext } from "react";
import type { ReactNode } from "react";

// Extra content a host app wants inside the in-game layout, where the movement and session contexts exist.
// Online it is empty; the solo mode puts its bot driver and its floating control here.
const GameExtrasContext = createContext<ReactNode>(null);

export const GameExtrasProvider = GameExtrasContext.Provider;

export const useGameExtras = (): ReactNode => useContext(GameExtrasContext);
