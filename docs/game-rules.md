# Game Rules

## Overview

Moronarchy is a turn-based multiplayer board game where each player represents a king moving around a 40-tile kingdom loop by rolling dice. Players use coins to buy land, collect fees from rivals, upgrade property, and survive until the other kings fall.

This document records the MVP rule set.

## Core Concept

- Players: 2-4.
- Each player is represented by a king.
- The board has 40 tiles arranged in a loop.
- Tile 01 is Start.
- Tiles 02-40 are land.
- Players take turns rolling one six-sided die and moving clockwise.
- Empty land can be bought.
- Rival-owned land charges rent.
- Owned land can be upgraded.
- Passing or landing on Start gives bonus coins.
- Last surviving king wins.
- If 30 full table rounds pass, highest total kingdom value wins.

## Player Status

| Status | Start | Purpose |
| --- | ---: | --- |
| Health | 100 | King's survival value |
| Coin | 200 | Used to buy land, pay rent, and upgrade land |
| Level | 1 | Unlocks stronger land upgrades |

Health is reserved for the battle layer. In the MVP, normal land rent affects Coin only.

## Board

- Board size: 40 tiles.
- Tile 01: Start.
- Tiles 02-40: land.
- Movement wraps from tile 40 back to tile 01.
- A player receives Start bonus if movement passes or lands on tile 01.

## Turn Flow

1. Current player rolls dice.
2. Player moves forward by dice value.
3. If player passes or lands on Start, gain 50 Coin and increase Level by 1.
4. Level is capped at 3.
5. Destination tile resolves.
6. If rival land, player pays rent.
7. If the completed lap unlocks an eligible owned land upgrade, player may upgrade one owned land that matches current Level.
8. If empty land and no lap upgrade is pending, player may buy it.
9. If own land and no lap upgrade is pending, player may upgrade it.
10. Check defeat and victory.
11. Turn passes to next player.

## Dice

- One standard six-sided die.
- Dice range: 1-6.
- Dice is server-authoritative in multiplayer.

## Start Tile

- Start tile: 01.
- Start bonus: +50 Coin.
- Start bonus triggers when passing or landing on Start.
- Completing a lap increases king Level by 1, capped at Level 3.
- Completing a lap may also grant one owned-land upgrade if the player owns land below the current king Level and can pay the upgrade cost while keeping at least 1 Coin.

## Land Economy

Land starts at Level 1 when bought and can be upgraded to Level 3.

| Tiles | Price | Rent L1 | Rent L2 | Rent L3 | Upgrade L1->L2 | Upgrade L2->L3 |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 02-10 | 50 | 10 | 20 | 35 | 40 | 60 |
| 11-20 | 70 | 14 | 28 | 49 | 56 | 84 |
| 21-30 | 90 | 18 | 36 | 63 | 72 | 108 |
| 31-40 | 110 | 22 | 44 | 77 | 88 | 132 |

## Buying Land

- A player may buy empty land they land on.
- Buying land spends Coin equal to the tile price.
- Voluntary buy actions require the player to keep at least 1 Coin afterward.
- Bought land starts at Land Level 1.

## Paying Rent

- Landing on rival land forces rent payment.
- Rent amount depends on the land level.
- Rent is paid to the owner.
- If forced rent reduces a player to 0 Coin or below, that player is defeated immediately.

## Land Upgrades

- Players can upgrade only land they own.
- Max land level: 3.
- Player can upgrade only if king Level is at least the target land level.
- Voluntary upgrade actions require the player to keep at least 1 Coin afterward.
- After completing a lap, a player may upgrade one eligible owned land from anywhere on the board, based on the king's current Level.
- Level 1 land collects normal rent.
- Level 2 land collects higher rent.
- Level 3 land collects highest MVP rent.
- Health damage from normal land is out of scope for MVP.

## Level

- All players start at Level 1.
- Completing a lap increases Level by 1.
- Level is capped at 3.
- Level gates land upgrades:
  - King Level 1: buy land and own Level 1 land.
  - King Level 2: upgrade land to Level 2.
  - King Level 3: upgrade land to Level 3.

## Defeat And Victory

### Defeat

A player is defeated if:

- Health reaches 0.
- Forced rent reduces Coin to 0.

### Victory

- Last surviving king wins.
- If the match passes 30 full table rounds, highest total kingdom value wins.
- Kingdom value includes Coin, Health, owned land price, and upgrade value.

## MVP Scope

Included:

- 2-4 players
- 40-tile loop board
- Dice movement
- Turn order
- Player status: Health, Coin, Level
- Land buying
- Land rent
- Land upgrades
- Start bonus
- Bankruptcy defeat
- 30-round limit
- Victory checks

## Out Of Scope For MVP

- Full action card system
- Trap tiles
- Special dice
- Character classes
- King skills
- Accounts
- Database
- Ranking
- AI opponents
- Complex bankruptcy auctions
- Health damage from normal land
- Advanced map variants

## References

- UI reference image: `All UI.png`
- Current direction: Monopoly-style economy with lightweight king battle layer
