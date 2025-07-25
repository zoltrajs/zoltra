import { clearTerminal } from "../common.js";
import { execSync } from "child_process";
import { Logger } from "zoltra";

const logger = new Logger("DevCLI", undefined, false, true);

export const runDev = () => {
  try {
    clearTerminal();
    execSync("zoltra-watch -s server.js -j", {
      stdio: "inherit",
      cwd: process.cwd(),
    });
  } catch (error) {
    logger.error("Error executing dev command:", {
      stack: error.stack,
      message: error.message,
      name: "DevCLI Execution",
    });
    process.exit(1);
  }
};

export const runDevTs = () => {
  try {
    clearTerminal();
    execSync('tsc-watch --onsuccess "node dist/server.js"', {
      stdio: "inherit",
      cwd: process.cwd(),
    });
  } catch (error) {
    logger.error("Error executing dev:ts command:", {
      stack: error.stack,
      message: error.message,
      name: "DevCLI Execution",
    });
    process.exit(1);
  }
};
