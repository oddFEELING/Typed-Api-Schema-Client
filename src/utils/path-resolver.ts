/**
 * Path resolution utilities for generated files.
 * Handles base_path, dir, and individual path options.
 */

import path from "node:path";
import type { ConfigOptions } from "../core/config.js";

/**
 * Resolves the output path for a generated file based on config.
 *
 * Logic:
 * 1. If outputs.dir is set → use base_path + dir + filename
 * 2. If outputs.dir is NOT set → use base_path + (specific_path || .tasc/filename)
 *
 * @param config - The tasc configuration
 * @param type - Type of file to resolve path for
 * @param defaultFilename - Default filename if no specific path provided
 * @returns Resolved absolute path
 */
export function resolveOutputPath(
  config: ConfigOptions,
  type: "api_types" | "api_operations" | "doc_file" | "export_path",
  defaultFilename: string
): string {
  const basePath = config.outputs.base_path || "";
  const dir = config.outputs.dir;

  let finalPath: string;

  if (dir) {
    // If dir is specified, use it for ALL files
    finalPath = path.join(basePath, dir, defaultFilename);
  } else {
    // If dir is NOT specified, use individual paths or .tasc default
    const specificPath = config.outputs[type];

    if (specificPath) {
      // Use the specific path provided
      finalPath = path.join(basePath, specificPath);
    } else {
      // Use .tasc as default directory
      finalPath = path.join(basePath, ".tasc", defaultFilename);
    }
  }

  // Convert to absolute path from current working directory
  return path.resolve(process.cwd(), finalPath);
}

/**
 * Gets all resolved output paths for the generation process.
 */
export function getResolvedPaths(config: ConfigOptions) {
  return {
    apiTypes: resolveOutputPath(config, "api_types", "types.ts"),
    apiOperations: resolveOutputPath(config, "api_operations", "operations.ts"),
    docFile: resolveOutputPath(config, "doc_file", "openapi.json"),
    exportPath: resolveOutputPath(config, "export_path", "api-client.ts"),
  };
}

/**
 * Examples of path resolution:
 *
 * 1. No config (empty outputs):
 *    → .tasc/types.ts, .tasc/operations.ts, .tasc/openapi.json
 *
 * 2. base_path: "src":
 *    → src/.tasc/types.ts, src/.tasc/operations.ts, src/.tasc/openapi.json
 *
 * 3. dir: "generated":
 *    → generated/types.ts, generated/operations.ts, generated/openapi.json
 *
 * 4. base_path: "src", dir: "generated":
 *    → src/generated/types.ts, src/generated/operations.ts, src/generated/openapi.json
 *
 * 5. base_path: "src", api_types: "types/api.ts":
 *    → src/types/api.ts, src/.tasc/operations.ts, src/.tasc/openapi.json
 *
 * 6. dir: "gen", api_types: "custom/types.ts" (dir takes precedence):
 *    → gen/types.ts, gen/operations.ts, gen/openapi.json
 */
