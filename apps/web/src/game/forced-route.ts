import type { GameState, PlayerId } from "@moronarchy/core/engine";

export type ForcedPage = "cards" | "station";

// Some moments only make sense on one page: choosing the upgrade card, then the Start Station.
// Returns that page for the viewer (null when they are free to roam). Nothing is forced while the king walks.
export const getForcedPage = (game: GameState, viewerId: PlayerId, isAnimating: boolean): ForcedPage | null => {
  if (isAnimating || game.phase !== "playing" || game.turn.playerId !== viewerId || game.kings[viewerId]?.eliminated) {
    return null;
  }
  const { pending } = game;
  if (pending?.kind === "pickCard" && pending.playerId === viewerId) {
    return "cards";
  }
  if (game.turn.step === "startStation" && !pending) {
    return "station";
  }
  return null;
};

// In-game pages by their first path segment under /room/:code.
export const getPageName = (pathname: string): string => {
  const rest = pathname.replace(/^\/room\/[^/]+\/?/, "");
  return rest.split("/")[0] || "home";
};
