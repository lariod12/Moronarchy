# Moronarchy Design Frames

This folder is for design review before production implementation.

Each `.html` file is one standalone frame. Edit a frame directly, review it in a browser, then port approved UI ideas into `apps/web`.

## Frames

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
- Keep this folder design-only. No game rules, multiplayer logic, or production React imports.
- It is okay for frame HTML to contain rough sample data.
- Production code in `apps/web` should be updated only after a frame is approved.
