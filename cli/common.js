import { existsSync, readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { config } from "zoltra";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getRootDir = () => {
  const dir = path.resolve(__dirname, "../cli");
  return dir;
};

export const getPackageOpts = () => {
  const config = JSON.parse(
    readFileSync(path.resolve(__dirname, "../package.json"), "utf-8")
  );

  return config;
};

export function clearTerminal() {
  if (process.stdout.isTTY) {
    process.stdout.write("\x1B[2J\x1B[3J\x1B[H");
  }
}

export const getConfig = () => {};

const envFiles = [
  ".env",
  ".env.local",
  ".env.development",
  ".env.production",
  ".env.test",
];

export function getAvailableEnvFiles() {
  const projectRoot = process.cwd();
  return envFiles.filter((file) => existsSync(path.join(projectRoot, file)));
}

export const readConfig = () => {
  const tsConfig = path.join(process.cwd(), "tsconfig.json");
  const extention = existsSync(tsConfig) ? ".ts" : ".js";
  const dir = path.join(process.cwd(), `zoltra.config${extention}`);

  try {
    const content = readFileSync(dir, "utf-8");

    // Remove all comments
    const filteredContent = content
      .replace(
        /(['"`])(\\.|[^\x01\\])*?\1|\/\/.*|\/\*[\s\S]*?\*\//gm,
        (match, quote) => (quote ? match : "")
      )
      // Remove all import statements (ES6 imports, both default and named imports)
      .replace(/^\s*import\s+.*\s+from\s+['"`][^'"`]+['"`];/gm, "")
      .replace(/^\s*import\s+['"`][^'"`]+['"`];/gm, "")
      .replace(/\s+/g, "")
      .replace(/asZoltraConfig/, "");

    const match = filteredContent.match(/\{.*\}/)?.[0];
    if (match) {
      const configObj = new Function(`return ${match}`)();
      return { ...configObj };
    } else {
      console.log("Invalid config file");
      return config;
    }
  } catch (error) {
    return config;
  }
};
