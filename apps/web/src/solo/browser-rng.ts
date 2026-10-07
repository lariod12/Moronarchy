import type { BoardgameRandom } from "@moronarchy/core/match";
import type { Rng } from "@moronarchy/core/engine";

// The only place outside the engine package where randomness is created: solo games roll with the browser's own
// Math.random, where online games roll on the server.
const d6 = (): number => Math.floor(Math.random() * 6) + 1;

export const createBrowserRng = (): Rng => ({ d6, next: () => Math.random() });

export const createBrowserRandom = (): BoardgameRandom => ({ D6: d6, Number: () => Math.random() });
