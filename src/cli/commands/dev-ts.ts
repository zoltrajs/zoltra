import { ChildProcess, execSync, spawn } from "child_process";
import chokidar from "chokidar";
import path from "path";

let serverProcess: ChildProcess | null = null;
let restartTimer: NodeJS.Timeout | null = null;

/**
 * Start or restart the Express server
 */
function startServer(entryPath: string) {
  execSync("tsc", {
    stdio: "inherit",
    cwd: process.cwd(),
  });
  if (serverProcess) {
    console.log("♻️  Restarting server...");
    serverProcess.kill("SIGTERM");
  }

  serverProcess = spawn("node", [entryPath], {
    stdio: "inherit",
    env: { ...process.env },
  });

  serverProcess.on("exit", (code, signal) => {
    if (signal !== "SIGTERM") {
      console.log(`⚠️  Server exited with code ${code}`);
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
    }
  );

  watcher.on("all", (event, filePath) => {
    const ext = path.extname(filePath);
    const watchExts = [".js", ".mjs", ".cjs", ".ts", ".env"];

    if (watchExts.includes(ext) || filePath.includes(".env")) {
      console.log(`📝 File changed: ${filePath}`);
      restartServer(entryPath);
    }
  });

  console.log("🔍 Watching for file changes...");
}

/**
 * Cleanup on exit
 */
process.on("SIGINT", () => {
  console.log("\n🛑 Stopping dev server...");
  if (serverProcess) serverProcess.kill("SIGTERM");
  process.exit();
});

// Start dev server
export const startTsDevServer = (path: string) => {
  startServer(path);
  watchFiles(path);
};
