/**
 * `tasc generate` command - Runs generation once
 */

import process from "node:process";
import { runGeneration } from "../../generator/index.js";
import { loadConfig } from "../../utils/config-loader.js";

/**
 * Executes the generate command
 */
export async function generateCommand(): Promise<void> {
  try {
    console.log("\n🚀 Starting API generation...\n");

    const config = await loadConfig();
    await runGeneration(config, {
      info: (msg) => console.log(msg),
      error: (msg) => console.error(msg),
      success: (msg) => console.log(`\n${msg}\n`),
    });
  } catch (error) {
    console.error(
      "\n❌ Generation failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    process.exit(1);
  }
}
