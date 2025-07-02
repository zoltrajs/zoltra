#!/usr/bin/env node

import { Command } from "commander";
import { Logger } from "zoltra";
import { startTsWatcher } from "./ts/watch.js";
import { startJsWatcher } from "./js/watch.js";

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
  .option("-t, --typescript", "Start TypeScript watcher")
  .option("-j, --javascript", "Start JavaScript watcher")
  .action((options) => {
    if (options.typescript) {
      startTsWatcher(options.server);
    } else if (options.javascript) {
      startJsWatcher(options.server);
    } else {
      logger.error("Please specify either TypeScript or JavaScript watcher.");
    }
  });

program.parse();
