// Starts the full dev stack (game server + web with hot reload) and a Cloudflare Quick Tunnel to it, then prints the
// public https URL to open on a phone from anywhere. The PC must stay on. The URL changes on every run.
// Usage: pnpm dev:tunnel   (or double-click dev-tunnel.bat)
import { spawn } from "node:child_process";

const WEB_PORT = 5173;
const isWindows = process.platform === "win32";
const children = [];

const run = (command, args, options = {}) => {
  const child = spawn(command, args, { stdio: ["ignore", "pipe", "pipe"], shell: isWindows, ...options });
  children.push(child);
  return child;
};

const stopAll = () => {
  for (const child of children) {
    if (child.exitCode === null) {
      if (isWindows) {
        spawn("taskkill", ["/pid", String(child.pid), "/T", "/F"], { stdio: "ignore" });
      } else {
        child.kill("SIGTERM");
      }
    }
  }
};
process.on("SIGINT", () => {
  stopAll();
  process.exit(0);
});
process.on("exit", stopAll);

const prefix = (name, stream) => {
  stream.on("data", (chunk) => {
    for (const line of chunk.toString().split(/\r?\n/)) {
      if (line.trim()) {
        console.log(`[${name}] ${line}`);
      }
    }
  });
};

console.log("Starting game server + web (hot reload) ...");
const dev = run("pnpm", ["dev"], { env: { ...process.env, DEV_TUNNEL: "1" } });
prefix("dev", dev.stdout);
prefix("dev", dev.stderr);
dev.on("exit", (code) => {
  console.log(`[dev] stopped (${code}). Closing the tunnel.`);
  stopAll();
  process.exit(code ?? 1);
});

const waitForWeb = async () => {
  for (let attempt = 0; attempt < 240; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${WEB_PORT}/`);
      if (response.ok) {
        return;
      }
    } catch {
      // not up yet
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Web server did not start on port ${WEB_PORT}`);
};

await waitForWeb();
console.log("Opening Cloudflare tunnel ...");
const tunnel = run("cloudflared", ["tunnel", "--no-autoupdate", "--url", `http://localhost:${WEB_PORT}`]);
let announced = false;
const watchTunnel = (stream) => {
  stream.on("data", (chunk) => {
    const text = chunk.toString();
    const match = /https:\/\/[a-z0-9-]+\.trycloudflare\.com/.exec(text);
    if (match && !announced) {
      announced = true;
      const url = match[0];
      console.log("\n==================================================================");
      console.log(`  Moronarchy is online:  ${url}`);
      console.log(`  Play vs bots:          ${url}/solo`);
      console.log(`  UI gallery:            ${url}/dev/gallery`);
      console.log("  Keep this window open. Ctrl+C stops the server and the tunnel.");
      console.log("==================================================================\n");
    }
    if (/ERR|error/i.test(text) && !/INF/.test(text)) {
      process.stdout.write(`[tunnel] ${text}`);
    }
  });
};
watchTunnel(tunnel.stdout);
watchTunnel(tunnel.stderr);
tunnel.on("exit", (code) => {
  console.log(`[tunnel] closed (${code}). The dev server keeps running; restart pnpm dev:tunnel for a new URL.`);
});
