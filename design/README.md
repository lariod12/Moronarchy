# Moronarchy Functional Prototype

## Purpose

The `design/` folder is Moronarchy's functional prototype and the review surface for product ideas before production implementation.

Design frames should be complete enough to click through the intended player experience immediately. They may simulate a full game loop, including dice rolls, movement, land actions, turn changes, game over, debug scenarios, and mock multiplayer behavior.

The prototype defines the intended experience. It does not define the authoritative implementation of game rules or multiplayer behavior.

## Source-Of-Truth Boundaries

| Area | Source of truth | Design responsibility |
| --- | --- | --- |
| Player experience, layout, interaction flow, visible states, animation | `design/*.html` after approval | Demonstrate the complete intended experience |
| Game rules, economy, move validation, victory and defeat | `packages/core` | Simulate enough behavior to review the experience |
| Multiplayer authority and synchronization | `apps/server` plus boardgame.io | Use local mock synchronization only for prototype review |
| Production UI and accessibility | `apps/web` | Provide the approved visual and interaction contract |

Production should reproduce the approved visible behavior and interaction flow. Do not copy prototype state management, rule calculations, mock networking, or debug tooling into production merely because they exist in a frame.

## Prototype Classifications

Every frame spec and major implementation region should distinguish these classifications.

### Production Contract

Behavior production must reproduce unless a later decision supersedes it:

- layout and information hierarchy
- visible states, labels, feedback, and modal timing
- button workflow and enabled/disabled behavior
- responsive, touch, scroll, and animation behavior
- player-facing transitions between screens and game phases

### Prototype Simulation

Local behavior that makes the idea immediately testable but must be replaced by real core/server state during production implementation:

- fake dice results, economy calculations, and turn progression
- local player, land, coin, health, and winner state
- bot and autoplay decisions
- `BroadcastChannel` or `localStorage` multiplayer synchronization

Simulation should produce the intended visible result. It does not need to match production internals.

### Prototype Tooling

Review and debugging controls that are not player-facing production requirements:

- scenario selectors
- P1/P2 device view switches
- autoplay Play/Pause
- reset and cheat actions

Only port prototype tooling when a separate decision explicitly adds production or development tooling.

## Current Frames

- `index.html` - prototype hub for reviewers and developers.
1. `01-welcome-create-join.html` - welcome, player name, create/join room.
2. `02-room-lobby.html` - room lobby, chat, ready/start flow, and in-place game starting countdown.
3. `03-ingame-main-board.html` - main in-game board with turn flow, dice roll, tile movement, land purchase, fee resolution, HUD, status popup, scenarios, and autoplay.

Keep the design set small. Do not add separate `04+` in-game state frames unless the product needs a genuinely different primary interface. Prefer keeping related in-game states inside `03-ingame-main-board.html`.

## Frame Lifecycle

Use one of these values in each top-of-file `DESIGN FRAME SPEC`:

| Status | Meaning |
| --- | --- |
| `Draft` | Idea is being explored and may change freely |
| `Review` | Main flow is testable and awaiting a product decision |
| `Approved` | Experience contract is ready for production implementation |
| `Ported` | Approved contract has been implemented in production |

Approval applies to the documented production contract, not automatically to every simulation or debug helper in the file.

After a frame is ported, keep the approved frame as a reference snapshot. Reopen it as `Draft` or `Review` only when redesigning that experience. Production bug fixes do not require back-porting implementation details into the prototype.

## Decision And Delivery Workflow

Before changing an interactive frame, define and approve a short task contract using `../docs/design-task-validation-workflow.md`:

```text
Goal:
- What product idea or player problem is being explored.

Expected Results:
- What the reviewer should see and be able to do.
- What visible state should change.
- What should not change.

Test Workflow:
- Logic/state checks.
- UI/DOM checks.
- Browser/manual checks.
```

Then follow this delivery flow:

1. Read this README and the target frame's `DESIGN FRAME SPEC`.
2. Confirm whether the task changes a production contract, simulation, or prototype tool.
3. Implement the idea in the functional prototype.
4. Update the frame spec with every approved decision and production mapping.
5. Test the relevant scenarios and click-through flow.
6. Obtain product approval and set the frame status to `Approved`.
7. Implement the production contract in `apps/web`, replacing simulated behavior with `packages/core` and server state.
8. Add production tests at the appropriate core, web, server, or E2E boundary.
9. Compare production behavior with the approved contract and set the frame status to `Ported`.

