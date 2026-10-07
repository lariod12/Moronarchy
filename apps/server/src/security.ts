import { sanitizePlayerName } from "@moronarchy/core/match";

export { sanitizePlayerName };

const JOIN_PATH = /^\/games\/moronarchy\/([^/]+)\/join\/?$/;
const MAX_LOBBY_BODY_BYTES = 4096;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX_REQUESTS = 120;

type Next = () => Promise<void>;

interface MiddlewareContext {
  ip?: string;
  method?: string;
  path: string;
  length?: number;
  throw: (status: number, message: string) => never;
}

interface KoaLikeApp {
  use: (middleware: (ctx: MiddlewareContext, next: Next) => Promise<void>) => void;
}

interface RateBucket {
  count: number;
  resetAt: number;
}

interface PlayerMetadata {
  name?: unknown;
}

interface MatchMetadata {
  unlisted?: unknown;
  players?: Record<string, PlayerMetadata>;
}

interface MatchRecord {
  metadata?: MatchMetadata;
}

interface MatchStateRecord {
  G?: { stage?: unknown };
}

interface LobbyDatabase {
  fetch?: (matchID: string, opts: { state: true }) => unknown;
  createMatch?: (matchID: string, match: MatchRecord) => unknown;
  setMetadata?: (matchID: string, metadata: MatchMetadata) => unknown;
}

const getJoinMatchId = (path: string): string | null => {
  const raw = JOIN_PATH.exec(path)?.[1];
  if (!raw) return null;
  try {
    return decodeURIComponent(raw);
  } catch {
    return null;
  }
};

const buckets = new Map<string, RateBucket>();

const sanitizeMetadata = (metadata: MatchMetadata): MatchMetadata => {
  metadata.unlisted = true;

  for (const player of Object.values(metadata.players ?? {})) {
    if (typeof player.name === "string") {
      player.name = sanitizePlayerName(player.name);
    }
  }

  return metadata;
};

export const applyLobbySecurity = (app: KoaLikeApp, db: LobbyDatabase): void => {
  app.use(async (ctx, next) => {
    if (ctx.path.startsWith("/games") && ctx.length && ctx.length > MAX_LOBBY_BODY_BYTES) {
      ctx.throw(413, "Lobby request is too large.");
    }

    const matchID = ctx.method === "POST" ? getJoinMatchId(ctx.path) : null;
    if (matchID && db.fetch) {
      const { state } = (await db.fetch(matchID, { state: true })) as { state?: MatchStateRecord };
      if (state && state.G?.stage !== "lobby") {
        ctx.throw(409, "Match already started.");
      }
    }

    const now = Date.now();
    const key = `${ctx.ip ?? "unknown"}:${ctx.path}`;
    const bucket = buckets.get(key);

    if (!bucket || bucket.resetAt <= now) {
      buckets.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
      await next();
      return;
    }

    bucket.count += 1;
    if (bucket.count > RATE_LIMIT_MAX_REQUESTS) {
      ctx.throw(429, "Too many lobby requests.");
    }

    await next();
  });

  const createMatch = db.createMatch?.bind(db);
  if (createMatch) {
    db.createMatch = (matchID, match) => {
      if (match.metadata) {
        sanitizeMetadata(match.metadata);
      }
      return createMatch(matchID, match);
    };
  }

  const setMetadata = db.setMetadata?.bind(db);
  if (setMetadata) {
    db.setMetadata = (matchID, metadata) => {
      return setMetadata(matchID, sanitizeMetadata(metadata));
    };
  }
};
