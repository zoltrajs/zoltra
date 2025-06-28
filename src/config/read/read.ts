import { ZoltraConfig } from "../../types";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { config as DefaultConfig } from "../index";

export const readConfig = (): ZoltraConfig => {
  try {
    const DEPLOYMENT_ENV = process.env.DEPLOYMENT_ENV;
    const NODE_ENV = process.env.NODE_ENV;
    const isVercelProduction =
      NODE_ENV === "production" && DEPLOYMENT_ENV === "VERCEL";

    const configFilePath = buildPath(isVercelProduction);

    if (!existsSync(configFilePath)) {
      console.warn(
        `[WARN] Config file not found at ${configFilePath} — using default config.`
      );
      return DefaultConfig;
    }

    if (isVercelProduction) {
      console.log("[INFO] Running in Vercel production environment.");
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
    console.error(
      `[ERROR] Failed to read config — using default. ${err.message}`
    );
    return DefaultConfig;
  }
};

const readRawConfig = (filePath: string) => {
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
    console.warn(`[WARN] Invalid config format in ${filePath}`);
    return DefaultConfig;
  }
};

const buildPath = (isVercelProd: boolean) => {
  if (isVercelProd) {
    return path.join(process.cwd(), "zoltra.config.js");
  }

  if (existsSync(path.join(process.cwd(), "tsconfig.json"))) {
    return path.join(process.cwd(), "zoltra.config.ts");
  } else {
    return path.join(process.cwd(), "zoltra.config.js");
  }
};
