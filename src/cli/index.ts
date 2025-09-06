#!/usr/bin/env node

import { createCLI } from "@zoltra/cli-builder";
import { findEntryPoint, getPackageOption } from "./shared/index";
import { start } from "./commands/start";
import { startDevServer } from "./commands/dev";
import { startTsDevServer } from "./commands/dev-ts";
import generateAuthSecret from "./commands/gen-secret";

const packageJson = getPackageOption();

const cli = createCLI(
  "zoltra",
  packageJson.version,
  "The official CLI for Zoltra - A fast, file-based JavaScript web server framework"
);

// Default action
cli.action(() => {
  cli.showHelp();
});

cli
  .command("start", "Start the Zoltra application")
  .action(() => start())
  .finalize();

cli
  .command("dev", "Start the Zoltra application in development mode")
  .action(() => {
    const entryPoint = findEntryPoint();
    startDevServer(entryPoint);
  })
  .finalize();

cli
  .command(
    "dev:ts",
    "Start the Zoltra application in TypeScript development mode"
  )
  .action(() => {
    const entryPoint = findEntryPoint();
    startTsDevServer(entryPoint);
  })
  .finalize();

cli
  .command(
    "gen-secret",
    "Generate a new cryptographically secure secret for signing JWT tokens"
  )
  .action(generateAuthSecret)
  .finalize();

cli.parse().catch(console.error);
