/**
 * `tasc watch` command - Continuously polls and regenerates on changes
 */

import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import { fetchApiSpec, runGeneration } from "../../generator/index.js";
import { loadConfig } from "../../utils/config-loader.js";

/**
 * Executes the watch command
 */
export async function watchCommand(): Promise<void> {
  try {
    console.log("\n👀 Starting API watch mode...\n");

    const config = await loadConfig();
    const apiUrl =
      config.api_doc_url ?? "http://localhost:8080/doc/openapi.json";
    const interval = config.poll_interval_ms ?? 5000;

    console.log(`   API URL: ${apiUrl}`);
    console.log(`   Poll interval: ${interval}ms`);
    console.log(`   Environment: ${config.environment ?? "development"}\n`);

    let lastHash: string | null = null;
    let cycleCount = 0;

    // Graceful shutdown handler
    let isShuttingDown = false;
    const shutdown = () => {
      if (isShuttingDown) return;
      isShuttingDown = true;
      console.log("\n\n👋 Stopping watch mode...");
      process.exit(0);
    };

    process.on("SIGINT", shutdown);
    process.on("SIGTERM", shutdown);

    // Watch loop
    while (!isShuttingDown) {
      cycleCount++;
      console.log(`\n${"=".repeat(50)}`);
      console.log(`Cycle #${cycleCount} - ${new Date().toLocaleTimeString()}`);
      console.log("=".repeat(50));

      try {
        // Fetch and check for changes
        console.log("📡 Checking for API changes...");
        const { hash } = await fetchApiSpec(apiUrl);

        if (lastHash === null) {
          console.log("   First run - generating...");
          await runGeneration(config, {
            info: (msg) => console.log(`   ${msg}`),
            error: (msg) => console.error(`   ${msg}`),
            success: (msg) => console.log(`\n   ${msg}`),
          });
          lastHash = hash;
        } else if (hash !== lastHash) {
          console.log("   ⚡ Changes detected! Regenerating...");
          await runGeneration(config, {
            info: (msg) => console.log(`   ${msg}`),
            error: (msg) => console.error(`   ${msg}`),
            success: (msg) => console.log(`\n   ${msg}`),
          });
          lastHash = hash;
        } else {
          console.log("   ✓ No changes detected");
        }
      } catch (error) {
        console.error(
          "   ⚠️  Error:",
          error instanceof Error ? error.message : "Unknown error"
        );
        console.log("   Continuing to watch...");
      }

      if (!isShuttingDown) {
        console.log(`\n⏳ Waiting ${interval}ms until next check...`);
        await delay(interval);
      }
    }
  } catch (error) {
    console.error(
      "\n❌ Watch failed:",
      error instanceof Error ? error.message : "Unknown error"
    );
    process.exit(1);
  }
}
