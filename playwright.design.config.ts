import { defineConfig, devices } from "@playwright/test";

const designChromePath = "D:/Working/cloakbrowser-windows-x64/chrome.exe";

export default defineConfig({
  testDir: "tests/design",
  outputDir: "test-results/design",
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
    baseURL: "http://127.0.0.1:8088",
    launchOptions: {
      executablePath: designChromePath
    },
    screenshot: "only-on-failure",
    trace: "retain-on-failure",
    video: "retain-on-failure"
  },
  webServer: {
    command: "cmd /c pnpm exec vite design --host 127.0.0.1 --port 8088 --strictPort",
    url: "http://127.0.0.1:8088/",
    reuseExistingServer: true,
    timeout: 60_000
  }
});
