import { getItemCount } from "@moronarchy/core/engine";
import { Navigate, useNavigate, useParams } from "react-router";
import { useGameSession } from "../../game/GameSession";
import { isItemId, roomPath } from "../../game/labels";
import { ItemDetailView } from "./ItemDetailView";
import { ItemsView } from "./ItemsView";

export const ItemsScreen = () => {
  const { game, viewerId, roomCode } = useGameSession();
  const navigate = useNavigate();
  return <ItemsView game={game} viewerId={viewerId} onOpenItem={(itemId) => navigate(roomPath(roomCode, `items/${itemId}`))} />;
};

// An item that is no longer in the bag (used up) sends the viewer back to the list.
export const ItemDetailScreen = () => {
  const { game, viewerId, roomCode, actions, canRun } = useGameSession();
  const { itemId = "" } = useParams();
  const king = game.kings[viewerId];

  if (!isItemId(itemId) || !king || getItemCount(king, itemId) === 0) {
    return <Navigate to={roomPath(roomCode, "items")} replace />;
  }

  return <ItemDetailView game={game} viewerId={viewerId} itemId={itemId} canRun={canRun} onUse={actions.useItem} />;
};
