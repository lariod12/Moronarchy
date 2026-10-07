import type { ReactNode } from "react";
import { Atom, Boxes, Castle, Dices, SlidersHorizontal, UserRound } from "lucide-react";
import { Avatar } from "../../ui/Avatar/Avatar";
import { BlockingOverlay } from "../../ui/BlockingOverlay/BlockingOverlay";
import { CrownButton } from "../../shell/CrownButton/CrownButton";
import type { CrownButtonState } from "../../shell/CrownButton/CrownButton";
import { DataTable } from "../../ui/DataTable/DataTable";
import { Dialog } from "../../ui/Dialog/Dialog";
import { createTestGame } from "@moronarchy/core/testing";
import { Dice } from "../../ui/Dice/Dice";
import { HealthBar } from "../../ui/HealthBar/HealthBar";
import { IconButton } from "../../ui/IconButton/IconButton";
import { BackIcon, CrownIcon } from "../../ui/icons";
import { LongPressButton } from "../../ui/LongPressButton/LongPressButton";
import { SketchBox } from "../../ui/SketchBox/SketchBox";
import { SpeechBubble } from "../../ui/SpeechBubble/SpeechBubble";
import { StatList, StatTag } from "../../ui/StatTag/StatTag";
import { Tag } from "../../ui/Tag/Tag";
import { Tile } from "../../ui/Tile/Tile";
import { TileGrid } from "../../ui/TileGrid/TileGrid";
import { TopBar } from "../../shell/TopBar/TopBar";
import { GameHomeView } from "../../screens/game/GameHomeView";
import { LobbyView } from "../../screens/lobby/LobbyView";
import { WelcomeView } from "../../screens/welcome/WelcomeView";
import { END_TURN_TEXT } from "../../game/dialogs/dialogs";
import { GAME_ENTRIES } from "./game-entries";
import { HomeHub, renderShell, ROOM_CODE } from "./fixtures";
import { createLobbyState, lobbyGuestReady, lobbyHostCanStart, lobbyHostWaiting, toLobbyViewProps } from "./lobby-fixtures";
import type { GalleryEntry } from "./types";
import "./gallery.css";

interface PlotRow {
  id: number;
  level: number;
  income: number;
  price: number;
}

const PLOT_ROWS: PlotRow[] = [
  { id: 1, level: 0, income: 0, price: 0 },
  { id: 2, level: 1, income: 1, price: 1 },
  { id: 3, level: 2, income: 2, price: 2 },
  { id: 4, level: 3, income: 3, price: 3 },
  { id: 5, level: 0, income: 0, price: 0 },
  { id: 6, level: 1, income: 1, price: 1 },
  { id: 7, level: 2, income: 2, price: 2 },
  { id: 8, level: 4, income: 4, price: 4 },
  { id: 9, level: 0, income: 0, price: 0 }
];

const PLOT_COLUMNS = [
  { key: "id", header: "Plots" },
  { key: "level", header: "Level" },
  { key: "income", header: "Income" },
  { key: "price", header: "Price" }
];

const CROWN_STATES: CrownButtonState[] = ["idle", "shaking", "active", "canEndTurn", "eliminated", "finished"];

const Stack = ({ children }: { children: ReactNode }) => <div className="gallery-stack">{children}</div>;

