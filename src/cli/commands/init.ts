/**
 * `tasc init` command - Creates tasc.config.ts file
 */

import { writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { findConfigFile } from "../../utils/config-loader.js";

/**
 * Default tasc.config.ts template with full TypeScript support
 */
const DEFAULT_CONFIG_TEMPLATE = `import type { ConfigOptions } from "tasc-ts";

const config: ConfigOptions = {
  // API documentation endpoint URL
  api_doc_url: "http://localhost:8080/doc/openapi.json",

  // Environment (development | production | staging | test)
  environment: "development",

  // Polling interval in milliseconds for API changes
  poll_interval_ms: 5000,

  // Output paths for generated files
  outputs: {
    // Base path prefix for all outputs (e.g., "src" → "src/.tasc/")
    base_path: "",

    // If set, all files go here (overrides individual paths)
    // Example: "generated" → generated/types.ts, generated/operations.ts
    dir: "",

    // Individual file paths (only used if 'dir' is NOT set)
    // Defaults: .tasc/types.ts, .tasc/operations.ts, .tasc/openapi.json, api-client.ts
    api_types: "",
    api_operations: "",
    doc_file: "",
    
    // Path for the auto-generated API client file (ready to use with interceptors)
    // Default: api-client.ts (in base_path or root if no base_path)
    export_path: "",
  },
};

export default config;
`;

/**
 * Executes the init command
 */
export async function initCommand(options: { force: boolean }): Promise<void> {
  const cwd = process.cwd();
  const configPath = path.join(cwd, "tasc.config.ts");

  try {
    // Check if config file already exists
    const existingConfig = await findConfigFile();

    if (existingConfig && !options.force) {
      console.error(`\n❌ Config file already exists at: ${existingConfig}`);
      console.log("\n💡 Use --force flag to overwrite: tasc init --force\n");
      process.exit(1);
    }

    // Write the config file
    await writeFile(configPath, DEFAULT_CONFIG_TEMPLATE, "utf8");

    console.log("\n✅ Successfully created tasc.config.ts");
    console.log(`📁 Location: ${configPath}`);
    console.log("\n📝 Next steps:");
    console.log("   1. Edit tasc.config.ts to match your project structure");
    console.log("   2. Configure your API documentation URL");
    console.log("   3. Run your API generation scripts");
    console.log("\n💡 Tip: Full TypeScript support with autocomplete!\n");
  } catch (error) {
    console.error(
      "\n❌ Failed to create config file:",
      error instanceof Error ? error.message : "Unknown error"
    );
    process.exit(1);
  }
}
