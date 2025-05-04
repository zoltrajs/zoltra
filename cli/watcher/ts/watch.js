import * as fs from "fs";
import * as path from "path";
import { Logger } from "zoltra";
import { watchFiles } from "./watcher.js";
import { spawn } from "child_process";
import { cleanOrphanedFiles } from "../shared/cleanOrphans.js";
import { removeExtensionDuplicates } from "../shared/cleaner.js";
import { readConfig } from "../../common.js";
import { delay } from "@zoltra-toolkit/node";

const logger = new Logger("FileWatcher");

let serverProcess = null;

function getDuration(durationInMs) {
  if (durationInMs >= 1000) {
    return `${(durationInMs / 1000).toFixed(1)}s`;
  } else {
    return `${durationInMs.toFixed(0)}ms`;
  }
}

// Start the server
function startServer(script) {
  if (serverProcess) {
    serverProcess.kill();
    logger.info("🔁 Restarting server...");
  }

  serverProcess = spawn("node", [script], {
    stdio: "inherit",
  });

  logger.info("🚀 Server started");
}

export const startTsWatcher = async (serverPath) => {
  try {
    const ts = await import("typescript");

    // Load tsconfig.json
    const configFileName = ts.findConfigFile(
      "./",
      ts.sys.fileExists,
      "tsconfig.json"
    );

    if (!configFileName) {
      throw new Error("tsconfig.json not found");
    }

    const configFile = ts.readConfigFile(configFileName, ts.sys.readFile);
    const parsedConfig = ts.parseJsonConfigFileContent(
      configFile.config,
      ts.sys,
      path.dirname(configFileName)
    );

    const compilerOptions = parsedConfig.options;
    const rootDir = compilerOptions.rootDir || "./";
    const outDir = compilerOptions.outDir || "./dist";

    // Ensure outDir exists
    if (!fs.existsSync(outDir)) {
      fs.mkdirSync(outDir, { recursive: true });
    }
    // Function to compile TypeScript files
    async function compileTypeScript(changedFilePath) {
      const program = ts.createProgram(parsedConfig.fileNames, compilerOptions);
      const emitResult = program.emit();

      // Report diagnostics
      const diagnostics = ts
        .getPreEmitDiagnostics(program)
        .concat(emitResult.diagnostics);

      let hasError = false;

      diagnostics.forEach((diagnostic) => {
        const message = ts.flattenDiagnosticMessageText(
          diagnostic.messageText,
          "\n"
        );

        if (diagnostic.file) {
          const { line, character } =
            diagnostic.file.getLineAndCharacterOfPosition(diagnostic.start);

          logger.error(
            `${diagnostic.file.fileName} (${line + 1},${
              character + 1
            }): ${message}`,
            {
              stack: `${diagnostic.file.fileName} (${line + 1},${
                character + 1
              })`,
              message,
              name: "DiagnosticError",
            }
          );
        } else {
          logger.error(message, {
            name: "DiagnosticError",
            message,
            stack: "No file context",
          });
        }

        hasError = true;
      });

      if (hasError || emitResult.emitSkipped) {
        logger.error("❌ Compilation aborted due to errors.");

        return;
      } else {
        const startTime = process.hrtime(); // start before compilation
        const emitResult = program.emit(); // then emit

        // after emit
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const durationMs = Math.round(seconds * 1000 + nanoseconds / 1e6);
        logger.info(
          `✅ Compiled ${changedFilePath} in ${getDuration(durationMs)}`
        );
        await cleanOrphanedFiles(logger)
          .then(
            (count) =>
              count >= 1 && logger.info(`Removed ${count} orphaned files`)
          )
          .catch((err) => logger.error("Error:", err));

        await removeExtensionDuplicates(
          readConfig().experimental?.dev?.turboClient,
          logger
        ).then(
          (count) =>
            count >= 1 && logger.info(`Removed ${count} duplicate files`)
        );
        await delay(300);
        startServer(serverPath);
      }
    }

    // Watch for changes in the rootDir
    watchFiles(rootDir, compileTypeScript);
  } catch (error) {
    logger.error("Error starting TypeScript watcher:", {
      ...error,
      name: "WatcherError",
    });
  }
};
