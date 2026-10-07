export type PlayerId = string;
export type TileId = number; // 1..40, 1 = Start, 2..40 = plots
export type ResidentId = string;
export type ResidentKind = "warrior" | "farmer";
export type ItemId =
  | "horse"
  | "luckyDie"
  | "meat"
  | "warHorn"
  | "woodShield"
  | "sickle"
  | "hammer"
  | "ironSword"
  | "ironArmor"
  | "cloverCharm";
export type EliminationReason = "bankrupt" | "left";
export type CardType = "maxHealth" | "attack" | "defense" | "lucky" | "coin";
export type PersonalEventId =
  | "treasureChest"
  | "wanderingMerchant"
  | "healingSpring"
  | "volunteer"
  | "blessing"
  | "pickpocket"
  | "ambush"
  | "storm"
  | "desertion";
export type GlobalEventId =
  | "harvestFestival"
  | "plague"
  | "royalTax"
  | "peaceTreaty"
  | "warFever"
  | "marketBoom"
  | "bountifulYear";

export interface King {
  id: PlayerId;
  name: string;
  coin: number;
  health: number;
  // Base values (start + level gains + cards + events). Equipment is NOT included.
  maxHealth: number;
  attack: number;
  defense: number;
  lucky: number;
  level: number;
  position: TileId;
  laps: number;
  eliminated: boolean;
  eliminatedRound: number | null;
  // Why the king is out: ran out of coin ("bankrupt") or was removed after disconnecting ("left").
  eliminationReason: EliminationReason | null;
  skipNextTurn: boolean;
  items: Partial<Record<ItemId, number>>;
  recruited: number; // residents ever recruited, used for naming
}

export interface Plot {
  id: TileId;
  ownerId: PlayerId | null;
  level: number;
  health: number;
  residentIds: ResidentId[];
}

export interface Resident {
  id: ResidentId;
  name: string;
  kind: ResidentKind;
  level: number;
  health: number;
  ownerId: PlayerId;
  plotId: TileId;
}

export type TurnStep = "awaitClaim" | "preRoll" | "rolled" | "startStation" | "decision" | "fight" | "postMove";

export interface TurnState {
  playerId: PlayerId;
  step: TurnStep;
  rolled: boolean;
  dice: { value: number; bonus: number; rerolled: boolean } | null;
  moveBonus: number; // horse
  horseUsed: boolean;
  remainingSteps: number;
  path: TileId[]; // tiles entered this turn, for UI animation
  manageablePlotId: TileId | null; // own plot landed on this turn
}

export interface CardOffer {
  type: CardType;
  value: number;
}

export type PendingDecision =
  | { kind: "buyPlot"; playerId: PlayerId; plotId: TileId; price: number; reason: "empty" | "destroyed" }
  | { kind: "visitorChoice"; playerId: PlayerId; plotId: TileId; ownerId: PlayerId; canAttack: boolean }
  | { kind: "ownerChoice"; playerId: PlayerId; plotId: TileId; visitorId: PlayerId; canAttack: boolean }
  | { kind: "pickCard"; playerId: PlayerId; offers: CardOffer[] };

export type FighterRef =
  | { type: "king"; playerId: PlayerId }
  | { type: "garrison"; plotId: TileId }
  | { type: "plot"; plotId: TileId };

export interface FightRoundRecord {
  attackerRoll: number;
  defenderRoll: number;
  attackerScore: number;
  defenderScore: number;
  winner: "attacker" | "defender" | "tie";
  damage: number; // damage dealt to the round loser (0 for tie or passive plot winning)
}

export interface FightState {
  kind: "kingVsKing" | "garrison" | "plot";
  plotId: TileId;
  attacker: FighterRef; // always a king
  defender: FighterRef;
  attackerWins: number;
  defenderWins: number;
  rounds: FightRoundRecord[];
  pendingRolls: Partial<Record<PlayerId, number>>; // human rolls submitted this round
  buffs: Partial<Record<PlayerId, { attack: number; defense: number }>>;
  garrison: { startCount: number; maxPool: number; pool: number } | null;
}

export type FightRoundResult = "won" | "lost";

// What the Fight page draws for one side, frozen when the fight ended (the live fight is gone from the state by then).
export interface FightSideSnapshot {
  kind: FighterRef["type"];
  playerId: PlayerId | null; // the king behind this side (null for the garrison and the plot)
  name: string | null;
  health: number; // king health, garrison pool or plot health
  maxHealth: number;
  attack: number; // what the engine adds to the die
  defense: number;
  buffs: { attack: number; defense: number };
  aliveResidents: number | null; // garrison only
  plotLevel: number | null; // plot only
  roundsWon: number;
  results: FightRoundResult[]; // one per decided round (ties leave no mark), oldest first
}

export interface FightResult {
  kind: FightState["kind"];
  plotId: TileId;
  attackerId: PlayerId;
  defender: FighterRef;
  winner: "attacker" | "defender";
  retreated: boolean;
  // True when a king left the game mid-fight (disconnected): no fee, no loot, nothing changes on the plot.
  forfeit?: boolean;
  feePaid: number;
  loot: number;
  residentsKilled: number;
  plotOutcome: "none" | "levelDown" | "destroyed";
  // Final display data, for the last round that the live fight no longer shows.
  rounds: FightRoundRecord[];
  attackerSide: FightSideSnapshot;
  defenderSide: FightSideSnapshot;
}

export interface ActiveGlobalEvent {
  eventId: GlobalEventId;
  startRound: number;
  endRound: number;
}

export interface EventHistoryEntry {
  seq: number;
  round: number;
  scope: "global" | "personal";
  eventId: GlobalEventId | PersonalEventId;
  playerId: PlayerId | null;
}

export type LogType = string; // see rules/log.ts for the list used
export interface LogEntry {
  seq: number;
  round: number;
  type: LogType;
  playerId: PlayerId | null;
  data: Record<string, string | number | boolean>;
}

export interface GameState {
  phase: "playing" | "finished";
  round: number;
  turnOrder: PlayerId[];
  kings: Record<PlayerId, King>;
  plots: Plot[]; // index 0 = tile 2 ... index 38 = tile 40
  residents: Record<ResidentId, Resident>;
  turn: TurnState;
  pending: PendingDecision | null;
  fight: FightState | null;
  lastFight: FightResult | null;
  activeGlobalEvents: ActiveGlobalEvent[];
  eventHistory: EventHistoryEntry[]; // keep last 50
  eliminationOrder: PlayerId[];
  winnerId: PlayerId | null;
  seq: number; // monotonic counter for log/event/resident ids
  log: LogEntry[]; // keep last 50, newest last
}

export type CommandError =
  | "GAME_OVER"
  | "NOT_YOUR_TURN"
  | "WRONG_STEP"
  | "NOT_ACTOR"
  | "PENDING_DECISION"
  | "NO_PENDING"
  | "INSUFFICIENT_COIN"
  | "INVALID_TARGET"
  | "LIMIT_REACHED"
  | "NOT_ALLOWED";
export type CommandResult = { ok: true } | { ok: false; error: CommandError };
