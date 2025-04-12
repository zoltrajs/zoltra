import { clearTerminal } from "../common.js";
import { execSync } from "child_process";
import { Logger } from "zoltra";

const logger = new Logger("DevCLI");

export const runDev = () => {
  try {
    clearTerminal();
    execSync(`zoltra-watch -s server.js -j`, {
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
    execSync(`zoltra-watch -s dist/server.js -t`, {
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
