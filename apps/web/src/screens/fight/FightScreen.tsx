import { useEffect, useState } from "react";
import { Navigate } from "react-router";
import { getFightView, getFinalFightView, getItemCount } from "@moronarchy/core/engine";
import type { PlayerId } from "@moronarchy/core/engine";
import { fightResultKey, getLastFightEndSeq } from "../../game/fight-result";
import { useFightReveal } from "../../game/FightRevealContext";
import { useGameSession } from "../../game/GameSession";
import { FIGHT_ITEM_IDS, roomPath } from "../../game/labels";
import { RetreatConfirmDialog } from "../../game/dialogs/dialogs";
import { FightView } from "./FightView";
import { ItemSheet } from "./ItemSheet";
import { useRoundReveal } from "./useRoundReveal";

type Sheet = "items" | "retreat" | null;

// The running fight: derives everything from the engine's fight view and asks `canRun` before enabling a button.
// When the fight ends while this page is open it stays on the final view: the last round is revealed like any other,
// then the result popup (held by the modal host until then) closes the fight. A page opened with no fight leaves.
export const FightScreen = () => {
  const { game, viewerId, roomCode, actions, canRun } = useGameSession();
  const live = getFightView(game, viewerId);
  const [openedDuringFight] = useState(live !== null);
  const final = live === null && openedDuringFight ? getFinalFightView(game, viewerId) : null;
  const view = live ?? final;
  const reveal = useRoundReveal(view?.rounds.length ?? 0);
  const { markRevealed } = useFightReveal();
  const [sheet, setSheet] = useState<Sheet>(null);
  const endSeq = getLastFightEndSeq(game);
  const revealed = final !== null && endSeq !== null && !reveal.rolling;

  // The result popup may open once the last round has been shown.
  useEffect(() => {
    if (revealed && endSeq !== null) {
      markRevealed(fightResultKey(endSeq));
    }
  }, [revealed, endSeq, markRevealed]);

  if (!view) {
    // No fight to show (a reload after it ended, or a stale link): the result popup, if any, opens on the Map.
    return <Navigate to={roomPath(roomCode, "map")} replace />;
  }

  const viewer = game.kings[viewerId];
  const names: Record<PlayerId, string> = Object.fromEntries(Object.values(game.kings).map((king) => [king.id, king.name]));
  const items = viewer
    ? FIGHT_ITEM_IDS.filter((itemId) => getItemCount(viewer, itemId) > 0).map((itemId) => ({
        itemId,
        count: getItemCount(viewer, itemId),
        enabled: canRun("useItem", itemId)
      }))
    : [];
  const viewerSide = view.viewerRole === "attacker" ? view.attacker : view.viewerRole === "defender" ? view.defender : null;
  const openSheet = viewerSide?.hasRolled ? null : sheet;

  return (
    <>
      <FightView
        view={view}
        names={names}
        rolling={reveal.rolling}
        fresh={reveal.fresh}
        canUseItem={items.some((entry) => entry.enabled)}
        onRoll={actions.fightRoll}
        onUseItem={() => setSheet("items")}
        onRetreat={() => setSheet("retreat")}
      />
      {openSheet === "items" ? (
        <ItemSheet
          items={items}
          onUse={(itemId) => {
            setSheet(null);
            actions.useItem(itemId);
          }}
          onClose={() => setSheet(null)}
        />
      ) : null}
      {openSheet === "retreat" ? (
        <RetreatConfirmDialog
          fee={view.retreatFee}
          onNo={() => setSheet(null)}
          onYes={() => {
            setSheet(null);
            actions.retreat();
          }}
        />
      ) : null}
    </>
  );
};
