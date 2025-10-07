/**
 * Main package exports for tasc-ts
 */

export type {
  ApiOperations,
  ApiPathParams,
  ApiQueryParams,
  ApiRequestBody,
  ApiResponseData,
  AvailableStatusCodes,
  HttpMethod,
  Paths,
} from "./core/api-client.js";

// API client factory and types
export { createApiClient, type ApiClientConfig } from "./core/api-client.js";
// Core types
export type { ConfigOptions, TascEnvironment } from "./core/config.js";
// Generator utilities (for advanced users)
export {
  fetchApiSpec,
  generateOperations,
  generateTypes,
  runGeneration,
  saveApiSpec,
  type GenerationLogger,
} from "./generator/index.js";
// Config utilities
export {
  findConfigFile,
  loadConfig,
  loadConfigSafe,
} from "./utils/config-loader.js";
// Path resolution utilities
export { getResolvedPaths, resolveOutputPath } from "./utils/path-resolver.js";
