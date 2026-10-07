import { useNavigate, useSearchParams } from "react-router";
import { useGameSession } from "../../game/GameSession";
import { roomPath } from "../../game/labels";
import { PlotsView } from "./PlotsView";
import type { PlotsLayout, PlotsScope } from "./PlotsView";

// The table / grid and Mine / All choices live in the URL, so Back from a plot returns to the same list.
export const PlotsScreen = () => {
  const { game, viewerId, roomCode } = useGameSession();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const scope: PlotsScope = params.get("scope") === "all" ? "all" : "mine";
  const layout: PlotsLayout = params.get("view") === "grid" ? "grid" : "table";

  const update = (next: { scope?: PlotsScope; layout?: PlotsLayout }) => {
    const query = new URLSearchParams();
    const nextScope = next.scope ?? scope;
    const nextLayout = next.layout ?? layout;
    if (nextScope === "all") {
      query.set("scope", "all");
    }
    if (nextLayout === "grid") {
      query.set("view", "grid");
    }
    setParams(query, { replace: true });
  };

  return (
    <PlotsView
      game={game}
      viewerId={viewerId}
      scope={scope}
      layout={layout}
      onScope={(value) => update({ scope: value })}
      onLayout={(value) => update({ layout: value })}
      onOpenPlot={(plotId) => navigate(roomPath(roomCode, `plots/${plotId}`))}
    />
  );
};
