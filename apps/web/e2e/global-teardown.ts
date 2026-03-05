import { type FullConfig } from "@playwright/test";
import fs from "fs";
import path from "path";

/**
 * Global Teardown: Cleans up auth state files after test run.
 */
async function globalTeardown(_config: FullConfig) {
  const authFile = path.join(__dirname, ".auth", "user.json");
  if (fs.existsSync(authFile)) {
    fs.unlinkSync(authFile);
  }
}

export default globalTeardown;
