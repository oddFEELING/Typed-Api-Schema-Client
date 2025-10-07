/**
 * `tasc config` command - Displays current configuration
 */

import process from "node:process";
import { findConfigFile, loadConfig } from "../../utils/config-loader.js";

/**
 * Executes the config command
 */
export async function configCommand(): Promise<void> {
  try {
    const configPath = await findConfigFile();

    if (!configPath) {
      console.error(
        "\n❌ No config file found. Run 'tasc init' to create one.\n"
      );
      process.exit(1);
    }

    console.log("\n📋 Current Configuration:");
    console.log(`📁 Config file: ${configPath}`);

    // Read and display the config file contents
    const config = await loadConfig();

    console.log("\n⚙️  Configuration:");
    console.log(JSON.stringify(config, null, 2));
    console.log("");
  } catch (error) {
    console.error(
      "\n❌ Failed to load config:",
      error instanceof Error ? error.message : "Unknown error"
    );
    process.exit(1);
  }
}
