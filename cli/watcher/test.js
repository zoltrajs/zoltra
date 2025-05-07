#!/usr/bin/env node

import { Command } from "commander";
// import { runTest, runTestTs, runTurboTest } from "../commands/test.js";
import { getPackageOpts } from "../common.js";
import { turboTestClient } from "./ts/turbo-client/hc.js";

const program = new Command();

const config = getPackageOpts();

program
  .name("zoltra-test")
  .description(
    "CLI tool for running server-based integration tests with TurboRouter"
  )
  .version(config.version, "-v, --version", "Output the current version");

program
  .command("turbo")
  .description("Run integration tests on a TurboRouter server")
  .requiredOption("-s, --server <path>", "Path to server entry file")
  .action((options) => {
    turboTestClient.startWatch(options.server);
  });

program.parse(process.argv);
