import { clearTerminal } from "../common.js";
import { execSync } from "child_process";
import { Logger } from "zoltra";

const logger = new Logger("DevCLI");

export const runDev = () => {};

export const runDevTs = () => {
  try {
    clearTerminal();
    execSync(`zoltra-watch --server dist/server.js`, {
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
