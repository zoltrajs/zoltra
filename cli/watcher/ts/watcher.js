import chokidar from "chokidar";
import { Logger, colorText } from "zoltra";
import {
  getAvailableEnvFiles,
  getPackageOpts,
  readConfig,
} from "../../common.js";
import { existsSync } from "fs";
import { getLocalIp } from "../shared/index.js";

const logger = new Logger("FileWatcher");

function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function watchFiles(rootDir, compileTypeScript) {
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

  compileTypeScript(rootDir);

  const debouncedCompile = debounce((path) => {
    logger.info(`🚧 Compiling ${path}`);
    compileTypeScript(path);
  }, 500);

  // Ensure the directory exists
  if (!existsSync(rootDir)) {
    logger.error(`Directory does not exist: ${rootDir}`, {
      message: "Directory does not exist",
      name: "WatcherError",
    });
    return;
  }

  const watcher = chokidar.watch(rootDir, {
    ignored: [
      // /(^|[\/\\])\../, // Ignore dotfiles
      /node_modules/, // Ignore node_modules
      /dist/, // Ignore output folder (e.g., dist)
      /.*\.js$/, // Ignore compiled JavaScript files
    ],
    persistent: true,
    ignoreInitial: true, // Ignore initial "add" events when the watcher starts
    usePolling: true, // Polling ensures it works on networked filesystems
    awaitWriteFinish: {
      stabilityThreshold: 2000, // Wait 2 seconds after write to ensure file is fully saved
      pollInterval: 100, // Poll every 100ms for changes
    },
  });

  watcher.on("all", (event, path) => {
    if (path.endsWith(".ts") || path.endsWith("tsconfig.json")) {
      debouncedCompile(path);
    }
  });
}
