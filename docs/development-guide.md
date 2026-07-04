# Development Guide

## Purpose

This guide explains how to update and maintain Moronarchy after the MVP scaffold.

Read order for new contributors:

1. `README.md`
2. `docs/system-architecture.md`
3. `docs/game-rules.md`
4. `docs/tech-stack.md`
5. This guide

## Local Development

Install dependencies:

```bash
pnpm install
```

Run web and server together:

```bash
pnpm dev
```

Open:

```text
http://localhost:5173
```

Server:

```text
http://localhost:8000
```

## Environment Variables

```text
PORT=8000
ALLOWED_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
VITE_GAME_SERVER_URL=http://localhost:8000
```

For LAN/mobile-device testing, add the LAN web origin to `ALLOWED_ORIGINS` and point `VITE_GAME_SERVER_URL` at the reachable server URL.

## Common Update Paths

### Change Land Price, Rent, Or Upgrade Cost

Edit:

- `packages/core/src/constants.ts`
- `docs/game-rules.md`

Then update or add tests in:

- `packages/core/test/state.test.ts`

Run:

```bash
pnpm --filter @moronarchy/core test
pnpm test
```

### Change Movement, Turn, Defeat, Or Victory Rules

Edit:

- `packages/core/src/state.ts`
- `packages/core/src/boardgame-adapter.ts` if boardgame.io turn behavior changes
- `docs/game-rules.md`
- `docs/system-architecture.md` if data flow changes

Tests to consider:

- `packages/core/test/state.test.ts`
- `packages/core/test/boardgame-adapter.test.ts`
- `tests/e2e/multiplayer.spec.ts`

### Change The Board UI

Edit:

- `apps/web/src/components/GameBoard.tsx`
- `apps/web/src/components/tile-layout.ts`
- `apps/web/src/styles/index.css`

Keep the board data-driven. Do not hard-code one draw function per tile.

Tests to consider:

- `apps/web/src/components/GameBoard.test.tsx`
- `pnpm e2e`

### Change Lobby Or Room Flow

Edit:

- `apps/web/src/api/lobby.ts`
- `apps/web/src/pages/HomePage.tsx`
- `apps/web/src/pages/RoomPage.tsx`
- `apps/server/src/security.ts` if trust-boundary behavior changes

Tests to consider:

- `apps/web/src/api/lobby.test.ts`
- `apps/server/src/security.test.ts`
- `tests/e2e/multiplayer.spec.ts`

### Add A New Game Move

1. Add or update pure logic in `packages/core/src/state.ts`.
2. Export any needed type/helper from `packages/core/src/index.ts`.
3. Add boardgame.io move wiring in `packages/core/src/boardgame-adapter.ts`.
4. Add UI action in `apps/web/src/components/ActionPanel.tsx` or a new component.
5. Add tests at core level first.
6. Add E2E coverage if the move changes multiplayer flow.

## Testing Checklist

Use the narrowest test first, then broaden:

```bash
pnpm --filter @moronarchy/core test
pnpm --filter @moronarchy/server test
pnpm --filter @moronarchy/web test
pnpm test
pnpm typecheck
pnpm lint
pnpm build
pnpm e2e
```

Expected current warning:

- `pnpm build` may warn that the main Vite chunk is above 500 kB because boardgame.io is bundled into the client. This is not a blocker for MVP.

## Code Ownership Rules

- `packages/core` owns game truth.
- `apps/server` owns multiplayer runtime, CORS, lobby guard, and server process.
- `apps/web` owns user experience and rendering.
- `docs` must be updated when rules, commands, architecture, environment variables, or public workflows change.

## Future Expansion Guidelines

### Action Cards

Put card resolution in `packages/core`, not in React.

Recommended shape:

- Card definitions in core.
- Move validation in core.
- Visual card hand in web.
- Server uses shared core move.

### Trap Or Special Tiles

Add tile type and resolver in core first. Then update board styles in web.

Required updates:

- `TileType` in `packages/core/src/types.ts`
- tile creation in `packages/core/src/state.ts`
- UI tile class handling in `GameBoard.tsx`
- docs/game-rules.md

### Rive

Use Rive only as an animated asset component, such as:

- `KingAvatar`
- `RewardChest`
- `VictoryBadge`

Do not put game state or rules inside Rive state machines.

### PixiJS

Use PixiJS only as an optional effects overlay if CSS/Motion becomes limiting.

Good fit:

- particles
- glow
- skill effects
- celebratory effects

Bad fit for current architecture:

- replacing all board rules
- replacing popup/shop/HUD UI
- storing authoritative game state

## Before Marking Work Done

At minimum:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm build
```

For multiplayer or route changes:

```bash
pnpm e2e
```

Also update docs when:

- rules change
- setup changes
- environment variables change
- folder ownership changes
- public behavior changes
- future maintainers need to know a decision
