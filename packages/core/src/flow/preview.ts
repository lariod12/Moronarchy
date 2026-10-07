import type { GameState, PlayerId } from "../model/types";
import { dispatchGameCommand } from "../match/commands";
import type { GameCommandName } from "../match/commands";
import type { MatchResult } from "../match/types";
import type { Rng } from "../rules/rng";

// Dice and drops never matter for "would this command be accepted?", so previews use a fixed rng.
const PREVIEW_RNG: Rng = { d6: () => 1, next: () => 0 };

// Dry-runs a game command on a copy of the state and returns what the real command would answer
// (malformed arguments answer INVALID_ARGUMENT, like the match adapter). The input state is never touched.
export const previewCommand = (
  state: GameState,
  actorId: PlayerId,
  name: GameCommandName,
  args: unknown[] = []
): MatchResult => dispatchGameCommand(structuredClone(state), actorId, PREVIEW_RNG, name, args);
