import { useState } from "react";
import { Navigate, useNavigate } from "react-router";
import type { CardOffer } from "@moronarchy/core/engine";
import { useGameSession } from "../../game/GameSession";
import { roomPath } from "../../game/labels";
import { CardPickView } from "./CardPickView";

// Pick one of three upgrade cards: tap, "Are you sure?", "Congratulation!", then on to the Start Station.
export const CardPickScreen = () => {
  const { game, viewerId, roomCode, actions } = useGameSession();
  const navigate = useNavigate();
  const [selected, setSelected] = useState<number | null>(null);
  const [offers, setOffers] = useState<CardOffer[]>([]);
  const [congrats, setCongrats] = useState<CardOffer | null>(null);

  const { pending } = game;
  const live = pending?.kind === "pickCard" && pending.playerId === viewerId ? pending.offers : null;
  const shownOffers = live ?? offers;

  if (!live && !congrats) {
    const page = game.turn.playerId === viewerId && game.turn.step === "startStation" ? "station" : "home";
    return <Navigate to={roomPath(roomCode, page)} replace />;
  }

  return (
    <CardPickView
      offers={shownOffers}
      onPick={setSelected}
      confirmIndex={congrats ? null : selected}
      onConfirmNo={() => setSelected(null)}
      onConfirmYes={() => {
        const offer = selected === null ? undefined : shownOffers[selected];
        if (selected === null || !offer) {
          return;
        }
        setOffers(shownOffers);
        setCongrats(offer);
        setSelected(null);
        actions.pickCard(selected);
      }}
      congrats={congrats}
      onCongratsDone={() => navigate(roomPath(roomCode, "station"), { replace: true })}
    />
  );
};
