import react from "@vitejs/plugin-react";
import process from "node:process";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

const gameServerTarget = process.env.GAME_SERVER_PROXY_TARGET ?? "http://localhost:8000";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      manifest: {
        name: "Moronarchy",
        short_name: "Moronarchy",
        description: "A mobile-first multiplayer king board game.",
        theme_color: "#171312",
        background_color: "#f7efe0",
        display: "standalone",
        orientation: "portrait",
        icons: [
          {
            src: "/icon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any maskable"
          }
        ]
      }
    })
  ],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  server: {
    port: 5173,
    // The dev page talks to the game server through these same-origin paths, so one port is enough for LAN phones
    // and for the Cloudflare tunnel (`pnpm dev:tunnel`).
    proxy: {
      "/games": { target: gameServerTarget, changeOrigin: true },
      "/socket.io": { target: gameServerTarget, changeOrigin: true, ws: true }
    },
    // Quick tunnels get a random *.trycloudflare.com host each run.
    allowedHosts: [".trycloudflare.com"],
    // Behind the tunnel the page is served over https on 443, so hot reload must connect back there.
    hmr: process.env.DEV_TUNNEL === "1" ? { clientPort: 443, protocol: "wss" } : undefined
  }
});
