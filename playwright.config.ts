import { defineConfig, devices } from "@playwright/test";

const PORT = 4173;

export default defineConfig({
  testDir: "e2e",
  fullyParallel: true,
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: `http://localhost:${PORT}`, trace: "off" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "iphone", use: { ...devices["iPhone 14 Pro"], browserName: "chromium" } },
  ],
  webServer: { command: "pnpm build && node scripts/serve-out.mjs", port: PORT, reuseExistingServer: !process.env.CI, timeout: 180_000 },
});
