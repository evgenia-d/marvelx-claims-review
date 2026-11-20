import { defineConfig } from "@playwright/test";

// channel "chrome" drives the system Google Chrome, so no browser download is needed
// (Playwright's bundled Chromium isn't installed here). Install Chrome, or change the channel.
// One server pair shared by every test, so tests run one at a time and each one restarts the replay.
export default defineConfig({
  testDir: "e2e",
  workers: 1,
  fullyParallel: false,
  reporter: "list",
  use: { channel: "chrome", baseURL: "http://localhost:5173" },
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
