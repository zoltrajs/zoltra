import { Logger } from "zoltra";
import { transformSync } from "@swc/core";
import { watch } from "chokidar";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, resolve, relative } from "path";
import { spawn } from "child_process";
import { delay } from "@zoltra-toolkit/node";
import { addDotJsToImports, getDuration, removeComments } from "./shared.js";
import { readConfig } from "../../../common.js";
import { removeExtensionDuplicates } from "../../shared/cleaner.js";
import { cleanOrphanedFiles } from "../../shared/cleanOrphans.js";

let serverProcess = null;

const startTestServer = (logger, hasStarted, script) => {
  const startTime = Date.now();
  if (serverProcess) {
    serverProcess.kill();
  }

  serverProcess = spawn("node", [script], {
    stdio: "inherit",
  });

  const endTime = Date.now();
  const duration = getDuration(endTime - startTime);
  if (!hasStarted) {
    logger.info(`🧪 Zolta TurboTest ready! in ${duration}`);
  }
};

class TurboTestClient {
  #logger = new Logger("TurboTestClient");
  #config = readConfig();
  #hasStarted = false;
  #SRC_DIR = resolve(".");
  #DIST_DIR = resolve("dist");

  constructor() {
    this.#runTask();
  }

  #runTask() {
    removeExtensionDuplicates(
      this.#config.experimental?.dev?.turboClient,
      this.#logger
    ).then(
      (count) =>
        count >= 1 && this.#logger.info(`Removed ${count} duplicate files`)
    );

    cleanOrphanedFiles(this.#logger)
      .then(
        (count) =>
          count >= 1 && this.#logger.info(`Removed ${count} orphaned files`)
      )
      .catch((err) => this.#logger.error("Error:", err));
  }

  #setStart() {
    this.#hasStarted = true;
  }

  async #handleFile(filePath, script) {
    if (!filePath.endsWith(".ts")) return;

    try {
      if (this.#hasStarted) {
        this.#logger.info(`🚧 Compiling ${filePath}`);
      }
      // Read TS file
      const tsCode = readFileSync(filePath, "utf8");

      const startTime = process.hrtime();
      // Transpile
      const { code } = transformSync(tsCode, {
        filename: filePath,
        jsc: {
          parser: {
            syntax: "typescript",
          },
          target: "esnext",
        },
      });
      // Resolve output path (mirror src structure in dist)
      const relativePath = relative(this.#SRC_DIR, filePath);
      const outPath = resolve(this.#DIST_DIR, relativePath).replace(
        /\.ts$/,
        ".mjs"
      );
      // Ensure output directory exists
      const outDir = dirname(outPath);
      if (!existsSync(outDir))
        mkdirSync(outDir, {
          recursive: true,
        });

      const correctedCode = addDotJsToImports(code);

      // Write JS file
      writeFileSync(outPath, removeComments(correctedCode));
      const [seconds, nanoseconds] = process.hrtime(startTime);
      const durationMs = Math.round(seconds * 1000 + nanoseconds / 1e6);

      if (this.#hasStarted) {
        this.#logger.info(
          `✅ Compiled ${relativePath} in ${getDuration(durationMs)}`
        );

        this.#runTask();

        await delay(1000);

        startTestServer(this.#logger, this.#hasStarted, script);
      }
    } catch (error) {
      this.#logger.error(
        `Error transpiling ${filePath}: ${
          error instanceof Error ? error.message : ""
        }`
      );
    }
  }

  startWatch(script) {
    watch("test/", {
      persistent: true,
      ignoreInitial: false,
      ignored: [/(^|[/\\])\../, /node_modules/],
    })
      .on("ready", async () => {
        await delay(100);
        startTestServer(this.#logger, this.#hasStarted, script);
        this.#setStart();
      })
      .on("add", async (filePath) => this.#handleFile(filePath, script))
      .on("change", async (filePath) => this.#handleFile(filePath, script));
  }
}

export default TurboTestClient;
