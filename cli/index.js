#!/usr/bin/env node

import { Command } from "commander";
import { runDev, runDevTs } from "./commands/dev.js";
import { Logger } from "zoltra";
import { getPackageOpts } from "./common.js";
import { createApp } from "./commands/scaffold.js";
import { updateBatch } from "./commands/update-deps.js";
import { start, startTs } from "./commands/start.js";
import generateAuthSecret from "./commands/gen-secret.js";

const config = getPackageOpts();

const program = new Command();

const logger = new Logger("CLI");

program
  .name("zoltrajs")
  .description(
    "The official CLI for ZoltraJS - A minimalist, plugin-first Node.js framework"
  )
  .version(config.version, "-v, --version", "Output the current version");

program
  .command("create <project-name>")
  .description("Scaffold a new ZoltraJS project")
  .option("-t, --typescript", "Initialize with TypeScript")
  .option("-j, --javascript", "Initialize with JavaScript")
  .option("--no-git", "Skip Git repository initialization")
  .action((projectName, options) => {
    createApp(projectName, options);
  });

program
  .command("dev")
  .description("Start development server (JavaScript)")
  .option("-p, --port <number>", "Port number", "5000")
  .action(runDev);

program
  .command("dev:ts")
  .description("Start development server (TypeScript)")
  .option("-p, --port <number>", "Port number", "5000")
  .action(runDevTs);

program
  .command("start")
  .description("Start the server")
  .option("-p, --port <number>", "Port number", "5000")
  .action(start);

program
  .command("start:ts")
  .description("Start the server (TypeScript)")
  .option("-p, --port <number>", "Port number", "5000")
  .action(startTs);

program
  .command("update")
  .option(
    "--deps",
    "Update all project dependencies to their latest available versions"
  )
  .option(
    "-z, --zoltra",
    "Update all zoltra dependencies to their latest available versions"
  )
  .description("Update project dependencies to their latest available versions")
  .action(updateBatch);

program
  .command("gen-secret")
  .description("Generate a new JWT authentication secret")
  .action(generateAuthSecret);

// Error handling
program.configureOutput({
  outputError: (err, write) => {
    logger.error(`Error: ${err.replace("error: ", "")}`);
    process.exit(1);
  },
});

// program.parse();

// Parse arguments
program.parseAsync(process.argv).catch(() => {
  process.exit(1);
});