export const GALLERY_ENTRIES: GalleryEntry[] = [
  {
    id: "tag",
    group: "Basics",
    title: "Tag",
    render: () => (
      <Stack>
        <Tag>Round 1</Tag>
        <Tag>R001</Tag>
        <Tag tone="muted">health: 100</Tag>
      </Stack>
    )
  },
  {
    id: "sketch-box",
    group: "Basics",
    title: "SketchBox",
    render: () => (
      <Stack>
        <SketchBox title="Plain box">Content</SketchBox>
        <SketchBox title="With shadow" shadow>
          Content
        </SketchBox>
      </Stack>
    )
  },
  {
    id: "tile-grid",
    group: "Basics",
    title: "TileGrid (Home hub)",
    render: (log) => (
      <Stack>
        <TileGrid>
          <Tile title="Stats" icon={<SlidersHorizontal size={56} />} onClick={() => log("Stats")} />
          <Tile title="Plots" icon={<Castle size={56} />} onClick={() => log("Plots")} />
          <Tile title="Dice Status" icon={<Dices size={56} />} onClick={() => log("Dice Status")} />
          <Tile title="Residents" icon={<UserRound size={56} />} onClick={() => log("Residents")} />
          <Tile title="Items" icon={<Boxes size={56} />} badge="x4" onClick={() => log("Items")} />
          <Tile title="Events" icon={<Atom size={56} />} badge="Level: 2" disabled />
        </TileGrid>
      </Stack>
    )
  },
  {
    id: "data-table",
    group: "Basics",
    title: "DataTable (plots)",
    render: (log) => (
      <DataTable
        columns={PLOT_COLUMNS}
        rows={PLOT_ROWS}
        getRowId={(row) => row.id}
        initialSelectedId={2}
        onRowAction={(row) => log(`details ${row.id}`)}
        maxHeight={360}
        footerLabel="View All"
        onFooterAction={() => log("View All")}
      />
    )
  },
  {
    id: "dialog-confirm",
    group: "Overlays",
    title: "Dialog (confirm)",
    render: (log) => (
      <>
        <HomeHub />
        <Dialog
          title="End of turn"
          actions={[
            { label: "No", onSelect: () => log("No") },
            { label: "Yes", onSelect: () => log("Yes") }
          ]}
          onDismiss={() => log("dismiss")}
        >
          {END_TURN_TEXT}
        </Dialog>
      </>
    )
  },
  {
    id: "dialog-done",
    group: "Overlays",
    title: "Dialog (done)",
    render: (log) => (
      <>
        <HomeHub />
        <Dialog title="Congratulation!" actions={[{ label: "Done", onSelect: () => log("Done") }]} onDismiss={() => log("dismiss")}>
          You upgraded your plot.
        </Dialog>
      </>
    )
  },
  {
    id: "overlay-waiting",
    group: "Overlays",
    title: "BlockingOverlay (waiting)",
    render: () => <BlockingOverlay title="Waiting for creating room" />
  },
  {
    id: "overlay-starting",
    group: "Overlays",
    title: "BlockingOverlay (starting)",
    render: () => <BlockingOverlay title="Game Starting" subtitle="3" />
  },
  {
    id: "speech-bubbles",
    group: "Basics",
    title: "SpeechBubble",
    render: () => (
      <div className="gallery-bubbles">
        <SpeechBubble tail="bottom-left">your turn!</SpeechBubble>
        <SpeechBubble tail="bottom-right">end turn!</SpeechBubble>
        <SpeechBubble tail="top-left">a tooltip</SpeechBubble>
        <SpeechBubble tail="left">Do something ...</SpeechBubble>
      </div>
    )
  },
  {
    id: "stat-list",
    group: "Basics",
    title: "StatTag / StatList",
    render: () => (
      <Stack>
        <StatTag label="Level" value={1} />
        <StatList
          stats={[
            { label: "health", value: 100 },
            { label: "coin", value: 100 },
            { label: "level", value: 1 }
          ]}
        />
        <StatList muted stats={[{ label: "health", value: 0 }]} />
      </Stack>
    )
  },
  {
    id: "dice-faces",
    group: "Basics",
    title: "Dice",
    render: () => (
      <div className="gallery-row">
        <Dice value={1} />
        <Dice value={2} />
        <Dice value={3} />
        <Dice value={4} />
        <Dice value={5} />
        <Dice value={6} />
        <Dice value={5} rolling />
      </div>
    )
  },
  {
    id: "health-bars",
    group: "Basics",
    title: "HealthBar",
    render: () => (
      <Stack>
        <HealthBar current={50} max={100} />
        <HealthBar current={80} max={100} />
        <HealthBar current={0} max={100} />
      </Stack>
    )
  },
  {
    id: "avatars",
    group: "Basics",
    title: "Avatar",
    render: () => (
      <div className="gallery-row">
        <Avatar name="King 0" />
        <Avatar name="King 1" crossed />
        <Avatar size="sm" />
      </div>
    )
  },
  {
    id: "long-press",
    group: "Controls",
    title: "LongPressButton",
    render: (log) => (
      <div className="gallery-row">
        <div className="gallery-box">
          <LongPressButton aria-label="Long press demo" onPress={() => log("press")} onLongPress={() => log("longPress")}>
            <CrownIcon width={48} />
          </LongPressButton>
        </div>
        <div className="gallery-box">
          <IconButton aria-label="Back demo" onClick={() => log("back")}>
            <BackIcon />
          </IconButton>
        </div>
      </div>
    )
  },
  {
    id: "topbar",
    group: "Shell",
    title: "TopBar",
    render: () => (
      <Stack>
        <TopBar round={1} roomCode={ROOM_CODE} title="Home" />
        <TopBar round={22} roomCode={ROOM_CODE} title="Plots" inflation={1.25} />
        <TopBar roomCode={ROOM_CODE} />
      </Stack>
    )
  },
  {
    id: "crown-states",
    group: "Shell",
    title: "CrownButton states",
    render: (log) => (
      <div className="gallery-crowns">
        {CROWN_STATES.map((state) => (
          <div key={state} className="gallery-crown-cell">
            <span className="gallery-label">{state}</span>
            <div className="gallery-crown-slot">
              <CrownButton state={state} onPress={() => log(`${state}:press`)} onLongPress={() => log(`${state}:longPress`)} />
            </div>
          </div>
        ))}
      </div>
    )
  },
  {
    id: "shell-idle",
    group: "Shell",
    title: "Shell: idle",
    render: (log) => renderShell("idle", log)
  },
  {
    id: "shell-shaking",
    group: "Shell",
    title: "Shell: shaking crown",
    render: (log) => renderShell("shaking", log)
  },
  {
    id: "shell-active",
    group: "Shell",
    title: "Shell: your turn",
    render: (log) => renderShell("active", log)
  },
  {
    id: "shell-can-end",
    group: "Shell",
    title: "Shell: can end turn",
    render: (log) => renderShell("canEnd", log)
  },
  {
    id: "shell-eliminated",
    group: "Shell",
    title: "Shell: eliminated",
    render: (log) => renderShell("eliminated", log)
  },
  {
    id: "shell-with-dialog",
    group: "Shell",
    title: "Shell: end turn dialog",
    render: (log) =>
      renderShell(
        "canEnd",
        log,
        <Dialog
          title="End of turn"
          actions={[
            { label: "No", onSelect: () => log("No") },
            { label: "Yes", onSelect: () => log("Yes") }
          ]}
          onDismiss={() => log("dismiss")}
        >
          {END_TURN_TEXT}
        </Dialog>
      )
  },
  {
    id: "welcome-empty",
    group: "Screens",
    title: "Welcome: empty",
    render: (log) => <WelcomeView name="" roomCode="" onSubmit={() => log("submit")} />
  },
  {
    id: "welcome-create",
    group: "Screens",
    title: "Welcome: create",
    render: (log) => <WelcomeView name="Alice" roomCode="" onSubmit={() => log("create")} />
  },
  {
    id: "welcome-join",
    group: "Screens",
    title: "Welcome: join",
    render: (log) => <WelcomeView name="Bob" roomCode="RABCD" onSubmit={() => log("join")} />
  },
  {
    id: "welcome-error",
    group: "Screens",
    title: "Welcome: error",
    render: () => <WelcomeView name="Bob" roomCode="RZZZZ" error="Room not found" />
  },
  {
    id: "welcome-busy",
    group: "Screens",
    title: "Welcome: waiting for room",
    render: () => <WelcomeView name="Alice" roomCode="" busy="creating" />
  },
  {
    id: "lobby-host-waiting",
    group: "Screens",
    title: "Lobby: host waiting",
    render: (log) => (
      <LobbyView
        {...toLobbyViewProps(lobbyHostWaiting(), "0", ROOM_CODE)}
        onCopyCode={() => log("copy")}
        onStart={() => log("start")}
        onSendChat={(text) => log(`chat:${text}`)}
        onKick={(id) => log(`kick:${id}`)}
      />
    )
  },
  {
    id: "lobby-host-can-start",
    group: "Screens",
    title: "Lobby: host can start",
    render: (log) => (
      <LobbyView {...toLobbyViewProps(lobbyHostCanStart(), "0", ROOM_CODE)} onStart={() => log("start")} onKick={(id) => log(`kick:${id}`)} />
    )
  },
  {
    id: "lobby-guest-ready",
    group: "Screens",
    title: "Lobby: guest ready, bubble, offline seat",
    render: (log) => (
      <LobbyView
        {...toLobbyViewProps(lobbyGuestReady(), "1", ROOM_CODE, {
          players: [{ id: "3", isConnected: false }],
          bubbles: { "0": "Do something ...", "2": "don't leave me..." }
        })}
        onReadyChange={(ready) => log(`ready:${ready}`)}
      />
    )
  },
  {
    id: "lobby-chat-open",
    group: "Screens",
    title: "Lobby: chat input open",
    render: (log) => (
      <LobbyView
        {...toLobbyViewProps(lobbyHostWaiting(), "1", ROOM_CODE)}
        initialChatOpen
        onReadyChange={(ready) => log(`ready:${ready}`)}
        onSendChat={(text) => log(`chat:${text}`)}
      />
    )
  },
  {
    id: "lobby-kick-dialog",
    group: "Screens",
    title: "Lobby: kick dialog",
    render: (log) => (
      <LobbyView {...toLobbyViewProps(lobbyHostWaiting(), "0", ROOM_CODE)} initialKickTargetId="1" onKick={(id) => log(`kick:${id}`)} />
    )
  },
  {
    id: "lobby-starting",
    group: "Screens",
    title: "Lobby: game starting",
    render: () => (
      <LobbyView
        {...toLobbyViewProps(
          createLobbyState({
            seats: [
              { id: "0", name: "Alice", ready: true },
              { id: "1", name: "Bob", ready: true },
              { id: "2", name: "Cara", ready: true }
            ]
          }),
          "1",
          ROOM_CODE
        )}
        overlay={<BlockingOverlay title="Game Starting" subtitle="2" />}
      />
    )
  },
  {
    id: "game-home",
    group: "Screens",
    title: "Game: Home hub (your turn to claim)",
    render: (log) => (
      <GameHomeView
        game={createTestGame(3)}
        viewerId="0"
        roomCode={ROOM_CODE}
        onAvatarPress={() => log("avatar")}
        onBack={() => log("back")}
        onCrownPress={() => log("press")}
        onCrownLongPress={() => log("longPress")}
      />
    )
  },
  ...GAME_ENTRIES
];
