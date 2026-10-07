import { useGameSession } from "../../game/GameSession";
import { EventsView } from "./EventsView";

export const EventsScreen = () => {
  const { game, viewerId } = useGameSession();
  return <EventsView game={game} viewerId={viewerId} />;
};
