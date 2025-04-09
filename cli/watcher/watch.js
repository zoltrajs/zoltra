#!/usr/bin/env node

import { Command } from "commander";
import { Logger } from "zoltra";
import { startTsWatcher } from "./ts/watch.js";
import { getPackageOpts } from "../common.js";

const config = getPackageOpts();

const program = new Command();

const logger = new Logger("CLI");

program
  .name("zoltra-watch")
  .description(
    "Zoltra.js Watcher - Watch and compile TypeScript files automatically, and start the server."
  );

program
  .name("watch")
  .description("Watch and compile TypeScript files")
  .requiredOption("-s, --server <path>", "Path to server entry file")
  .action((options) => {
    startTsWatcher(options.server);
  });

program.parse();
