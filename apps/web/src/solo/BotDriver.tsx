import { useEffect } from "react";
import { useMovement } from "../game/MovementContext";
import { useSolo } from "./LocalMatchProvider";
import { getWaitingBotId } from "./solo-match";
import { BOT_DELAY_MS } from "./solo-settings";

// Plays the bots: when the game is waiting on a bot (and bots are not paused, and no token is still walking) it waits
// the chosen delay and lets that bot make one move. It lives inside the game layout to see the movement animation.
export const BotDriver = () => {
  const { match, settings, paused, commitBot } = useSolo();
  const { isAnimating } = useMovement();
  const botId = paused || isAnimating ? undefined : getWaitingBotId(match);
  const delay = BOT_DELAY_MS[settings.speed];

  // `match` is a dependency so that every committed move restarts the timer: one action per tick.
  useEffect(() => {
    if (botId === undefined) {
      return;
    }
    const timer = setTimeout(() => commitBot(botId), delay);
    return () => clearTimeout(timer);
  }, [botId, match, delay, commitBot]);

  return null;
};
