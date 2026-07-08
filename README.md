# Moronarchy

Moronarchy is a mobile-first multiplayer web board game where 2-4 kings roll dice around a 40-tile kingdom loop, buy land, charge rivals, upgrade territory, and fight to keep the crown.

## Tech Stack

- pnpm workspace
- TypeScript
- React + Vite + PWA
- Tailwind CSS + Motion
- Node.js + boardgame.io
- Vitest + Testing Library

## Project Structure

```text
apps/
  web/        React mobile webapp
  server/     Node.js boardgame.io multiplayer server
packages/
  core/       Shared pure TypeScript game rules
design/
  index.html  Interactive prototype hub
  *.html      One interactive UI frame per screen or game phase
  README.md   Design frame list, interaction rules, and porting notes
docs/
  game-rules.md
  system-architecture.md
  tech-stack.md
  development-guide.md
```

## Documentation

- [System architecture](docs/system-architecture.md): runtime flow, module boundaries, state ownership, and multiplayer data flow.
- [Development guide](docs/development-guide.md): how to update rules, UI, lobby flow, tests, and future features.
- [Game rules](docs/game-rules.md): MVP gameplay rules and economy.
- [Tech stack](docs/tech-stack.md): selected libraries, environment variables, and future visual layers.
- [Design task validation workflow](docs/design-task-validation-workflow.md): goal/expected-result approval and three-layer testing for interactive design tasks.

## Design Preview

Use `design/index.html` and `design/*.html` for quick interactive UI exploration before touching production React code.

The design folder is intentionally simple: `index.html` is the click-through prototype hub, and each standalone HTML file is one screen/frame with layout, CSS, local demo state, function names, and interaction notes. Approved designs can later be implemented in `apps/web`.

Before changing an interactive design frame, define the goal, expected results, and test workflow first. After the task, compare the actual result against that contract using the three-layer validation workflow in [docs/design-task-validation-workflow.md](docs/design-task-validation-workflow.md).

For real mobile-device UI testing, run:

```bash
pnpm design:mobile
```

Or double-click:

```text
start-design-mobile.bat
```

Keep the terminal window open, then open the printed LAN URL on a phone connected to the same Wi-Fi.

## Prerequisites

- Node.js 24+
- pnpm 11+

## Quick Start

```bash
pnpm install
pnpm build
pnpm dev
```

Open the web app at:

```text
http://localhost:5173
```

The multiplayer server runs at:

```text
http://localhost:8000
```

## Environment

```text
PORT=8000
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
VITE_GAME_SERVER_URL=http://localhost:8000
```

For public deployment, put the server behind a real reverse proxy or platform rate limit. The MVP server includes a small in-memory lobby guard, but it is not a substitute for production edge protection.

## Scripts

```bash
pnpm dev          # Build core, then run web + server together
pnpm dev:web      # Run only the web app
pnpm dev:server   # Run only the multiplayer server
pnpm design:mobile # Serve design/*.html on LAN for real phone testing
pnpm build        # Build core, server, and web
pnpm test         # Run all tests
pnpm typecheck    # Typecheck all packages
pnpm lint         # Lint all packages
pnpm e2e          # Run Playwright multiplayer smoke test
```

## MVP Rules

- Players: 2-4.
- Board: 40 tiles, tile 01 is Start, tiles 02-40 are land.
- Each king starts with 100 Health, 200 Coin, Level 1.
- Roll one six-sided die each turn.
- Passing or landing on Start gives 50 Coin.
- Completing a lap increases Level, capped at 3.
- Empty land can be bought if the player keeps at least 1 Coin.
- Owned land charges rent when rivals land on it.
- Land can be upgraded to Level 3 if the king level allows it.
- Forced rent that reduces Coin to 0 defeats the player.
- Last surviving king wins.
- If 30 full table rounds pass, highest total kingdom value wins.

## MVP Scope

Included:

- Shared game rules package
- boardgame.io multiplayer server
- Lobby create/join flow
- Mobile-first React board UI
- Basic buy, upgrade, roll, and victory flows

Deferred:

- Accounts
- Database
- Ranking
- AI opponents
- Action cards
- Trap tiles
- Rive animated assets
- PixiJS effects layer

## Notes

The board is rendered with React DOM for full CSS control. Rive and PixiJS are reserved for future visual polish and should be added behind component boundaries, not inside core game logic.
