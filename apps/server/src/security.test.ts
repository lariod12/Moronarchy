import { describe, expect, it, vi } from "vitest";
import { applyLobbySecurity, sanitizePlayerName } from "./security.js";

describe("server lobby security", () => {
  it("trims, collapses spaces, removes control characters, and caps player names", () => {
    expect(sanitizePlayerName("  King\u0000   VeryVeryVeryLongName  ")).toBe("King VeryVeryVeryL");
  });

  it("rejects non-string names as empty", () => {
    expect(sanitizePlayerName(null)).toBe("");
  });

  describe("join guard", () => {
    type Middleware = Parameters<Parameters<typeof applyLobbySecurity>[0]["use"]>[0];

    const setup = (stage: string | null) => {
      let middleware: Middleware | undefined;
      const fetch = vi.fn(async () => ({ state: stage === null ? undefined : { G: { stage } } }));
      applyLobbySecurity({ use: (fn) => (middleware = fn) }, { fetch });
      const run = async (method: string, path: string, ip: string) => {
        const next = vi.fn(async () => undefined);
        const ctx = {
          ip,
          method,
          path,
          throw: vi.fn((status: number, message: string): never => {
            throw new Error(`${status} ${message}`);
          })
        };
        const outcome = middleware ? await middleware(ctx, next).then(() => "ok", (error: Error) => error.message) : "no middleware";
        return { outcome, next, fetch };
      };
      return run;
    };

    it("rejects joining a match that already left the lobby", async () => {
      const run = await setup("playing");
      const { outcome, next, fetch } = await run("POST", "/games/moronarchy/abc123/join", "join-1");
      expect(outcome).toBe("409 Match already started.");
      expect(fetch).toHaveBeenCalledWith("abc123", { state: true });
      expect(next).not.toHaveBeenCalled();
    });

    it("lets players join while the match is in the lobby", async () => {
      const run = await setup("lobby");
      const { outcome, next } = await run("POST", "/games/moronarchy/abc123/join", "join-2");
      expect(outcome).toBe("ok");
      expect(next).toHaveBeenCalledOnce();
    });

    describe("CORS on rejections", () => {
      const reject = async (origin: string | undefined) => {
        let middleware: Middleware | undefined;
        applyLobbySecurity(
          { use: (fn) => (middleware = fn) },
          { fetch: vi.fn(async () => ({ state: { G: { stage: "playing" } } })) },
          { origins: ["http://localhost:5173"] }
        );
        const thrown = vi.fn((status: number, message: string): never => {
          throw new Error(`${status} ${message}`);
        });
        const ctx = {
          ip: `cors-${origin ?? "none"}`,
          method: "POST",
          path: "/games/moronarchy/abc123/join",
          get: (field: string) => (field === "Origin" ? (origin ?? "") : ""),
          throw: thrown
        };
        await middleware?.(ctx, vi.fn(async () => undefined)).catch(() => undefined);
        return thrown;
      };

      it("lets the browser read the 409 from an allowed origin", async () => {
        const thrown = await reject("http://localhost:5173");
        expect(thrown).toHaveBeenCalledWith(409, "Match already started.", {
          headers: { "Access-Control-Allow-Origin": "http://localhost:5173", Vary: "Origin" }
        });
      });

      it("adds no CORS header for unknown or missing origins", async () => {
        expect(await reject("http://evil.example")).toHaveBeenCalledWith(409, "Match already started.");
        expect(await reject(undefined)).toHaveBeenCalledWith(409, "Match already started.");
      });
    });

    it("leaves other requests untouched", async () => {
      const run = await setup("playing");
      for (const [method, path] of [
        ["POST", "/games/moronarchy/create"],
        ["POST", "/games/moronarchy/abc123/leave"],
        ["GET", "/games/moronarchy/abc123/join"],
        ["GET", "/games/moronarchy/abc123"]
      ] as const) {
        const { outcome, next, fetch } = await run(method, path, `other-${method}-${path}`);
        expect(outcome).toBe("ok");
        expect(next).toHaveBeenCalledOnce();
        expect(fetch).not.toHaveBeenCalled();
      }
    });
  });
});
