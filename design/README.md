# Moronarchy Design Frames

This folder is for design review before production implementation.

Start from `index.html` to review the current click-through prototype. The design set is intentionally small now: keep only the main screens needed to understand and finish the core workflow, and put in-game interaction states inside `03-ingame-main-board.html` instead of splitting every state into separate files.

Before changing an interactive frame, use the project design validation workflow: define the task goal, expected results, and test workflow, get approval, then compare the finished result against that contract. See `../docs/design-task-validation-workflow.md`.

## Current Frames

- `index.html` - prototype hub for reviewers and developers.
1. `01-welcome-create-join.html` - welcome, player name, create/join room.
2. `02-room-lobby.html` - room lobby, chat, ready/start flow, and in-place game starting countdown.
3. `03-ingame-main-board.html` - main in-game board with turn flow, dice roll, tile movement, land purchase, fee resolution, HUD, and status popup.

Do not add separate `04+` in-game state frames unless the screen becomes a genuinely different primary interface. Prefer improving `03-ingame-main-board.html` so the main board workflow is complete and easy to port.

## Design Rules

- Keep frames black and white until the flow is approved.
- Keep this folder design-only. No production React imports, no server imports, no boardgame.io runtime.
- Frame JavaScript may contain fake local state only to demonstrate screen behavior.
- Keep behavior visible and clickable in the same HTML file when that helps review.
- Do not copy visible annotation/callout text from source design images into the UI. Treat arrows, red marks, and explanatory bubbles as design notes only.
- Production code in `apps/web` should be updated only after a frame is approved.

## Main Workflow

```text
index.html
  -> 01-welcome-create-join.html
  -> 02-room-lobby.html
  -> 03-ingame-main-board.html
```

Inside `03-ingame-main-board.html`, the prototype should demonstrate the main loop:

```text
Tap to Scroll
  -> dice rolling animation
  -> active player moves on the board
  -> empty land opens Buy/Skip modal when relevant
  -> rival land resolves fee when relevant
  -> HUD and ownership state update
  -> next player turn
```

The goal is one complete main-board interaction workflow, not many thin pages that represent tiny state changes.

## Interaction Contract

Design frames use normal HTML navigation plus tiny local JavaScript. Do not add a router, build step, shared bundle, or production imports.

Use these attributes consistently:

```html
<button data-nav="02-room-lobby.html">Back</button>
<button data-action="simulate-main-board-turn">Tap to Scroll</button>
<button data-modal-open="land-ledger-modal">Open</button>
<section data-modal="land-ledger-modal" hidden></section>
<button data-modal-close="land-ledger-modal">Close</button>
<span data-bind="room-code">R001</span>
```

- `data-nav` moves to another design frame file.
- `data-action` performs a local demo action or represents a future server move.
- `data-modal-open`, `data-modal-close`, and `data-modal` control local popup behavior.
- `data-bind` marks sample UI state that JavaScript updates.

Preferred JavaScript shape:

```js
const frameState = {};
const frameElements = {};

function initializeFrame() {}
function renderFrame() {}
function handleUserAction() {}
function navigateToFrame(fileName, params = {}) {}
```

## Main Board Scope

`03-ingame-main-board.html` is the source of truth for the in-game board design. Keep these pieces together unless the product needs a truly separate screen:

- board shell and tile layout
- current round/player labels
- dice and speech result
- active player HUD
- map/status controls
- buy/skip land action
- fee resolution
- turn advancement
- local demo state for land ownership, coin, health, level, and tile position

Production implementation should turn the repeated structure into shared React components such as `GamePage`, `BoardFrame`, `PlayerHud`, `ActionPanel`, and `StatusMenu`. The standalone design HTML can stay simple and may duplicate markup when that makes review easier.

## Visual Verification

UI design tasks are not complete until the changed frame is visually checked.

For interactive or multiplayer design tasks, visual review must be combined with the three-layer workflow in `../docs/design-task-validation-workflow.md`: logic/state checks, UI/DOM checks, and browser/manual checks.

For every design HTML change that affects layout, spacing, position, visibility, or animation:

1. Open or screenshot the actual frame in a browser.
2. Inspect the rendered image, not only DOM/computed CSS.
3. Fix visible issues such as cropped controls, overflowing text, broken modal layout, or unexpected scroll.
4. Only then report the task as done.

Start the LAN design server from the project root when phone testing is useful:

```bash
pnpm design:mobile
```

Alternative on Windows:

```text
start-design-mobile.bat
```

The script serves the `design/` folder with Vite on `0.0.0.0:8088`.

## Top-Of-File Spec

Every frame should keep a `DESIGN FRAME SPEC` comment immediately after `<!doctype html>`.

The comment should explain:

- screen purpose
- visual design
- visible controls
- interactive features
- button workflow
- production mapping

Future implementation should be possible by reading the design HTML and this README without depending on chat history.
