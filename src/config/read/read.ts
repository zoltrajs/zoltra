import { ZoltraConfig } from "../../types";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { config as DefaultConfig } from "../index";
import { checkEnv } from "core/constants";

export const readConfig = (logWarning: boolean = true): ZoltraConfig => {
  try {
    const { IS_SERVERLESS, IS_PROD } = checkEnv();
    const isServerLess = IS_PROD && IS_SERVERLESS;

    const configFilePath = buildPath(isServerLess);

    if (!existsSync(configFilePath)) {
      console.warn(
        `[WARN] Config file not found at ${configFilePath} — using default config.`
      );
      return DefaultConfig;
    }

    if (isServerLess) {
      console.log("[INFO] Running on ServerLess production environment.");
      // Always read from root
      const required = require(configFilePath);
      const config = required.default || required;

      return config;
    } else {
      const config = readRawConfig(configFilePath);
      return config;
    }
  } catch (error) {
    const err = error as Error;
    if (logWarning) {
      console.warn(
        `[WARN] Failed to read config - using default using default: ${err.message}`
      );
    }
    return DefaultConfig;
  }
};

const readRawConfig = (filePath: string, logWarning: boolean = true) => {
  const content = readFileSync(filePath, "utf-8");

  // Remove all comments and imports, then parse
  const filteredContent = content
    .replace(
      /(['"`])(\\.|[^\x01\\])*?\1|\/\/.*|\/\*[\s\S]*?\*\//gm,
      (match, quote) => (quote ? match : "")
    )
    .replace(/^\s*import\s+.*\s+from\s+['"`][^'"`]+['"`];/gm, "")
    .replace(/^\s*import\s+['"`][^'"`]+['"`];/gm, "")
    .replace(/\s+/g, "")
    .replace(/asZoltraConfig/, "");

  const match = filteredContent.match(/\{.*\}/)?.[0];
  if (match) {
    const configObj: ZoltraConfig = new Function(`return ${match}`)();
    return { ...configObj };
  } else {
    if (logWarning) {
      console.warn(`[WARN] Invalid config format in ${filePath}`);
    }
    return DefaultConfig;
  }
};

const buildPath = (isServerLess: boolean) => {
  if (isServerLess) {
    return path.join(process.cwd(), "zoltra.config.js");
  }

  if (existsSync(path.join(process.cwd(), "tsconfig.json"))) {
    return path.join(process.cwd(), "zoltra.config.ts");
  } else {
    return path.join(process.cwd(), "zoltra.config.js");
  }
};
