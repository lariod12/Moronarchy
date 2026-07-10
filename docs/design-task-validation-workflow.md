# Design Task Validation Workflow

## Overview

Use this workflow for every interactive design task, especially changes in `design/03-ingame-main-board.html`.

The goal is to move fast while still proving that the prototype matches the intended result. Every task should start with an agreed goal and expected results, then finish by testing the same expectations through three layers: state logic, UI/DOM, and real browser behavior.

## Before Implementation

Before changing a design frame, write a short task contract and wait for approval.

Required contract:

```text
Goal:
- What the task should accomplish.

Change Classification:
- Production Contract | Prototype Simulation | Prototype Tooling.

Expected Results:
- What the user should see.
- What state should change.
- What should sync between tabs, if multiplayer is involved.
- What should not change.

Interaction Steps:
- Exact click, type, navigation, wait, or multi-tab sequence used to prove the result.

Test Workflow:
- Logic/state checks.
- UI/DOM checks.
- Automated browser interaction checks.
- Visual/manual checks when human judgment is required.
```

Do not start implementation until the expected results are clear enough to test. If the task is tiny, the contract can be short, but it still needs a visible expected result.

Classification meaning:

- `Production Contract`: approved player-facing behavior that production should reproduce.
- `Prototype Simulation`: local behavior that makes the idea testable and must be replaced by core/server state in production.
- `Prototype Tooling`: scenario, view, reset, cheat, or autoplay behavior used for review and not automatically ported.

A task may contain more than one classification, but each expected result should make its ownership clear.

## Completion States

Use these task states so implementation is not confused with verification or approval:

```text
In Progress
  -> Implemented
  -> Automated Verified
  -> Needs Human Review (when subjective checks remain)
  -> Approved/Done
```

- `Implemented`: code or prototype behavior exists, but evidence is incomplete.
- `Automated Verified`: every machine-verifiable Expected Result passed `design:check` or an equivalent focused browser test.
- `Needs Human Review`: visual quality, UX feel, animation, touch, or real-device behavior still needs a person.
- `Approved/Done`: the user accepted any required subjective review and no expected result remains unresolved.

AI must not use `Done`, `Approved`, or equivalent language for an interactive task when browser checks were skipped, failed, or unavailable.

## Three-Layer Test Workflow

### 1. Logic And State Checks

Validate the data model after the action.

Examples:

- Player coin changes to the expected value.
- Player tile position changes to the expected tile.
- Tile `ownerId` and `landLevel` match the expected owner and level.
- `activePlayerIndex`, `phase`, and `pendingTileId` match the expected turn/action state.
- Multiplayer debug actions call the shared sync path, such as `publishFrameState(...)`.

Recommended checks:

```bash
node -e "/* extract and parse the design frame script with vm.Script */"
```

For debug scenarios, use a smoke test that calls the relevant helper and asserts `frameState`.

### 2. UI And DOM Checks

Validate that the visible interface reflects the state.

Examples:

- Local player's owned land uses `is-owned-self`.
- Rival land uses `is-owned-rival`.
- The correct modal opens or closes.
- Buttons are enabled or disabled correctly.
- HUD values match player state.
- Debug selections highlight before apply.
- Applying a scenario closes the debug modal and shows the resulting board/modal state.

DOM checks are useful, but they are not enough for visual approval.

### 3. Browser And Visual Checks

Run the automated interaction gate first:

```bash
pnpm design:check
```

The command uses the project custom Chrome, starts the design Vite server automatically, performs real browser interactions, fails on assertions, and retains trace/screenshot/video evidence on failure.

When adding or changing an interaction, add or update the matching assertion in `tests/design/`. Passing an unrelated smoke test does not prove the new Expected Result.

For visible/manual debugging, run:

```bash
pnpm design:check:headed
```

Automated checks prove deterministic behavior such as DOM state, button availability, navigation, synchronization, and console safety. Human review remains required for subjective visual quality, UX clarity, animation feel, touch gestures, and real-device behavior.

For multiplayer design features, test with two tabs:

```text
Tab 1 -> open the frame with `?player=1`
Tab 2 -> open the frame with `?player=2`
Apply action in one tab
Verify both tabs update
Verify each tab keeps its own ownership perspective
```

For layout-sensitive changes, inspect the rendered screen or screenshot. Confirm controls are not cropped, hidden behind another modal, overflowing, or visually misleading.

## Result Comparison

After implementation, compare the result against the approved task contract.

Completion report should include:

```text
Goal:
- Restate the approved goal.

Change Classification:
- List the contract, simulation, or tooling areas changed.

Expected vs Actual:
- Expected result 1 -> actual result -> pass/fail -> evidence.
- Expected result 2 -> actual result -> pass/fail -> evidence.
- Expected result 3 -> actual result -> pass/fail -> evidence.

Checks Run:
- Exact commands and exit codes.
- Logic/state assertions.
- UI/DOM assertions.
- Browser interaction assertions.
- Console errors and page errors.
- Visual/manual review, or why it was not required.

Remaining Risk:
- Anything not verified yet, who must verify it, and why.

Completion State:
- Implemented | Automated Verified | Needs Human Review | Approved/Done.
```

If any expected result fails, fix it before marking the task done, or clearly report the task as incomplete. If an expected result has no evidence, treat it as not verified.

## Debug Scenario Expectations

Use these expectations when validating the main-board cheat/debug mode.

| Scenario | Expected state | Expected UI |
| --- | --- | --- |
| `Rival Land` | Selected player moves to rival-owned land; rent is transferred from visitor to owner. | Board shows player on rival tile; HUD coin changes. |
| `Cannot Buy` | Selected player moves to empty land with coin lower than price. | Buy modal opens; `Buy` is disabled. |
| `Empty Land` | Selected player moves to empty land with enough coin. | Buy modal opens; `Buy` is enabled. |
| `Broke Player` | Selected player's coin becomes `0`. | HUD/debug panel show coin `0`. |
| `Set Turn` | Active player changes to selected turn player. | Correct tab can act; other tab waits. |
| `Apply Land` | Selected tile owner/level updates. | Tile background changes according to each tab's local player perspective. |
| `Reset Room` | Round, players, phase, dice face, and initial ownership reset. | Both tabs show the reset board and turn state. |
| `Auto Play` | Host tab advances bot turns, resolves buy/skip/rent, publishes synced state, and ends the game if forced rent reduces a player to `0` coin. | Both tabs show bot movement; pause stops after the current step; play resumes from current state; bankruptcy opens Game Over with the correct winner and stops autoplay. |
| `Auto Play View` | Auto Play defaults to following the active turn view, while `?player=1` and `?player=2` perspectives remain local-only. | Owned/rival tile backgrounds change when the active bot changes, and local perspective does not change room state, active turn, or bot host. |

## Design Frame Rule

Any design task that changes interaction, modal behavior, board state, multiplayer sync, or debug tooling should update the relevant frame comments or docs when the workflow changes.

Prototype logic may be functionally complete enough to demonstrate the intended experience. It remains non-authoritative: production game rules belong to `packages/core`, multiplayer authority belongs to the server/boardgame.io runtime, and production rendering belongs to `apps/web`.
