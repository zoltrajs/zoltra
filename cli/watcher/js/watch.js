import { spawn } from "child_process";
import chokidar from "chokidar";
import { Logger, colorText } from "zoltra";
import {
  getAvailableEnvFiles,
  getPackageOpts,
  readConfig,
} from "../../common.js";
import { getLocalIp } from "../shared/index.js";
import { readFileSync, writeFileSync } from "fs";
import { delay } from "@zoltra-toolkit/node";
import { readdirSync } from "fs";
import { join } from "path";

const logger = new Logger("ZoltraDev", undefined, false, true);

let serverProcess = null;

function getDuration(durationInMs) {
  if (durationInMs >= 1000) {
    return `${(durationInMs / 1000).toFixed(1)}s`;
  } else {
    return `${durationInMs.toFixed(0)}ms`;
  }
}

function debounce(func, delay) {
  let timeout;

  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), delay);
  };
}

// Start the server
function startServer(script) {
  const startTime = Date.now();
  if (serverProcess) {
    serverProcess.kill();
    logger.info("🔁 Restarting server...");
  }

  serverProcess = spawn("node", [script], {
    stdio: "inherit",
  });

  const endTime = Date.now();
  const duration = getDuration(endTime - startTime);
  logger.info(`✅ Server started in ${duration}`);
}

const debouncedRestart = debounce(startServer, 500);

export const startJsWatcher = (serverPath) => {
  logInfo();

  // Start server initially
  startServer(serverPath);

  const watcher = chokidar.watch(".", {
    ignored: /node_modules/,
    persistent: true,
    ignoreInitial: true,
    usePolling: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
  });

  watcher.on("ready", async (filePath) => {
    const files = getBasePath();

    files
      .filter((file) => !file.startsWith("public"))
      .forEach((file) => {
        const fullPath = join(process.cwd(), file);
        const updatedCode = addDotJsToImports(
          readFileSync(fullPath, "utf-8"),
          fullPath
        );
        if (updatedCode.shouldUpdate) {
          writeFileSync(fullPath, updatedCode.result);
        }
      });
    await delay(300);
  });

  watcher.on("change", async (filePath) => {
    if (filePath.endsWith(".js") || filePath.endsWith(".env")) {
      logger.info(`🟢 File changed: ${filePath}`);
      debouncedRestart(serverPath);
      const code = readFileSync(filePath, "utf-8");
      const updatedCode = addDotJsToImports(code, filePath);
      if (updatedCode.shouldUpdate) {
        writeFileSync(filePath, updatedCode.result);
        await delay(400);
      }
    }
  });
};

const logInfo = () => {
  const pkg = getPackageOpts();
  const tag =
    pkg.publishConfig.tag.slice(0, 1).toUpperCase() +
    pkg.publishConfig.tag.slice(1);

  const availableEnvs = getAvailableEnvFiles();
  const config = readConfig();

  console.log(`
  ${colorText(`⚡ Zoltra.js ${pkg.version}`, "bold", "cyan")} (${tag})
  -----------------------------------------
  - 🌐 Local:        http://localhost:${config.PORT}
  - 📡 IP Address:   ${getLocalIp()}
  - 🧪 Environments: ${availableEnvs.join(", ") || "None"}
  -----------------------------------------
      `);

  logger.info(`⚡ Starting...`);
};

function addDotJsToImports(code, fullPath) {
  let shouldUpdate = false;
  const result = code.replace(
    /from\s+["'](\.{1,2}\/[^"']*)["']/g,
    (match, importPath) => {
      // Skip if already ends with .js or has an extension
      if (importPath.endsWith(".js") || /\.\w+$/.test(importPath)) {
        return match;
      }
      shouldUpdate = true;
      logger.info(
        colorText(`⚙️  Updated import at: ${fullPath}`, "cyan", "bold")
      );
      return `from "${importPath}.js"`;
    }
  );

  return { shouldUpdate, result };
}

function getBasePath(routeDir = process.cwd()) {
  const filePattern = /\.js$/;
  const excludePattern = /^(index|\.test|\.spec)\.(js|ts)$/;

  const routeItems = readdirSync(routeDir, { withFileTypes: true });

  return routeItems
    .filter((file) => !file.name.startsWith("node_modules"))
    .flatMap((item) => {
      if (
        item.isFile() &&
        filePattern.test(item.name) &&
        !excludePattern.test(item.name)
      ) {
        return [item.name];
      } else if (item.isDirectory()) {
        const subDir = join(routeDir, item.name);
        const subFiles = readdirSync(subDir, "utf-8")
          .filter(
            (file) => filePattern.test(file) && !excludePattern.test(file)
          )
          .map((file) => `${item.name}/${file}`);

        const subDirs = readdirSync(subDir, { withFileTypes: true })
          .filter((subItem) => subItem.isDirectory())
          .flatMap((subItem) => {
            const nestedPaths = getBasePath(join(subDir, subItem.name));
            return nestedPaths.map((path) => `${item.name}/${path}`);
          });

        return [...subFiles, ...subDirs];
      }
      return [];
    });
}
