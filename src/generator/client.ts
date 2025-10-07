/**
 * API client file generation.
 * Creates a ready-to-use, fully-typed API client instance.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ConfigOptions } from "../core/config.js";
import { getResolvedPaths } from "../utils/path-resolver.js";

/**
 * Generates a ready-to-use API client file with full type safety.
 * This creates a file that exports an instantiated, typed API client
 * that can be imported and used throughout the codebase.
 */
export async function generateClientFile(config: ConfigOptions): Promise<void> {
  const paths = getResolvedPaths(config);
  const clientPath = paths.exportPath;
  const operationsPath = paths.apiOperations;

  // Calculate relative path from client file to operations file
  let relativePath = path
    .relative(path.dirname(clientPath), operationsPath)
    .replace(/\\/g, "/")
    .replace(/\.ts$/, "");

  // Ensure relative path starts with ./ or ../
  if (!relativePath.startsWith("./") && !relativePath.startsWith("../")) {
    relativePath = `./${relativePath}`;
  }

  const fileContent = generateClientFileContent(relativePath, config);

  // Write to disk
  const dir = path.dirname(clientPath);
  await mkdir(dir, { recursive: true });
  await writeFile(clientPath, fileContent, "utf8");
}

/**
 * Generates the client file content.
 */
function generateClientFileContent(
  operationsRelativePath: string,
  config: ConfigOptions
): string {
  const apiUrl = config.api_doc_url || "http://localhost:8080/doc/openapi.json";
  const defaultBaseUrl = new URL(apiUrl).origin;

  return `/**
 * Auto-generated API client - Ready to use!
 * 
 * This file exports a fully-typed API client instance that you can
 * import and use throughout your codebase.
 * 
 * DO NOT EDIT MANUALLY - your changes will be overwritten.
 * 
 * Last generated: ${new Date().toISOString()}
 * 
 * @example
 * \`\`\`typescript
 * import { api } from './path/to/this/file';
 * 
 * // Use anywhere in your app with full IntelliSense!
 * const user = await api.op.getUserById({ id: '123' });
 * \`\`\`
 */

import { createTypedApiClient } from "${operationsRelativePath}";

/**
 * Fully-typed API client instance.
 * 
 * Configure the baseURL and other options by editing this file,
 * or re-generate with updated config.
 * 
 * @example
 * \`\`\`typescript
 * // Path-based API
 * const response = await api.get('/users/{id}', { id: '123' });
 * 
 * // Operation-based API (recommended)
 * const user = await api.op.getUserById({ id: '123' });
 * \`\`\`
 */
export const api = createTypedApiClient({
  baseURL: process.env.API_URL || "${defaultBaseUrl}",
  
  // Add your interceptors here
  interceptors: {
    request: (config) => {
      // Example: Add authentication token
      // const token = getAuthToken();
      // if (token) {
      //   config.headers.Authorization = \`Bearer \${token}\`;
      // }
      return config;
    },
    responseError: (error) => {
      // Example: Handle errors globally
      // if (error.response?.status === 401) {
      //   // Handle unauthorized
      // }
      return Promise.reject(error);
    },
  },
});

// Re-export types for convenience
export type {
  paths,
  RequestBody,
  ResponseData,
  PathParams,
  QueryParams,
  ApiOperations,
} from "${operationsRelativePath}";
`;
}
