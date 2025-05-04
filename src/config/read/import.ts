import { config as DefaultConfig } from "..";
import { existsSync } from "fs";
import path, { join } from "path";
import { ZoltraConfig } from "zoltra/types";
import { Logger } from "../../utils";
import { pathToFileURL } from "url";

const importConfig = async (): Promise<ZoltraConfig> => {
  const logger = new Logger("ConfigReader");

  try {
    const isTypeScript = existsSync(path.join(process.cwd(), "tsconfig.json"));

    let routesDir = process.cwd();
    let configFileNotFoundLogged = false;

    if (isTypeScript) {
      routesDir = path.join(process.cwd(), "dist/");
    }

    const configPaths = [
      join(routesDir, "zoltra.config.js"),
      join(routesDir, "zoltra.config.mjs"),
      join(routesDir, "zoltra.config.ts"),
    ];

    let config;
    for (const path of configPaths) {
      try {
        const pathURL = pathToFileURL(path).href;
        const module = await import(pathURL);
        const default_ = module.default.default
          ? module.default.default
          : module.default;
        config = default_;
        break;
      } catch (e) {
        continue;
      }
    }

    const configPath = path.join(routesDir, `zoltra.config.js`);

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

    // const config = await import(routeURL);

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
