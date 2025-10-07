import { access } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { pathToFileURL } from "node:url";
import type { ConfigOptions } from "../core/config.js";

/**
 * Searches for tasc config file in the current working directory.
 * Returns the absolute path if found, null otherwise.
 * Prioritizes .ts files for better DX, with fallback to .js/.mjs.
 */
export const findConfigFile = async (): Promise<string | null> => {
  const cwd = process.cwd();
  const possibleFiles = ["tasc.config.ts", "tasc.config.js", "tasc.config.mjs"];

  for (const file of possibleFiles) {
    const configPath = path.join(cwd, file);
    try {
      await access(configPath);
      return configPath;
    } catch {}
  }

  return null;
};

/**
 * Validates that the loaded config matches the ConfigOptions interface.
 * Throws an error if validation fails.
 */
const validateConfig = (config: unknown): config is ConfigOptions => {
  if (!config || typeof config !== "object") {
    throw new Error("Config must be an object");
  }

  const cfg = config as Record<string, unknown>;

  // Check outputs field (required)
  if (!cfg.outputs || typeof cfg.outputs !== "object") {
    throw new Error("Config must have an 'outputs' field as an object");
  }

  // Validate optional fields
  if (cfg.api_doc_url !== undefined && typeof cfg.api_doc_url !== "string") {
    throw new Error("'api_doc_url' must be a string");
  }

  if (
    cfg.environment !== undefined &&
    !["development", "production", "staging", "test"].includes(
      cfg.environment as string
    )
  ) {
    throw new Error(
      "'environment' must be one of: development, production, staging, test"
    );
  }

  if (
    cfg.poll_interval_ms !== undefined &&
    typeof cfg.poll_interval_ms !== "number"
  ) {
    throw new Error("'poll_interval_ms' must be a number");
  }

  return true;
};

/**
 * Dynamically imports tsx for TypeScript file execution.
 * Returns null if tsx is not available.
 */
const getTsx = async () => {
  try {
    const tsx = await import("tsx/esm/api");
    return tsx;
  } catch {
    return null;
  }
};

/**
 * Loads a TypeScript config file using tsx.
 */
const loadTsConfig = async (configPath: string): Promise<unknown> => {
  const tsx = await getTsx();

  if (!tsx) {
    throw new Error(
      "TypeScript config files require 'tsx' to be installed. " +
        "Run 'npm install tsx' or use a .js config file instead."
    );
  }

  // Register tsx loader and import the file
  const unregister = tsx.register();
  try {
    const configUrl = pathToFileURL(configPath).href;
    const configModule = await import(configUrl);
    return configModule.default || configModule;
  } finally {
    unregister();
  }
};

/**
 * Loads a JavaScript config file.
 */
const loadJsConfig = async (configPath: string): Promise<unknown> => {
  const configUrl = pathToFileURL(configPath).href;
  const configModule = await import(configUrl);
  return configModule.default || configModule;
};

/**
 * Loads and validates the tasc config file.
 * Throws an error if config file is not found or invalid.
 */
export const loadConfig = async (): Promise<ConfigOptions> => {
  const configPath = await findConfigFile();

  if (!configPath) {
    throw new Error(
      "Config file not found. Please create 'tasc.config.ts' in your project root or run 'tasc init'"
    );
  }

  try {
    // Determine loader based on file extension
    const isTypeScript = configPath.endsWith(".ts");
    const config = isTypeScript
      ? await loadTsConfig(configPath)
      : await loadJsConfig(configPath);

    // Validate the config structure
    validateConfig(config);

    return config as ConfigOptions;
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to load config: ${error.message}`);
    }
    throw error;
  }
};

/**
 * Loads config with graceful error handling.
 * Returns null if config cannot be loaded.
 */
export const loadConfigSafe = async (): Promise<ConfigOptions | null> => {
  try {
    return await loadConfig();
  } catch (error) {
    console.error(
      error instanceof Error ? error.message : "Unknown error loading config"
    );
    return null;
  }
};
