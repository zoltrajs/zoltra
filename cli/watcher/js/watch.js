import * as path from "path";
import { spawn } from "child_process";
import chokidar from "chokidar";
import { Logger, colorText } from "zoltra";
import {
  getAvailableEnvFiles,
  getPackageOpts,
  readConfig,
} from "../../common.js";
import { getLocalIp } from "../shared/index.js";

const logger = new Logger("FileWatcher");

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
  if (serverProcess) {
    serverProcess.kill();
    logger.info("🔁 Restarting server...");
  }

  const startTime = Date.now();
  // logger.info("🚀 Starting server...");
  serverProcess = spawn("node", [script], {
    stdio: "inherit",
  });

  const endTime = Date.now();
  const duration = getDuration(endTime - startTime);
  logger.info(`⏱️ Server started in ${duration}`);
}

const debouncedRestart = debounce(startServer, 500);

const restartServer = (script) => {
  const startTime = Date.now();
  debouncedRestart(script);
  const endTime = Date.now();
  const duration = getDuration(endTime - startTime);
  logger.info(`⏱️ Server restarted in ${duration}`);
};

export const startJsWatcher = (serverPath) => {
  const watchDir = path.resolve(process.cwd());
  logInfo();
  //   logger.info("👀 Watching JavaScript files...");

  // Start server initially
  startServer(serverPath);

  const watcher = chokidar.watch(watchDir, {
    ignored: /node_modules/,
    persistent: true,
    ignoreInitial: true,
    usePolling: true,
    awaitWriteFinish: {
      stabilityThreshold: 2000,
      pollInterval: 100,
    },
  });

  watcher.on("change", (filePath) => {
    if (filePath.endsWith(".js") || filePath.endsWith(".env")) {
      logger.info(`🟢 File changed: ${filePath}`);
      restartServer(serverPath);
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
      🌐 Local:        http://localhost:${config.PORT}
      📡 IP Address:   ${getLocalIp()}
      🧪 Environments: ${availableEnvs.join(", ") || "None"}
      -----------------------------------------
      `);

  logger.info(`⚡ Starting...`);
};
