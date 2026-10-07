import react from "@vitejs/plugin-react";
import { renameSync } from "node:fs";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";
import type { Plugin } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// The font CSS lists a woff2 and a woff file per face; every modern browser takes the woff2, so the woff copies would
// only double the size of the one file.
const dropWoffFallbacks = (): Plugin => ({
  name: "moronarchy-drop-woff-fallbacks",
  enforce: "pre",
  transform(code, id) {
    if (!id.includes("@fontsource") || !id.endsWith(".css")) {
      return null;
    }
    return code.replace(/,\s*url\([^)]*\.woff\)\s*format\('woff'\)/g, "");
  }
});

// Builds solo.html into ONE file (all JS, CSS and fonts inlined) named moronarchy-solo.html: no PWA plugin, no service
// worker, no other files, so it opens from disk or from a phone's file manager.
const renameOutput = (): Plugin => ({
  name: "moronarchy-rename-solo-output",
  apply: "build",
  enforce: "post",
  closeBundle() {
    const dir = fileURLToPath(new URL("./dist-solo/", import.meta.url));
    renameSync(`${dir}solo.html`, `${dir}moronarchy-solo.html`);
  }
});

export default defineConfig({
  base: "./",
  publicDir: false,
  plugins: [dropWoffFallbacks(), react(), viteSingleFile(), renameOutput()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url))
    }
  },
  build: {
    outDir: "dist-solo",
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: {
      input: fileURLToPath(new URL("./solo.html", import.meta.url))
    }
  }
});
