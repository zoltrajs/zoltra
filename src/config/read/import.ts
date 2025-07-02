import { checkEnv } from "core/constants";
import { config as DefaultConfig } from "..";
import { existsSync } from "fs";
import path from "path";
import { LoggerInterface, ZoltraConfig } from "zoltra/types";

const importConfig = async (logger: LoggerInterface): Promise<ZoltraConfig> => {
  try {
    const isTypeScript = existsSync(path.join(process.cwd(), "tsconfig.json"));
    const { IS_SERVERLESS, IS_PROD } = checkEnv();

    let config: ZoltraConfig | null = null;
    let configFileNotFoundLogged = false;

    if (IS_PROD && IS_SERVERLESS) {
      logger.info("[INFO] Running in Vercel production environment.");
      // Always try to load from project root
      const configPath = path.join(process.cwd(), "zoltra.config.js");
      if (existsSync(configPath)) {
        try {
          // using require for CommonJS
          const required = require(configPath);
          config =
            required.default && typeof required.default === "object"
              ? required.default
              : required;
        } catch (e) {
          logger.error(
            `Failed to load config on Vercel: ${
              e instanceof Error ? e.message : e
            }`
          );
          config = DefaultConfig;
        }
      } else {
        logger.warn(
          `zoltra.config.js not found in project root on Vercel, using default.`
        );
        config = DefaultConfig;
      }
      return config || DefaultConfig;
    }

    // fallback normal behavior for non-Vercel environments
    let routesDir = process.cwd();
    if (isTypeScript) {
      routesDir = path.join(process.cwd(), "dist");
    }

    const configPaths = [
      path.join(routesDir, "zoltra.config.js"),
      path.join(routesDir, "zoltra.config.ts"),
    ];

    for (const p of configPaths) {
      try {
        if (existsSync(p)) {
          const required = require(p);
          config =
            required.default && typeof required.default === "object"
              ? required.default
              : required;
          break;
        }
      } catch {
        continue;
      }
    }

    const configPath = path.join(routesDir, "zoltra.config.js");
    if (!config) {
      if (!configFileNotFoundLogged) {
        logger.error(
          `Config file not found at ${configPath} - Using default configuration.`,
          undefined,
          {
            problem: `The zoltra.config.js file is missing, which may lead to unexpected behavior.`,
            solution: `Create a zoltra.config.js file in the root directory and define your configuration.`,
            codeExample:
              "export default zoltraConfig({ /* Your settings here */ });",
          }
        );
        configFileNotFoundLogged = true;
      }
      return DefaultConfig;
    }

    return config;
  } catch (error) {
    const err = error as Error;
    logger.error("Failed to read config - Switching to default", {
      stack: err.stack,
      message: err.message,
      name: err.name,
    });
    return DefaultConfig;
  }
};

export default importConfig;
