# Tech Stack

## Overview

Moronarchy MVP is a mobile-first multiplayer webapp. The stack favors fast iteration, full CSS control, shared TypeScript game logic, and server-authoritative turn validation.

## MVP Stack

| Area | Choice | Purpose |
| --- | --- | --- |
| Package manager | pnpm workspace | Monorepo with shared packages |
| Language | TypeScript | Shared types across game, web, server |
| Frontend | React + Vite | Mobile webapp UI |
| Styling | Tailwind CSS + plain CSS | Full control over board tiles, HUD, modals |
| Animation | Motion for React | UI transitions, dice feedback, token motion |
| Icons | Lucide React | Lightweight system icons |
| PWA | vite-plugin-pwa | Browser install flow later |
| Multiplayer | boardgame.io | Turn state, moves, lobby, realtime sync |
| Backend | Node.js + TypeScript | Multiplayer server |
| Testing | Vitest + Testing Library | Core, server, and UI checks |

## Runtime Environment

| Variable | Default | Purpose |
| --- | --- | --- |
| `PORT` | `8000` | Multiplayer server port |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Browser origins allowed by boardgame.io CORS |
| `VITE_GAME_SERVER_URL` | `http://localhost:8000` | Frontend lobby/socket server URL |

The MVP server uses in-memory rooms and a small in-memory lobby request guard. A deployed public server should still use platform or reverse-proxy rate limiting.

## Architecture Rule

Game logic lives in `packages/core` and must not depend on React, CSS, browser APIs, or server runtime details.

React renders state. The server validates moves. The core package owns dice, movement, land, rent, upgrades, level, and victory rules.

## Future Polish

These are intentionally not MVP dependencies:

- Rive: animated king avatar, crown, chest, win/lose animation.
- PixiJS: particle/glow/skill effect overlay if CSS/Motion is not enough.
- GSAP: complex animation timelines only if Motion becomes limiting.

Do not move board ownership or game rules into Rive, PixiJS, or animation components.
