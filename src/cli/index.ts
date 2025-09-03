#!/usr/bin/env node

import { createCLI } from "@zoltra/cli-builder";
import { findEntryPoint, getPackageOption } from "./shared";
import { start } from "./commands/start";
import { startDevServer } from "./commands/dev";

const packageJson = getPackageOption();

const cli = createCLI(
  "Zoltra",
  packageJson.version,
  "The official CLI for ZoltraJS - A minimalist, plugin-first Node.js framework"
);

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
    console.log("Starting TypeScript development server...");
  })
  .finalize();

cli.parse().catch(console.error);
