import { defineConfig, devices } from "@playwright/test";

// Ports are overridable so e2e can run while another dev server already owns 5173 / 8000.
const webPort = process.env.E2E_WEB_PORT ?? "5173";
const serverPort = process.env.E2E_SERVER_PORT ?? "8000";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  outputDir: "test-results/e2e",
  use: {
    baseURL: `http://127.0.0.1:${webPort}`,
    trace: "retain-on-failure"
  },
  webServer: [
    {
      command: "cmd /c pnpm --filter @moronarchy/core build && pnpm --filter @moronarchy/server dev",
      url: `http://127.0.0.1:${serverPort}/games`,
      reuseExistingServer: true,
      timeout: 120_000,
      // MORONARCHY_ENABLE_TEST_SCENARIOS lets endgame.spec.ts create a rigged "finale" room. Set it nowhere else, never in production.
      env: { PORT: serverPort, WEB_PORT: webPort, MORONARCHY_ENABLE_TEST_SCENARIOS: "1" }
    },
    {
      command: `cmd /c pnpm --filter @moronarchy/core build && pnpm --filter @moronarchy/web exec vite --host 127.0.0.1 --port ${webPort} --strictPort`,
      url: `http://127.0.0.1:${webPort}`,
      reuseExistingServer: true,
      timeout: 120_000,
      env: { VITE_GAME_SERVER_URL: `http://127.0.0.1:${serverPort}` }
    }
  ],
  projects: [
    {
      name: "mobile-chrome",
      use: {
        ...devices["Pixel 5"],
        launchOptions: {
          executablePath: "D:/Working/cloakbrowser-windows-x64/chrome.exe"
        }
      }
    }
  ]
});
