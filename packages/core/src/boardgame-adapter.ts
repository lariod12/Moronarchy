import {
  buyLand,
  completeTurn,
  createInitialState,
  rollDiceAndMove,
  skipTileAction,
  upgradeLand
} from "./state";
import type { MoronarchyState } from "./types";

type BoardgameRuntime = {
  G: MoronarchyState;
  ctx: {
    currentPlayer: string;
    numPlayers: number;
    playOrder?: string[];
  };
  playerID?: string;
  random?: {
    D6: () => number;
  };
  events?: {
    endTurn: (arg?: { next: string }) => void;
  };
};

const isCurrentPlayer = ({ ctx, playerID }: BoardgameRuntime): boolean => {
  return (playerID ?? ctx.currentPlayer) === ctx.currentPlayer;
};

const getAlivePlayerIds = (G: MoronarchyState, playOrder: readonly string[]): string[] => {
  const alive = new Set(G.players.filter((player) => !player.defeated).map((player) => player.id));
  return playOrder.filter((playerId) => alive.has(playerId));
};

export const getNextAlivePlayerId = (G: MoronarchyState, ctx: BoardgameRuntime["ctx"]): string | null => {
  const playOrder = ctx.playOrder ?? Array.from({ length: ctx.numPlayers }, (_, index) => String(index));
  const alivePlayerIds = getAlivePlayerIds(G, playOrder);
  if (alivePlayerIds.length === 0) return null;

  const currentIndex = playOrder.indexOf(ctx.currentPlayer);
  for (let offset = 1; offset <= playOrder.length; offset += 1) {
    const candidate = playOrder[(currentIndex + offset + playOrder.length) % playOrder.length];
    if (candidate && alivePlayerIds.includes(candidate)) {
      return candidate;
    }
  }

  return alivePlayerIds[0] ?? null;
};

const finishTurn = ({ G, ctx, events }: BoardgameRuntime): void => {
  const playOrder = ctx.playOrder ?? Array.from({ length: ctx.numPlayers }, (_, index) => String(index));
  completeTurn(G, ctx.currentPlayer, playOrder);
  if (G.phase !== "game-over") {
    const next = getNextAlivePlayerId(G, ctx);
    events?.endTurn(next ? { next } : undefined);
  }
};

const advanceDefeatedCurrentPlayer = (runtime: BoardgameRuntime): boolean => {
  const currentPlayer = runtime.G.players.find((player) => player.id === runtime.ctx.currentPlayer);
  if (!currentPlayer?.defeated) return false;

  finishTurn(runtime);
  return true;
};

export const createMoronarchyGameConfig = <TInvalidMove>(invalidMove: TInvalidMove) => ({
  name: "moronarchy",
  minPlayers: 2,
  maxPlayers: 4,
  setup: ({ ctx }: Pick<BoardgameRuntime, "ctx">): MoronarchyState =>
    createInitialState(Array.from({ length: ctx.numPlayers }, (_, index) => String(index))),
  moves: {
    chooseStartingPlayer: (runtime: BoardgameRuntime, startingPlayerId: string): TInvalidMove | void => {
      if (runtime.G.startingPlayerId) return invalidMove;
      if (runtime.ctx.currentPlayer !== "0" || runtime.playerID !== "0") return invalidMove;
      const startingPlayer = runtime.G.players.find((player) => player.id === startingPlayerId && !player.defeated);
      if (!startingPlayer) return invalidMove;

      runtime.G.startingPlayerId = startingPlayerId;
      if (startingPlayerId !== runtime.ctx.currentPlayer) {
        runtime.events?.endTurn({ next: startingPlayerId });
      }
    },
    rollDice: {
      client: false,
      move: (runtime: BoardgameRuntime): TInvalidMove | void => {
        if (!isCurrentPlayer(runtime)) return invalidMove;
        if (advanceDefeatedCurrentPlayer(runtime)) return;

        const diceValue = runtime.random?.D6() ?? 1;
        const result = rollDiceAndMove(runtime.G, runtime.ctx.currentPlayer, diceValue);
        if (!result.ok) return invalidMove;
        if (runtime.G.phase !== "tile-action" && runtime.G.phase !== "lap-upgrade") {
          finishTurn(runtime);
        }
      }
    },
    buyLand: (runtime: BoardgameRuntime): TInvalidMove | void => {
      if (!isCurrentPlayer(runtime)) return invalidMove;
      if (advanceDefeatedCurrentPlayer(runtime)) return;
      const result = buyLand(runtime.G, runtime.ctx.currentPlayer);
      if (!result.ok) return invalidMove;
      finishTurn(runtime);
    },
    upgradeLand: (runtime: BoardgameRuntime, tileId?: number): TInvalidMove | void => {
      if (!isCurrentPlayer(runtime)) return invalidMove;
      if (advanceDefeatedCurrentPlayer(runtime)) return;
      const result = upgradeLand(runtime.G, runtime.ctx.currentPlayer, tileId);
      if (!result.ok) return invalidMove;
      finishTurn(runtime);
    },
    skipTileAction: (runtime: BoardgameRuntime): TInvalidMove | void => {
      if (!isCurrentPlayer(runtime)) return invalidMove;
      if (advanceDefeatedCurrentPlayer(runtime)) return;
      const result = skipTileAction(runtime.G, runtime.ctx.currentPlayer);
      if (!result.ok) return invalidMove;
      finishTurn(runtime);
    },
    endTurn: (runtime: BoardgameRuntime): TInvalidMove | void => {
      if (!isCurrentPlayer(runtime)) return invalidMove;
      if (advanceDefeatedCurrentPlayer(runtime)) return;
      if (runtime.G.phase === "tile-action" || runtime.G.phase === "lap-upgrade") return invalidMove;
      finishTurn(runtime);
    }
  },
  endIf: ({ G }: { G: MoronarchyState }): { winner: string } | undefined => {
    return G.winnerId ? { winner: G.winnerId } : undefined;
  }
});
