/**
 * Main generator orchestration.
 * Coordinates fetching, type generation, and operations generation.
 */

import type { ConfigOptions } from "../core/config.js";
import { getResolvedPaths } from "../utils/path-resolver.js";
import { generateClientFile } from "./client.js";
import { fetchApiSpec, saveApiSpec } from "./fetch.js";
import { generateOperations } from "./operations.js";
import { generateTypes } from "./types.js";

export { generateClientFile } from "./client.js";
// Re-export utilities
export { fetchApiSpec, saveApiSpec } from "./fetch.js";
export { generateOperations } from "./operations.js";
export { generateTypes } from "./types.js";

/**
 * Logger interface for generation process.
 */
export interface GenerationLogger {
  info: (msg: string) => void;
  error: (msg: string) => void;
  success: (msg: string) => void;
}

/**
 * Runs the complete generation flow once.
 */
export async function runGeneration(
  config: ConfigOptions,
  logger?: GenerationLogger
): Promise<void> {
  const log = logger || {
    info: console.log,
    error: console.error,
    success: console.log,
  };

  try {
    const apiUrl =
      config.api_doc_url ?? "http://localhost:8080/doc/openapi.json";

    const paths = getResolvedPaths(config);
    const specPath = paths.docFile;
    const typesPath = paths.apiTypes;

    // 1. Fetch OpenAPI spec
    log.info("📥 Fetching OpenAPI spec...");
    const { content } = await fetchApiSpec(apiUrl);

    // 2. Save spec to disk
    log.info(`💾 Saving spec to ${specPath}`);
    await saveApiSpec(content, specPath);

    // 3. Generate TypeScript types
    log.info(`🔧 Generating TypeScript types to ${typesPath}`);
    await generateTypes(specPath, typesPath);

    // 4. Generate operations
    log.info("🔨 Generating API operations...");
    await generateOperations(config);

    // 5. Generate client file
    log.info("📦 Generating API client file...");
    await generateClientFile(config);

    log.success("✅ Generation complete!");
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    log.error(`❌ Generation failed: ${message}`);
    throw error;
  }
}
