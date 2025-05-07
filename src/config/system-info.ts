import { existsSync } from "fs";
import { join } from "path";
import { readConfig } from "./read/read";

export const getLang = () => {
  const rootDir = join(process.cwd());
  const isTypeScript = existsSync(join(rootDir, "tsconfig.json"));
  const basePath = isTypeScript ? join(rootDir, "dist") : rootDir;

  const fullTsPath = (file: string) =>
    isTypeScript ? join(basePath, file.replace(".ts", ".js")) : basePath;

  return { isTypeScript, basePath, fullTsPath };
};

export const getTestRoot = (file: string) => {
  const { fullTsPath, isTypeScript } = getLang();
  const hc = readConfig().experimental?.dev?.turboClient;

  const ext = isTypeScript && hc ? ".mjs" : ".js";

  return fullTsPath(join("test", file)).replace(/\.(js|ts)$/, ext);
};

export const getExtension = () => {
  const { isTypeScript } = getLang();
  const hc = readConfig().experimental?.dev?.turboClient;

  const ext = isTypeScript && hc ? ".mjs" : ".js";
  return ext;
};
