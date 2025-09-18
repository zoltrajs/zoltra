#!/usr/bin/env node --no-deprecation

import { createCLI } from "@zoltra/cli-builder";
import { findEntryPoint, getPackageOption } from "./shared/index";
import { start } from "./commands/start";
import { startDevServer } from "./commands/dev";
import { startTsDevServer } from "./commands/dev-ts";
import generateAuthSecret from "./commands/gen-secret";
import { createApp } from "./commands/create";
import { getTemplates } from "./commands/fetch-templates";

const packageJson = getPackageOption();

const cli = createCLI(
  "zoltra",
  packageJson.version,
  "The official CLI for Zoltra - A fast, file-based JavaScript web server framework",
  { interactive: true }
);

// Global Options
cli.option("list-templates", " List available templates", {
  alias: "lt",
  type: "boolean",
});

// Default action
cli.action(async (_, options) => {
  if (options["list-templates"]) {
    await getTemplates();
  } else cli.showHelp();
});

cli
  .command("create", "Create a new Zoltra application")
  .option("name", "The name of the application", {
    type: "string",
    alias: "n",
    required: true,
  })
  .option("template", "The template to use for the application", {
    default: "basic",
    type: "string",
    alias: "t",
  })
  .option("skip-git", "Skip initializing a git repository", {
    type: "boolean",
    alias: "s",
    default: false,
  })
  .action(async (_, options) => {
    await createApp(options.name, options.template, options["skip-git"]);
  })
  .finalize();

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
