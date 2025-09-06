import { ChildProcess, spawn } from "child_process";
import chokidar from "chokidar";
import path from "path";
import { Logger } from "../../lib";

let serverProcess: ChildProcess | null = null;
let restartTimer: NodeJS.Timeout | null = null;

const logger = new Logger({ context: "Dev-Server" });

/**
 * Start or restart the Express server
 */
function startServer(entryPath: string) {
  if (serverProcess) {
    logger.info("♻️  Restarting server...");
    serverProcess.kill("SIGTERM");
  }

  serverProcess = spawn("node", [entryPath], {
    stdio: "inherit",
    env: { ...process.env },
  });

  serverProcess.on("exit", (code, signal) => {
    if (signal !== "SIGTERM") {
      logger.info(`⚠️  Server exited with code ${code}`);
    }
  });
}

/**
 * Debounced restart
 */
function restartServer(path: string) {
  if (restartTimer) clearTimeout(restartTimer);
  restartTimer = setTimeout(() => {
    startServer(path);
  }, 300); // debounce 300ms
}

/**
 * Watch files with chokidar
 */
function watchFiles(entryPath: string) {
  const watcher = chokidar.watch(
    [
      ".",
      ".env",
      ".env.local",
      ".env.development",
      ".env.production",
      "!node_modules",
      "!logs",
      "!.git",
    ],
    {
      persistent: true,
      ignoreInitial: true,
      ignored: [/node_modules/],
    }
  );

  watcher.on("all", (event, filePath) => {
    const ext = path.extname(filePath);
    const watchExts = [".js", ".mjs", ".cjs", ".ts", ".env"];

    if (watchExts.includes(ext) || filePath.includes(".env")) {
      logger.info(`📝 File changed: ${filePath}`);
      restartServer(entryPath);
    }
  });

  logger.info("🔍 Watching for file changes...");
}

/**
 * Cleanup on exit
 */
process.on("SIGINT", () => {
  logger.info("🛑 Stopping dev server...");
  if (serverProcess) serverProcess.kill("SIGTERM");
  process.exit();
});

// Start dev server
export const startDevServer = (path: string) => {
  startServer(path);
  watchFiles(path);
};
