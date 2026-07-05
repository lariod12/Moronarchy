const startingPlayerKey = (matchID: string): string => `moronarchy:starting-player:${matchID}`;

export const saveStartingPlayerId = (matchID: string, playerID: string): void => {
  sessionStorage.setItem(startingPlayerKey(matchID), playerID);
};

export const getStartingPlayerId = (matchID: string): string | null => {
  return sessionStorage.getItem(startingPlayerKey(matchID));
};
