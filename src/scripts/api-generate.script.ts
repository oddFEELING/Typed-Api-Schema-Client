import type { ChildProcess } from "node:child_process";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { access, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { setTimeout as delay } from "node:timers/promises";
import pino from "pino";
import type { ConfigOptions } from "../core/config.js";
import { loadConfig } from "../utils/config-loader.js";

// Configure pretty, colorized logging using pino + pino-pretty transport
const transport = pino.transport({
  target: "pino-pretty",
  options: {
    colorize: true,
    translateTime: "HH:MM:ss.l",
    ignore: "pid,hostname",
    singleLine: false,
  },
});

// Create structured logger for this script
const logger = pino({ level: process.env.LOG_LEVEL ?? "info" }, transport);

// Global configuration - will be loaded on startup
let config: ConfigOptions;
let API_ENDPOINT: string;
let CACHE_FILE: string;
let INTERVAL_MS: number;

// Tracks the currently running child process for graceful shutdown
let activeChild: ChildProcess | null = null;
let isShuttingDown = false;
let cycleCounter = 0;

/**
 * Fetches the OpenAPI specification from the server.
 * Returns the response buffer and its hash for comparison.
 */
const fetchApiSpec = async () => {
  try {
    const response = await fetch(API_ENDPOINT);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const hash = createHash("sha256").update(buffer).digest("hex");
    return { buffer, hash, timestamp: Date.now() };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    throw new Error(`Failed to fetch API spec: ${errorMessage}`);
  }
};

// Type definition for cached API data
interface CachedApiData {
  hash: string;
  timestamp: number;
}

/**
 * Loads the cached API response from disk if it exists.
 * Returns null if cache doesn't exist or is invalid.
 */
const loadCache = async (): Promise<CachedApiData | null> => {
  try {
    await access(CACHE_FILE);
    const cacheData = await readFile(CACHE_FILE, "utf8");
    return JSON.parse(cacheData) as CachedApiData;
  } catch {
    // Cache file doesn't exist or is corrupted
    return null;
  }
};

// Type definition for API data with buffer
interface ApiData {
  buffer: Buffer;
  hash: string;
  timestamp: number;
}

/**
 * Saves minimal API metadata (no content) to cache file.
 */
const saveCache = async (apiData: ApiData): Promise<void> => {
  try {
    const minimal = { hash: apiData.hash, timestamp: apiData.timestamp };
    await writeFile(CACHE_FILE, JSON.stringify(minimal, null, 2));
  } catch (error) {
    logger.warn({ err: error }, "Failed to save API cache");
  }
};

/**
 * Compares current API spec with cached version and returns both the
 * decision and the current spec so the caller can write it to disk.
 */
const hasApiChanged = async (cycleId: number) => {
  try {
    logger.info({ cycleId }, "Checking for API changes...");

    const [currentApi, cachedApi] = await Promise.all([
      fetchApiSpec(),
      loadCache(),
    ]);

    if (!cachedApi) {
      logger.info({ cycleId }, "No cache found, will generate types");
      await saveCache(currentApi);
      return { shouldGenerate: true, apiData: currentApi };
    }

    if (currentApi.hash !== cachedApi.hash) {
      logger.info({ cycleId }, "API changes detected, will regenerate types");
      await saveCache(currentApi);
      return { shouldGenerate: true, apiData: currentApi };
    }

    logger.info({ cycleId }, "No API changes detected, skipping generation");
    return { shouldGenerate: false, apiData: currentApi };
  } catch (error) {
    logger.error(
      { cycleId, err: error },
      "Error checking API changes, will generate types"
    );
    // Default to generating on error; rely on existing openapi.json on disk
    return { shouldGenerate: true, apiData: null };
  }
};

/**
 * Runs `pnpm api:generate` once and emits structured logs with duration.
 * Resolves when the command completes, regardless of success or failure.
 */
const runGenerateOnce = async (cycleId: number): Promise<void> => {
  const startedAt = Date.now();
  logger.info("\n\n\n");
  logger.info("==".repeat(20));
  logger.info(
    { cycleId, intervalMs: INTERVAL_MS },
    "Starting api:generate cycle"
  );

  // Check if API has changed before running generation
  const { shouldGenerate, apiData } = await hasApiChanged(cycleId);

  if (!shouldGenerate) {
    const durationMs = Date.now() - startedAt;
    logger.info(
      { cycleId, durationMs },
      "Skipped generation - no API changes detected"
    );
    return;
  }

  // Write the freshly downloaded spec to ./openapi.json if available
  try {
    if (apiData?.buffer) {
      const specPath = path.join(process.cwd(), "openapi.json");
      await writeFile(specPath, apiData.buffer);
      logger.info(
        { cycleId, bytes: apiData.buffer.length },
        "Wrote openapi.json"
      );
    } else {
      logger.warn(
        { cycleId },
        "Proceeding without writing openapi.json (no new buffer)"
      );
    }
  } catch (error) {
    logger.error({ cycleId, err: error }, "Failed to write openapi.json");
  }

  logger.info({ cycleId }, "Running pnpm api:generate...");

  // Spawn pnpm child process with piped stdio to capture output lines
  const child = spawn("pnpm", ["api:generate"], {
    stdio: ["ignore", "pipe", "pipe"],
    env: process.env,
  });

  activeChild = child;

  // Stream stdout lines as info logs
  if (child.stdout) {
    child.stdout.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => {
      const lines = String(chunk).split(/\r?\n/);
      for (const line of lines) {
        if (line.trim().length > 0) {
          logger.info({ cycleId }, line);
        }
      }
    });
  }

  // Stream stderr lines as error logs
  if (child.stderr) {
    child.stderr.setEncoding("utf8");
    child.stderr.on("data", (chunk: string) => {
      const lines = String(chunk).split(/\r?\n/);
      for (const line of lines) {
        if (line.trim().length > 0) {
          logger.error({ cycleId, stream: "stderr" }, line);
        }
      }
    });
  }

  // Type definition for exit information
  interface ExitInfo {
    code: number | null;
    signal: NodeJS.Signals | null;
    error?: Error;
  }

  // Await process exit and measure duration
  const exit = await new Promise<ExitInfo>((resolve) => {
    child.on("exit", (code: number | null, signal: NodeJS.Signals | null) => {
      resolve({ code, signal });
    });
    child.on("error", (error: Error) => {
      resolve({ code: 1, signal: null, error });
    });
  });

  const durationMs = Date.now() - startedAt;
  activeChild = null;

  if (exit.error) {
    logger.error(
      { cycleId, durationMs },
      `api:generate failed to start: ${exit.error.message}`
    );
  } else if (exit.code === 0) {
    logger.info({ cycleId, durationMs }, "api:generate completed successfully");
  } else {
    logger.error(
      { cycleId, durationMs, code: exit.code, signal: exit.signal },
      "api:generate exited with errors"
    );
  }
};

