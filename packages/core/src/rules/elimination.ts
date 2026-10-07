import type { GameState, PlayerId } from "../model/types";
import { pushLog } from "./log";
import { releasePlot } from "./plots";
import { removeResident } from "./residents";

export const getAliveKingIds = (state: GameState): PlayerId[] =>
  state.turnOrder.filter((id) => !state.kings[id]?.eliminated);

export const eliminate = (state: GameState, playerId: PlayerId): void => {
  const king = state.kings[playerId];
  if (!king || king.eliminated) {
    return;
  }
  king.eliminated = true;
  king.eliminatedRound = state.round;
  king.coin = 0;
  state.eliminationOrder.push(playerId);
  for (const plot of state.plots) {
    if (plot.ownerId === playerId) {
      releasePlot(state, plot);
    }
  }
  for (const resident of Object.values(state.residents)) {
    if (resident.ownerId === playerId) {
      removeResident(state, resident.id);
    }
  }
  pushLog(state, "kingEliminated", playerId, { round: state.round });

  const alive = getAliveKingIds(state);
  if (alive.length === 1) {
    state.phase = "finished";
    state.winnerId = alive[0] ?? null;
    state.pending = null;
    state.fight = null;
    pushLog(state, "gameFinished", state.winnerId, { round: state.round });
  }
};

// Bankruptcy is the only elimination cause: a payer who cannot cover the fee hands over everything and is out.
export const chargeFee = (
  state: GameState,
  payerId: PlayerId,
  ownerId: PlayerId,
  amount: number
): { paid: number; eliminated: boolean } => {
  const payer = state.kings[payerId];
  const owner = state.kings[ownerId];
  if (!payer || !owner) {
    return { paid: 0, eliminated: false };
  }
  if (payer.coin >= amount) {
    payer.coin -= amount;
    owner.coin += amount;
    pushLog(state, "feePaid", payerId, { ownerId, amount });
    return { paid: amount, eliminated: false };
  }
  const paid = payer.coin;
  owner.coin += paid;
  payer.coin = 0;
  pushLog(state, "feePaid", payerId, { ownerId, amount: paid, bankrupt: true });
  eliminate(state, payerId);
  return { paid, eliminated: true };
};

export const getFinalRanking = (state: GameState): PlayerId[] => {
  const ranking: PlayerId[] = state.winnerId ? [state.winnerId] : [];
  return [...ranking, ...[...state.eliminationOrder].reverse()];
};
