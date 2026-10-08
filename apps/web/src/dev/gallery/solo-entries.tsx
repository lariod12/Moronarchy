import { useState } from "react";
import { BotControlView } from "../../solo/BotControl";
import { DEFAULT_SOLO_SETTINGS } from "../../solo/solo-settings";
import type { SoloSettings, SoloSpeed } from "../../solo/solo-settings";
import { SoloSetupView } from "../../solo/SoloSetupView";
import { UpdateBannerView } from "../../solo/UpdateBanner";
import { frame, mapContent } from "./game-entries";
import type { Log } from "./game-entries";
import * as scenarios from "./game-fixtures";
import type { GalleryEntry } from "./types";

const SoloSetupDemo = ({ log }: { log: Log }) => {
  const [settings, setSettings] = useState<SoloSettings>({ ...DEFAULT_SOLO_SETTINGS, name: "Aria" });
  return <SoloSetupView settings={settings} onChange={setSettings} onStart={() => log(`start:${settings.bots}:${settings.style}:${settings.speed}`)} onBack={() => log("back")} />;
};

const BotControlDemo = ({ log, initialPaused, initialExpanded }: { log: Log; initialPaused: boolean; initialExpanded: boolean }) => {
  const [paused, setPaused] = useState(initialPaused);
  const [expanded, setExpanded] = useState(initialExpanded);
  const [speed, setSpeed] = useState<SoloSpeed>("normal");
  const scenario = scenarios.mapMidgame();
  return frame(
    scenario,
    "Map",
    mapContent(scenario, log),
    log,
    <BotControlView
      speed={speed}
      paused={paused}
      expanded={expanded}
      onToggle={() => setExpanded((open) => !open)}
      onSpeedChange={(next) => {
        setSpeed(next);
        log(`speed:${next}`);
      }}
      onPauseChange={(next) => {
        setPaused(next);
        log(next ? "pause" : "resume");
      }}
      onNewGame={() => log("newGame")}
    />
  );
};

// The solo mode: its setup screen and the floating bot control over a game page.
export const SOLO_ENTRIES: GalleryEntry[] = [
  {
    id: "solo-setup",
    group: "Solo",
    title: "Solo setup",
    render: (log) => <SoloSetupDemo log={log} />
  },
  {
    id: "solo-bot-control",
    group: "Solo",
    title: "Bots control (open)",
    render: (log) => <BotControlDemo log={log} initialPaused={false} initialExpanded />
  },
  {
    id: "solo-bot-control-paused",
    group: "Solo",
    title: "Bots control (paused)",
    render: (log) => <BotControlDemo log={log} initialPaused initialExpanded={false} />
  },
  {
    id: "solo-update-banner",
    group: "Solo",
    title: "New version banner (GitHub Pages)",
    render: (log) => <UpdateBannerView onReload={() => log("reload")} />
  }
];