If a proposed production change conflicts with an approved decision, present the original decision, concern, trade-off, and options before changing direction.

## Top-Of-File Frame Spec

Every frame must keep a `DESIGN FRAME SPEC` comment immediately after `<!doctype html>`.

Use this structure:

```text
DESIGN FRAME SPEC

Frame:
Status: Draft | Review | Approved | Ported

Screen purpose:
Visual design:
Visible controls:
Interactive features:
Button workflow:

Production contract:
- Player-facing behavior production must reproduce.

Prototype simulations:
- Local behavior that production must replace with core/server state.

Prototype tooling:
- Review/debug behavior that is not automatically ported.

Production mapping:
- React components, core moves/state, and server touchpoints.

Out of scope:
- Explicitly deferred behavior.

Acceptance checklist:
- Observable conditions required for approval.
```

Future implementation should be possible by reading this README and the relevant frame without depending on chat history.

## In-File Organization

Keep each frame self-contained unless maintaining it becomes demonstrably slower than the benefit of single-file review. Do not add a router, build step, shared production bundle, or production imports.

Small frames may use simple CSS/HTML/JavaScript sections. Large frames such as `03-ingame-main-board.html` should keep named regions in this order where practical:

```text
CSS
1. Foundations and tokens
2. Screen shell and navigation
3. Primary scene or board
4. Feedback and motion
5. HUD and player controls
6. Player-facing modals
7. Prototype tooling
8. Responsive and accessibility behavior

HTML
1. Screen shell and status
2. Primary scene
3. HUD
4. Player-facing modal states
5. Prototype tooling

JavaScript
1. Prototype configuration and fixtures
2. Frame state and DOM references
3. Initialization and event binding
4. Mock multiplayer adapter
5. Prototype scenarios and tooling
6. Rendering and selectors
7. Player-facing interaction simulation
8. Motion and visual effects
9. Generic DOM and modal utilities
```

Region comments organize responsibility; they must not imply that simulation code is production game logic.

## Interaction Conventions

Use these attributes consistently:

```html
<button data-nav="02-room-lobby.html">Back</button>
<button data-action="simulate-main-board-turn">Tap to Scroll</button>
<button data-modal-open="land-ledger-modal">Open</button>
<section data-modal="land-ledger-modal" hidden></section>
<button data-modal-close="land-ledger-modal">Close</button>
<span data-bind="room-code">R001</span>
```

- `data-nav` moves to another design frame.
- `data-action` performs a local demo action or represents a future production move.
- `data-modal-open`, `data-modal-close`, and `data-modal` control local popup behavior.
- `data-bind` marks sample UI state rendered by frame JavaScript.
- Descriptive class, function, and data attribute names form part of the handoff documentation.

## Main Board Contract

`03-ingame-main-board.html` is the review source for the in-game board experience. Keep these pieces together unless the product needs a separate primary screen:

- board shell and 40-tile layout
- current round/player labels
- dice and movement feedback
- active player HUD
- buy/skip land decision
- fee feedback and turn advancement
- game-over and land-status views
- local scenarios for ownership, coin, health, level, and position

The primary prototype loop is:

```text
Tap to Scroll
  -> dice feedback
  -> active player movement
  -> land or fee outcome
  -> HUD and ownership update
  -> next player turn
```

Production should map the approved contract into components such as `GamePage`, `GameTable`, `GameBoard`, `PlayerHud`, and focused modal/action components. Replace local simulation with synchronized `MoronarchyState` and boardgame.io moves.

## Design Rules

- Keep frames black and white until the visual direction is approved.
- No production React imports, server imports, or boardgame.io runtime in design frames.
- Functional simulations are allowed when they make an idea faster to review.
- Keep prototype-only data and calculations grouped and visibly labeled.
- Do not present prototype calculations as authoritative game rules.
- Do not copy visible annotation/callout text from source design images into player-facing UI.
- Update production only after the relevant design contract is approved.
- Preserve a frame's existing behavior during organization-only refactors.

## Verification

UI work is not complete until the changed frame is visually checked. Interactive work should use all three layers from `../docs/design-task-validation-workflow.md`:

1. Logic/state checks for the prototype scenario.
2. UI/DOM checks for the visible contract.
3. Browser/manual checks for layout, interaction, and motion.

For phone testing, start the LAN design server from the project root:

```bash
pnpm design:mobile
```

Windows launcher:

```text
start-design-mobile.bat
```

The script serves `design/` with Vite on `0.0.0.0:8088` by default.
