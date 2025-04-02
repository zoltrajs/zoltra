import { config as DefaultConfig } from ".";
import { existsSync } from "fs";
import path from "path";
import { ZoltraConfig } from "types";
import { pathToFileURL } from "url";
import { Logger } from "utils";

const readConfig = async () => {
  const logger = new Logger("ConfigReader");
  try {
    const isTypeScript = existsSync(path.join(process.cwd(), "tsconfig.json"));
    const ext = isTypeScript ? ".ts" : ".js";
    let routesDir = path.join(process.cwd(), "/");

    if (isTypeScript) {
      routesDir = path.join(process.cwd(), "dist/");
    }

    const configPath = path.join(routesDir, "zoltra.config.js");

    if (!existsSync(configPath)) {
      logger.error(
        `⚠️ Config file not found at ${configPath} - Using default configuration.`,
        undefined,
        {
          problem: `The zoltra.config${ext} file is missing, which may lead to unexpected behavior.`,
          solution: `Create a zoltra.config${ext} file in the root directory and define your configuration.`,
          codeExample: `export default zoltraConfig({ /* Your settings here */ });`,
        }
      );
      return DefaultConfig;
    }

    const routeURL = pathToFileURL(configPath).href;
    const config = await import(routeURL);

    if (isTypeScript) {
      return config.default.default as ZoltraConfig;
    }

    return config.default as ZoltraConfig;
  } catch (error) {
    const err = error as Error;
    logger.error("⚠️ Failed to read config - Switching to default", {
      stack: err.stack,
      message: err.message,
      name: err.name,
    });

    return DefaultConfig;
  }
};

export default readConfig;
