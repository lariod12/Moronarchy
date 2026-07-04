# Moronarchy Design Frames

This folder is for design review before production implementation.

Start from `index.html` to review the full click-through prototype. Each numbered `.html` file is also a standalone interactive frame. Edit a frame directly, review and click/test it in a browser, then port approved UI ideas and behavior into `apps/web`.

The frame files are not production code, but they should be useful implementation references. A developer should be able to open one frame, interact with the screen, read the class names/functions/inline notes, and understand what production React components and moves need to do.

## Frames

- `index.html` - prototype hub for reviewers and developers.
1. `01-welcome-create-join.html` - welcome, player name, create/join room.
2. `02-room-lobby.html` - room lobby and player slots.
3. `03-game-starting.html` - game starting countdown.
4. `04-main-board-waiting-turn.html` - board while waiting for another player.
5. `05-main-board-your-turn.html` - board when it is your turn to roll.
6. `06-dice-rolling-move.html` - dice roll and token movement.
7. `07-empty-land-action.html` - empty land buy/skip decision.
8. `08-own-land-upgrade.html` - own land upgrade decision.
9. `09-rival-land-payment.html` - rival land fee payment.
10. `10-start-bonus-level-up.html` - pass Start bonus and level up.
11. `11-defeated-bankruptcy.html` - defeated/bankruptcy state.
12. `12-game-over-result.html` - final winner and ranking.

## Rules

- Keep frames black and white until the flow is approved.
- Keep this folder design-only. No production React imports, no server imports, no boardgame.io runtime.
- Frame JavaScript may contain fake local state only to demonstrate screen behavior.
- It is okay for frame HTML to contain rough sample data when it explains the interaction.
- Each frame should be interactive enough to test that screen's main action.
- Do not copy visible annotation/callout text from source design images into the UI. Treat arrows, red marks, and explanatory bubbles as design notes only.
- Production code in `apps/web` should be updated only after a frame is approved.

## Interactive Frame Standard

Every frame should include:

- A `DESIGN FRAME SPEC` comment at the top of the HTML file.
- A visible mobile wireframe UI.
- Real clickable controls for that screen.
- Local demo state in the same HTML file.
- Named functions that describe the intended production behavior.
- Class names that map naturally to future React components.
- Short HTML or JS comments for implementation notes when behavior is not obvious.

## Design Memory Rule

Every approved design idea, user feedback, interaction rule, visual exception, or workflow decision must be written into the relevant HTML prototype file.

Use the closest durable place:

- Top `DESIGN FRAME SPEC` for screen-level decisions.
- HTML comments beside the affected section for layout/component decisions.
- CSS comments beside class rules for visual-state decisions.
- JS comments beside handlers for interaction/workflow decisions.
- `data-*` attributes when the decision maps to future production behavior.

Do not rely on chat history as the only record. Future implementation should be possible by reading the design HTML and this README.

Example:

```html
<!--
  Design decision:
  The current user is identified by .player-card.is-you background only.
  Do not render visible "(You)" text.
-->
<article class="player-card is-you"></article>
```

## Prototype Flow Contract

Design frames use normal HTML navigation plus tiny local JavaScript. Do not add a router, build step, shared bundle, or production imports.

Use these attributes consistently:

```html
<button data-nav="02-room-lobby.html">Back</button>
<button data-action="roll-dice">Tap to Roll</button>
<button data-modal-open="buy-result-modal">Buy</button>
<section data-modal="buy-result-modal" hidden></section>
<button data-modal-close="buy-result-modal">Close</button>
<span data-bind="room-code">R001</span>
```

- `data-nav` means this control moves to another design frame file.
- `data-action` means this control performs a local demo action or represents a future server move.
- `data-modal-open` and `data-modal-close` mean popup behavior inside the same frame.
- `data-modal` names the popup block being opened or closed.
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

Keep logic simple and visible in the same file. The goal is UI/UX validation, not production architecture.

## Current Click-Through Flow

The main happy path is:

```text
index.html
  -> 01-welcome-create-join.html
  -> 02-room-lobby.html
  -> 03-game-starting.html
  -> 05-main-board-your-turn.html
  -> 06-dice-rolling-move.html
  -> 07-empty-land-action.html
  -> 04-main-board-waiting-turn.html
```

Optional branch frames:

```text
04-main-board-waiting-turn.html -> 05-main-board-your-turn.html
06-dice-rolling-move.html      -> 07-empty-land-action.html
08-own-land-upgrade.html       -> 04-main-board-waiting-turn.html
09-rival-land-payment.html     -> 04-main-board-waiting-turn.html
10-start-bonus-level-up.html   -> 04-main-board-waiting-turn.html
11-defeated-bankruptcy.html    -> 04-main-board-waiting-turn.html
12-game-over-result.html       -> 02-room-lobby.html
```