/**
 * Schedules recurring runs without overlapping executions.
 * Waits for each run to finish, then delays by INTERVAL_MS before next run.
 */
const schedule = async () => {
  if (isShuttingDown) return;
  cycleCounter += 1;
  const cycleId = cycleCounter;

  await runGenerateOnce(cycleId);

  if (isShuttingDown) return;
  await delay(INTERVAL_MS);
  if (isShuttingDown) return;
  // Recurse to avoid using await inside a loop construct
  return schedule();
};

/**
 * Gracefully stop the loop and any active child process.
 */
const shutdown = (signal: string): void => {
  if (isShuttingDown) return;
  isShuttingDown = true;
  logger.warn({ signal }, "Shutting down api:generate loop");
  if (activeChild && typeof activeChild.kill === "function") {
    try {
      // Attempt graceful termination first
      const terminated = activeChild.kill("SIGTERM");
      if (!terminated && activeChild.kill) {
        activeChild.kill("SIGKILL");
      }
    } catch (error) {
      logger.error({ err: error }, "Failed to terminate child process");
    }
  }
  // Note: Cache file is preserved on shutdown for next startup
  logger.info({ cacheFile: CACHE_FILE }, "Cache file preserved");
};

// Handle termination signals and unexpected errors
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("uncaughtException", (error: Error) => {
  logger.fatal({ err: error }, "Uncaught exception");
  shutdown("uncaughtException");
});
process.on("unhandledRejection", (reason: unknown) => {
  logger.fatal({ reason }, "Unhandled promise rejection");
  shutdown("unhandledRejection");
});

/**
 * Initialize and start the API generation loop
 */
const initialize = async (): Promise<void> => {
  try {
    // Load configuration from tasc.config.ts
    logger.info("Loading tasc configuration...");
    config = await loadConfig();

    // Set configuration values
    API_ENDPOINT =
      config.api_doc_url ?? "http://localhost:8080/doc/openapi.json";
    CACHE_FILE = path.join(process.cwd(), ".api-cache.json");
    INTERVAL_MS = config.poll_interval_ms ?? 5000;

    logger.info(
      {
        apiEndpoint: API_ENDPOINT,
        intervalMs: INTERVAL_MS,
        environment: config.environment ?? "development",
      },
      "Configuration loaded successfully"
    );

    // Log boot info and start the scheduler
    logger.info({ intervalMs: INTERVAL_MS }, "api:generate loop initialized");
    await schedule();
  } catch (error) {
    logger.fatal(
      { err: error },
      "Failed to initialize: Could not load configuration"
    );
    process.exit(1);
  }
};

// Start the application
initialize().catch((error) => {
  logger.fatal({ err: error }, "Initialization failed");
  process.exit(1);
});
