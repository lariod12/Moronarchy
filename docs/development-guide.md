# Development Guide

## Purpose

This guide explains how to update and maintain Moronarchy after the MVP scaffold.

Read order for new contributors:

1. `README.md`
2. `docs/system-architecture.md`
3. `docs/game-rules.md`
4. `docs/tech-stack.md`
5. This guide

## Design Preview Workflow

Use `design/index.html` and `design/*.html` as functional prototypes before changing production UI. The frames should be complete enough to review an idea immediately, but their local rule and multiplayer simulations are not production authority.

Ownership boundary:

| Concern | Authority |
| --- | --- |
| Approved player experience, visible states, and interaction flow | `design/*.html` production contract |
| Game rules, economy, validation, victory, and defeat | `packages/core` |
| Multiplayer authority and synchronization | `apps/server` plus boardgame.io |
| Production rendering and accessibility | `apps/web` |

Rules:

- Each `.html` file in `design/` represents one screen or game phase.
- `design/index.html` is the review hub and should link to every frame.
- Put layout, CSS, functional local simulation, and quick UI ideas directly in the frame file.
- Put a `DESIGN FRAME SPEC` comment at the top of every design HTML file. It must include lifecycle status, production contract, prototype simulations, prototype tooling, production mapping, scope, and acceptance criteria.
- Treat each design HTML file as the design memory for that screen. Any approved idea, user feedback, visual exception, or interaction workflow must be recorded in the relevant HTML comments/spec before or while the frame is changed.
- Make the frame interactive enough to test that screen's main action.
- Use descriptive classes, `data-*` attributes, function names, and comments so implementers can understand the intended production behavior from the HTML file.
- Use `data-nav` for buttons or links that move to another design frame.
- Use `data-action` for local prototype actions or fake versions of future game/server moves.
- Use `data-modal-open`, `data-modal-close`, and `data-modal` for popup behavior inside the same frame.
- Use `data-bind` for sample state that frame JavaScript renders.
- Add named region comments around major CSS, HTML, and JavaScript responsibilities. Large frames should keep configuration/state, mock multiplayer, tooling, rendering, interaction simulation, motion, and generic utilities visibly separate.
- Use cross-platform typography in design frames. Prefer `system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", "Helvetica Neue", Arial, sans-serif`; avoid Windows-only decorative fonts such as `"Comic Sans MS"` for UI controls because Safari/iOS may not render them.
- Reset button appearance in design frames: set `color: var(--ink)`, `appearance: none`, and `-webkit-appearance: none` so iOS Safari does not tint button text blue. This was verified on real phone Safari after `Chat` and `Ready` initially rendered blue.
- Do not let a scene container be draggable. The main scene shell, such as `.phone.screen-room-lobby` or the game board scene container, should not move/drag/scroll as a whole. Only explicit inner regions like chat logs, modals, buttons, inputs, or board actions should handle interaction.
- If a scene needs scroll behavior, put it in a named inner region and document that region in the HTML comments. Do not fix scene dragging by collapsing or distorting the whole layout.
- For any UI/layout change, verify the rendered frame visually in a browser or screenshot before marking the work done. DOM checks and computed-style assertions are useful, but they do not replace looking at the actual UI.
- Do not import production React code from `apps/web`.
- Do not treat prototype calculations, multiplayer mocks, or server-like behavior as authoritative production logic.
- Functional local state is allowed when it demonstrates the complete intended experience quickly.
- Label review helpers such as scenarios, autoplay, reset, and cheats as prototype tooling; do not port them automatically.
- Label fake dice, economy, turn, winner, bot, and mock synchronization behavior as prototype simulation; replace it with core/server state during production implementation.
- After a design is approved, implement it in `apps/web` using the existing React components.
- Update this guide or `docs/system-architecture.md` only when the design workflow or production UI ownership changes.

Recommended flow:

1. Open `design/index.html` to see the full prototype map.
2. Pick the relevant frame from `design/README.md`.
3. Mark the frame `Draft` or `Review` and edit it until the screen direction and interaction feel right.
4. Review it in a browser as an interactive demo.
5. Click through linked frames to confirm the flow feels consistent.
6. For touch, drag, scroll, or viewport-sensitive changes, run `pnpm design:mobile` and test the frame on a real phone using the printed LAN URL.
7. Record approved decisions in the frame's production contract and set its status to `Approved`.
8. Read the frame regions and production mapping to map behavior into production.
9. Move approved structure/styles into `apps/web/src/components` and `apps/web/src/styles/index.css`.
10. Replace local simulation with real core/server state; do not copy mock networking or prototype tooling by default.
11. Add or update `tests/design/` assertions for every changed interaction or visible state, then run `pnpm design:check`.
12. Report Expected vs Actual evidence and request human review for subjective visual, animation, touch, or UX decisions.
13. Add or update tests at the production boundary, then compare the result with the approved contract.
14. Set the frame status to `Ported` and keep it as a reference snapshot until a redesign reopens it.

Mobile design server:

```bash
pnpm design:mobile
```

Windows direct launcher:

```text
start-design-mobile.bat
```

Default port is `8088`. To use another port, run:

```bat
start-design-mobile.bat 8090
```

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
