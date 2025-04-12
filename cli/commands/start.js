import { clearTerminal } from "../common.js";
import { execSync } from "child_process";
import { Logger } from "zoltra";

const logger = new Logger("ServerCommand");

export const start = () => {
  try {
    clearTerminal();
    execSync(`node server.js`, {
      stdio: "inherit",
      cwd: process.cwd(),
    });
  } catch (error) {
    logger.error("Error executing start command:", {
      stack: error.stack,
      message: error.message,
      name: "ServerCommand Execution",
    });
    process.exit(1);
  }
};

export const startTs = () => {
  try {
    clearTerminal();
    execSync(`node dist/server.js`, {
      stdio: "inherit",
      cwd: process.cwd(),
    });
  } catch (error) {
    logger.error("Error executing start:ts command:", {
      stack: error.stack,
      message: error.message,
      name: "ServerCommand Execution",
    });
    process.exit(1);
  }
};
