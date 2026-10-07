import { defineConfig, devices } from "@playwright/test";

const uiChromePath = "D:/Working/cloakbrowser-windows-x64/chrome.exe";

export default defineConfig({
  testDir: "tests/ui",
  outputDir: "test-results/ui",
  timeout: 30_000,
  expect: {
    timeout: 5_000
  },
  fullyParallel: false,
  workers: 1,
  retries: 0,
  reporter: [["list"]],
  use: {
    ...devices["Pixel 5"],
    baseURL: "http://127.0.0.1:5180",
    launchOptions: {
      executablePath: uiChromePath
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure"
  },
  webServer: {
    command:
      "cmd /c pnpm --filter @moronarchy/core build && pnpm --filter @moronarchy/web exec vite --host 127.0.0.1 --port 5180 --strictPort",
    url: "http://127.0.0.1:5180/",
    reuseExistingServer: true,
    timeout: 120_000
  }
});
