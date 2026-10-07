# Moronarchy

Moronarchy is a mobile-first multiplayer web board game. 2–6 kings roll dice around a 40-tile kingdom, buy plots, recruit residents, upgrade at the Start station, raid rival land, and try not to go bankrupt. The last king standing wins.

> **Status: re-foundation in progress.** The design source of truth is [docs/All UI.png](docs/All%20UI.png). The new rules, screen spec and target architecture live in `docs/` (draft, awaiting approval). The code in `apps/` and `packages/` is still the earlier Monopoly-style MVP and will be refactored step by step — see [docs/architecture.md](docs/architecture.md#8-lộ-trình).

## Documentation

| Doc | Purpose |
| --- | --- |
| [docs/All UI.png](docs/All%20UI.png) | Original UI design (source of truth) |
| [docs/Tutorial button.png](docs/Tutorial%20button.png) | Crown / Back button behavior |
| [docs/ui/](docs/ui/) | Each design frame cropped from `All UI.png` |
| [docs/game-design.md](docs/game-design.md) | Game rules (GDD) |
| [docs/balance.md](docs/balance.md) | Proposed balance numbers + simulation results |
| [docs/screen-spec.md](docs/screen-spec.md) | Screens, navigation, visible states |
| [docs/architecture.md](docs/architecture.md) | Target architecture and refactor roadmap |
| [docs/interview-notes.md](docs/interview-notes.md) | Raw product-owner interview record |

## Tech Stack

- pnpm workspace, TypeScript
- React + Vite (PWA), plain CSS with design tokens (`apps/web/src/styles/tokens.css`), Balsamiq Sans font, Motion
- Node.js + boardgame.io (server-authoritative multiplayer)
- Vitest, Testing Library, Playwright

## Project Structure

```text
apps/
  web/        React mobile webapp
  server/     boardgame.io multiplayer server
packages/
  core/       Shared pure TypeScript game rules
docs/         Design source, GDD, screen spec, architecture
tests/
  ui/         Playwright checks for the dev gallery (pnpm ui:check)
  e2e/        Playwright multiplayer tests (pnpm e2e): create/join/chat/ready/start across several browsers
```

## Prerequisites

- Node.js 24+
- pnpm 11+

## Quick Start

```bash
pnpm install
pnpm build
pnpm dev
```

- Web app: http://localhost:5173
- UI gallery (dev only): http://localhost:5173/dev/gallery — every UI kit component and shell state with fake engine state. On a phone use `http://<LAN-IP>:5173/dev/gallery`.
- Multiplayer server: http://localhost:8000

## How to play locally

1. `pnpm install && pnpm dev`, then open http://localhost:5173 and enter a name.
2. Leave **Join room** empty and press **Create**. You land in the lobby; the room code (for example `R7K2M`) is in the top bar. Tap it to copy.
3. On other phones or browsers on the same Wi-Fi open `http://<LAN-IP>:5173` (find the IP with `ipconfig`), enter a name, type the code (case does not matter) and press **Join**. A link `http://<LAN-IP>:5173/?room=R7K2M` prefills the code.
4. Chat, tap **Ready**. The host gets a **Start** button that unlocks with at least 2 players once everyone else is ready; the host can also tap another seat to kick them.
5. Start shows a 3-2-1 countdown on every device, then the in-game Home hub. Reloading a room page keeps your seat.

Rooms live in server memory, so restarting the server closes them.

**Phones on the LAN need both ports open.** The web app (5173) and the game server (8000) are separate. If a phone loads the page but hangs or shows "Cannot reach the server" on Create/Join, Windows Firewall is blocking port 8000 for your network profile (check it with `Get-NetConnectionProfile`). Allow it from an Administrator PowerShell, and remove the rule when you are done:

```powershell
New-NetFirewallRule -DisplayName "Moronarchy-Dev-TCP-8000" -Direction Inbound -Protocol TCP -LocalPort 8000 -Action Allow -Profile Private
Remove-NetFirewallRule -DisplayName "Moronarchy-Dev-TCP-8000"
```

Do the same for 5173 if the page itself does not load.

## Environment

```text
PORT=8000
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
VITE_GAME_SERVER_URL=http://localhost:8000
```

Optional server variable `MORONARCHY_ABSENT_TIMEOUT_MS` (default `30000`): a player who is disconnected while the running game waits on them (their turn, their decision or their fight roll) for this long is removed from the game; their plots and residents return to the map. Players who stay connected are never timed out, and nobody is removed in the lobby or after the game.

`pnpm e2e` also reads `E2E_WEB_PORT` (default 5173) and `E2E_SERVER_PORT` (default 8000), for when another dev server already uses those ports.

Playwright starts the e2e game server with `MORONARCHY_ENABLE_TEST_SCENARIOS=1` automatically (see `playwright.config.ts`). That switch lets a test create a rigged room (`setupData: { scenario: "finale" }`) so the end-of-game e2e takes a couple of moves. Never set it yourself and never in production: without it the server refuses every room that asks for a scenario. It also sets `MORONARCHY_ABSENT_TIMEOUT_MS=4000` so `tests/e2e/robustness.spec.ts` can watch an absent player being removed in seconds.

For public deployment, put the server behind a real reverse proxy or platform rate limit. The in-memory lobby guard is not a substitute for edge protection.

## Scripts

```bash
pnpm dev          # Build core, then run web + server together
pnpm dev:web      # Run only the web app
pnpm dev:server   # Run only the multiplayer server
pnpm build        # Build core, server, and web
pnpm test         # Run all tests
pnpm typecheck    # Typecheck all packages
pnpm lint         # Lint all packages
pnpm e2e          # Run Playwright multiplayer tests (starts server + web if needed)
pnpm ui:check     # Playwright check of the dev gallery (console errors, overflow, long-press)
pnpm ui:check:headed # Same, with a visible browser
```
