#!/usr/bin/env node

import { Command } from "commander";
import { createApp } from "./commands/create.js";
import { runDev, runDevTs } from "./commands/dev.js";
import { Logger } from "zoltra";
import { getPackageOpts } from "./common.js";

const config = getPackageOpts();

const program = new Command();

const logger = new Logger("CLI");

program
  .name("zoltrajs")
  .description(
    "The official CLI for ZoltraJS - A minimalist, plugin-first Node.js framework"
  )
  .version(config.version, "-v, --version", "Output the current version");

// Create command
program
  .command("create <project-name>")
  .description("Scaffold a new ZoltraJS project")
  .option("-t, --typescript", "Initialize with TypeScript", true)
  .option("-j, --javascript", "Initialize with JavaScript")
  .option("--no-git", "Skip Git repository initialization")
  .action(createApp);

// Dev commands
program
  .command("dev")
  .description("Start development server (JavaScript)")
  .option("-p, --port <number>", "Port number", "3000")
  .action(runDev);

program
  .command("dev:ts")
  .description("Start development server (TypeScript)")
  .option("-p, --port <number>", "Port number", "3000")
  .action(runDevTs);

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
