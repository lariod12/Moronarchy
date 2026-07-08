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

Expected Results:
- What the user should see.
- What state should change.
- What should sync between tabs, if multiplayer is involved.
- What should not change.

Test Workflow:
- Logic/state checks.
- UI/DOM checks.
- Browser/manual checks.
```

Do not start implementation until the expected results are clear enough to test. If the task is tiny, the contract can be short, but it still needs a visible expected result.

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

Open the actual frame in a browser and verify the rendered result.

For multiplayer design features, test with two tabs:

```text
Tab 1 -> P1 Device
Tab 2 -> P2 Device
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

Expected vs Actual:
- Expected result 1 -> pass/fail.
- Expected result 2 -> pass/fail.
- Expected result 3 -> pass/fail.

Checks Run:
- Logic/state checks.
- UI/DOM checks.
- Browser/manual checks.

Remaining Risk:
- Anything not verified yet.
```

If any expected result fails, fix it before marking the task done, or clearly report what remains unresolved.

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

## Design Frame Rule

Any design task that changes interaction, modal behavior, board state, multiplayer sync, or debug tooling should update the relevant frame comments or docs when the workflow changes.
