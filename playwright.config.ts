import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 45_000,
  expect: {
    timeout: 10_000
  },
  fullyParallel: false,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:5173",
    trace: "retain-on-failure"
  },
  webServer: [
    {
      command: "cmd /c pnpm --filter @moronarchy/core build && pnpm --filter @moronarchy/server dev",
      url: "http://127.0.0.1:8000/games",
      reuseExistingServer: true,
      timeout: 120_000
    },
    {
      command: "cmd /c pnpm --filter @moronarchy/core build && pnpm --filter @moronarchy/web dev",
      url: "http://127.0.0.1:5173",
      reuseExistingServer: true,
      timeout: 120_000
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
