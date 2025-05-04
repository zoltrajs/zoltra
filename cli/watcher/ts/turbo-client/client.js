import { colorText, Logger } from "zoltra";
import { transformSync } from "@swc/core";
import { watch } from "chokidar";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname, resolve, relative } from "path";
import { networkInterfaces as NetworkInterfaces } from "os";
import { spawn } from "child_process";
import {
  getAvailableEnvFiles,
  getPackageOpts,
  readConfig,
} from "../../../common.js";
import { removeExtensionDuplicates } from "../../shared/cleaner.js";
import { cleanOrphanedFiles } from "../../shared/cleanOrphans.js";
import { delay } from "@zoltra-toolkit/node";

class TurboClient {
  #hasStarted = false;
  #logger = new Logger("TurboClient");
  #SRC_DIR = resolve(".");
  #DIST_DIR = resolve("dist");
  #config = readConfig();

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

  #logInfo() {
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
      - 🔥 TurboClient (Experimental)
      -----------------------------------------
      `);

    this.#logger.info(`⚡ Starting...`);
  }

  #handleFile(filePath) {
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
      }
    } catch (error) {
      this.#logger.error(
        `Error transpiling ${filePath}: ${
          error instanceof Error ? error.message : ""
        }`
      );
    }
  }

  startWatch() {
    this.#logInfo();
    watch(".", {
      persistent: true,
      ignoreInitial: false,
      ignored: [/(^|[/\\])\../, /node_modules/],
    })
      .on("ready", async () => {
        await delay(100);
        startServer(this.#logger);
        this.#setStart();
      })
      .on("add", (filePath) => this.#handleFile(filePath))
      .on("change", (filePath) => this.#handleFile(filePath));
  }
}

export default TurboClient;

function getLocalIp() {
  const networkInterfaces = NetworkInterfaces();
  let localIp = "";

  for (const interfaceName in networkInterfaces) {
    const networkInterface = networkInterfaces[interfaceName];
    for (const address of networkInterface) {
      if (address.family === "IPv4" && !address.internal) {
        localIp = address.address;
        break;
      }
    }
  }

  return localIp;
}

function removeComments(code = "") {
  return code
    .replace(
      /(['"`])(\\.|[^\x01\\])*?\1|\/\/.*|\/\*[\s\S]*?\*\//gm,
      (match, quote) => (quote ? match : "")
    )
    .replace(/\s+/g, " ");
}

function addDotJsToImports(code) {
  return code.replace(
    /from\s+["'](\.{1,2}\/[^"']*)["']/g,
    (match, importPath) => {
      // Skip if already ends with .js or has an extension
      if (importPath.endsWith(".js") || /\.\w+$/.test(importPath)) {
        return match;
      }
      return `from "${importPath}.mjs"`;
    }
  );
}

function getDuration(durationInMs) {
  if (durationInMs >= 1000) {
    return `${(durationInMs / 1000).toFixed(1)}s`;
  } else {
    return `${durationInMs.toFixed(0)}ms`;
  }
}

function startServer(logger) {
  //   if (serverProcess) {
  //     serverProcess.kill();
  //     logger.info("🔁 Restarting server...");
  //   }

  // @ts-ignore
  spawn("node", [`dist/server.mjs`], {
    stdio: "inherit",
  });

  // serverProcess?.on("exit", (code) => {
  //   if (code !== 0) {
  //     logger.error(`❌ Server exited with code ${code}`);
  //   }
  // });

  logger.info("🚀 Zolta hotClient ready!");
}
