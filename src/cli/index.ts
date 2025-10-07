#!/usr/bin/env node

/**
 * Main CLI entry point for tasc
 */

import { Command } from "commander";
import { configCommand } from "./commands/config.js";
import { generateCommand } from "./commands/generate.js";
import { initCommand } from "./commands/init.js";
import { watchCommand } from "./commands/watch.js";

// CLI program configuration
const program = new Command();

program
  .name("tasc")
  .description("Typed API Schema Client - Generate type-safe API clients")
  .version("0.0.1");

// init command
program
  .command("init")
  .description("Initialize tasc by creating a tasc.config.ts file")
  .option("-f, --force", "Overwrite existing config file", false)
  .action(initCommand);

// config command
program
  .command("config")
  .description("Display the current tasc configuration")
  .action(configCommand);

// generate command
program
  .command("generate")
  .description("Generate TypeScript types and API operations from OpenAPI spec")
  .action(generateCommand);

// watch command
program
  .command("watch")
  .description("Watch for API changes and regenerate automatically")
  .action(watchCommand);

// Parse command line arguments
program.parse();
