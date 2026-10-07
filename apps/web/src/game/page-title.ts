import { ITEM_LABELS, RESIDENT_LABELS, isItemId, isResidentKind, plotLabel } from "./labels";

// The title in the TopBar for an in-game URL (`/room/<code>/<page>/<id>/<sub-id>`).
export const getPageTitle = (pathname: string): string => {
  const [page = "", id = "", sub = ""] = pathname.replace(/^\/room\/[^/]+\/?/, "").split("/");
  switch (page) {
    case "map":
      return "Map";
    case "cards":
      return "Upgrade Card";
    case "station":
      return "Start Station";
    case "fight":
      return "Fight";
    case "manage":
      return id ? plotLabel(Number(id)) : "Plot";
    case "stats":
      return "Players Info";
    case "plots":
      return id ? plotLabel(Number(id)) : "Plots";
    case "residents":
      // /residents/<kind> is the Warrior / Farmer list; a single resident (/residents/<kind>/<id>) stays "Residents".
      return id && !sub && isResidentKind(id) ? RESIDENT_LABELS[id] : "Residents";
    case "items":
      return id && isItemId(id) ? ITEM_LABELS[id] : "Items";
    case "events":
      return "Events";
    default:
      return "Home";
  }
};