When a new frame is added, update this flow map and link it from `index.html`.

## Required Top-Of-File Spec

Put this comment immediately after `<!doctype html>` in every design frame.

The goal: a developer should understand the design, controls, features, and workflow by reading the first comment before reading CSS/HTML/JS.

Template:

```html
<!--
  DESIGN FRAME SPEC
  Frame: 00-frame-file-name
  Screen purpose:
    What this screen does in the game flow.

  Visual design:
    Main layout, sketch/wireframe direction, and important visual rules.
    Mention that visible annotation text from source images is not copied into UI.

  Visible controls:
    Inputs: N
      1. Input name - purpose and condition.
    Buttons: N
      1. Button name - purpose and condition.

  Interactive features:
    - Feature behavior visible in the HTML demo.
    - State change after input/click.

  Button workflow:
    Initial state.
    Enabled/disabled conditions.
    What happens after click.

  Production mapping:
    Target page/component in apps/web.
    Core/server/API move this action maps to.
    What fake local state should be replaced with in production.
-->
```

Keep this comment detailed. It is the quick handoff for whoever implements the approved frame into React.

Recommended class naming:

```text
screen-[frame-name]
frame-header
frame-board
frame-hud
frame-action-panel
state-[meaning]
is-[condition]
```

Recommended function naming:

```text
initializeFrame()
renderFrame()
updateFrameState()
handleCreateRoom()
handleJoinRoom()
handleRollDice()
handleBuyLand()
handleUpgradeLand()
handleSkipAction()
```

Use names that describe the user action, not only the visual effect.

## Class And Function Comments

Inside each HTML file, add comments around major class groups and functions:

```css
/* Root mobile frame. Production equivalent: GamePage shell. */
.phone {}

/* State styling: data-phase is controlled by renderFrame(). */
.phone[data-phase="rolling"] {}
```

```html
<!--
  Feature: tile action panel.
  Production: maps to ActionPanel.tsx.
  Contract: Buy is enabled only on empty owned-by-null land.
-->
<section class="frame-action-panel"></section>
```

```js
function handleBuyLand() {
  /*
    Production action:
    - call boardgame.io move buyLand()
    - server validates owner/coin/phase
    - UI returns to waiting or next turn state
  */
}
```

Use comments to explain structure and behavior. Do not put these explanations as visible text in the UI.

## Implementation Notes Inside HTML

Use comments or `data-*` attributes to explain how the frame maps to production:

```html
<!-- Production: maps to HomePage create-room flow. -->
<button class="create-room-button" data-action="create-room">Create</button>
```

```js
function handleCreateRoom() {
  // Production: call lobby API, then navigate to /room/:roomId.
}
```

Good notes explain:

- Which production page/component owns this UI.
- Which user action is being demonstrated.
- Which core/server move or API call the action maps to.
- What state changes should happen after interaction.
- What conditions enable/disable a control.

Avoid long explanations in visible UI. Put implementation guidance in comments, function names, and `data-*` attributes.

When a source image contains annotation text, move that meaning into non-visible HTML/JS comments if it helps implementation. The rendered frame should show only the actual player-facing UI.

## Interaction Expectations By Frame

1. `01-welcome-create-join.html`
   - Typing name enables the single primary button as Create.
   - Typing room code switches the same primary button to Join.
   - Do not add a second Join button.
2. `02-room-lobby.html`
   - Player slots should show ready/waiting states.
   - Start should only feel available when enough players exist.
3. `03-game-starting.html`
   - Countdown should be represented.
4. `04-main-board-waiting-turn.html`
   - Controls should be disabled or clearly waiting.
5. `05-main-board-your-turn.html`
   - Roll action should be clickable.
6. `06-dice-rolling-move.html`
   - Dice result and movement state should be visible.
7. `07-empty-land-action.html`
   - Buy and Skip should be clickable.
8. `08-own-land-upgrade.html`
   - Upgrade and Skip should be clickable.
9. `09-rival-land-payment.html`
   - Fee payment result should be shown.
10. `10-start-bonus-level-up.html`
   - Bonus and level-up result should be shown.
11. `11-defeated-bankruptcy.html`
   - Defeated state and continue watching action should be shown.
12. `12-game-over-result.html`
   - Ranking and return-to-lobby action should be shown.

## Production Porting Workflow

1. Confirm the frame behavior by opening `design/index.html` or the target `.html` file in a browser.
2. Read comments, `data-action`, and JS function names.
3. Identify the target production page/component in `apps/web`.
4. Move approved structure/styles into React components.
5. Replace local fake state with real server/core state.
6. Add tests only in production code, not for these design frames.
