import { Atom, Boxes, Castle, Dices, SlidersHorizontal, UserRound } from "lucide-react";
import { claimTurn } from "@moronarchy/core/engine";
import type { GameState } from "@moronarchy/core/engine";
import { createSeededRng, createTestGame, setTurnStep } from "@moronarchy/core/testing";
import { toHudModel, toTopBarModel } from "../../game/hud-model";
import { BottomHud } from "../../shell/BottomHud/BottomHud";
import { GameShell } from "../../shell/GameShell/GameShell";
import { TopBar } from "../../shell/TopBar/TopBar";
import { Tile } from "../../ui/Tile/Tile";
import { TileGrid } from "../../ui/TileGrid/TileGrid";
import type { ReactNode } from "react";

export const ROOM_CODE = "R001";

export const HomeHub = () => (
  <TileGrid>
    <Tile title="Stats" icon={<SlidersHorizontal size={56} />} />
    <Tile title="Plots" icon={<Castle size={56} />} />
    <Tile title="Dice Status" icon={<Dices size={56} />} />
    <Tile title="Residents" icon={<UserRound size={56} />} />
    <Tile title="Items" icon={<Boxes size={56} />} />
    <Tile title="Events" icon={<Atom size={56} />} />
  </TileGrid>
);

export type ShellScenario = "idle" | "shaking" | "active" | "canEnd" | "eliminated";

// Builds an engine state that puts the viewer's crown into the wanted state.
export const createScenarioGame = (scenario: ShellScenario): { game: GameState; viewerId: string } => {
  const game = createTestGame(2);
  switch (scenario) {
    case "idle":
      return { game, viewerId: "1" };
    case "shaking":
      return { game, viewerId: "0" };
    case "active":
      claimTurn(game, "0", createSeededRng(1));
      return { game, viewerId: "0" };
    case "canEnd":
      setTurnStep(game, "postMove", "0");
      return { game, viewerId: "0" };
    case "eliminated": {
      const king = game.kings["1"];
      if (king) {
        king.eliminated = true;
      }
      return { game, viewerId: "1" };
    }
  }
};

export const renderShell = (
  scenario: ShellScenario,
  log: (action: string) => void,
  overlay?: ReactNode
): ReactNode => {
  const { game, viewerId } = createScenarioGame(scenario);
  const hud = toHudModel(game, viewerId);
  const top = toTopBarModel(game, ROOM_CODE, "Home");
  return (
    <GameShell
      top={<TopBar {...top} />}
      hud={
        <BottomHud
          {...hud}
          onAvatarPress={() => log("avatar")}
          onBack={() => log("back")}
          onCrownPress={() => log("press")}
          onCrownLongPress={() => log("longPress")}
        />
      }
      overlay={overlay}
    >
      <HomeHub />
    </GameShell>
  );
};
