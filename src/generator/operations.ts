/**
 * API operations generation from OpenAPI spec.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { ConfigOptions } from "../core/config.js";
import { getResolvedPaths } from "../utils/path-resolver.js";

/**
 * Generates API operations from OpenAPI spec.
 */
export async function generateOperations(config: ConfigOptions): Promise<void> {
  const paths = getResolvedPaths(config);
  const specPath = paths.docFile;
  const outputPath = paths.apiOperations;

  // Read the OpenAPI spec
  const specContent = await readFile(specPath, "utf8");
  const spec = JSON.parse(specContent);

  // Parse operations
  const operations = [];
  for (const [pathTemplate, pathItem] of Object.entries(
    (spec.paths as Record<string, any>) || {}
  )) {
    for (const method of ["get", "post", "put", "delete", "patch"]) {
      const operation = (pathItem as any)[method];
      if (!operation?.operationId) continue;

      const pathParams = extractPathParams(pathTemplate);
      operations.push({
        operationId: operation.operationId,
        method,
        path: pathTemplate,
        pathParams,
        hasRequestBody: Boolean(operation.requestBody),
        summary: operation.summary || "",
        description: operation.description || "",
      });
    }
  }

  // Generate TypeScript file
  const fileContent = generateOperationsFile(operations, config);

  // Write to disk
  const dir = path.dirname(outputPath);
  await mkdir(dir, { recursive: true });
  await writeFile(outputPath, fileContent, "utf8");
}

/**
 * Extracts path parameters from an OpenAPI path template.
 */
function extractPathParams(pathTemplate: string): string[] {
  const matches = pathTemplate.matchAll(/\{([^}]+)\}/g);
  return [...matches].map((match) => match[1]);
}

/**
 * Converts parameter name to camelCase.
 */
function toCamelCase(str: string): string {
  return str.replace(/[-_]([a-z])/g, (_: string, letter: string) =>
    letter.toUpperCase()
  );
}

/**
 * Generates the complete TypeScript operations file content.
 */
function generateOperationsFile(
  operations: Array<{
    operationId: string;
    method: string;
    path: string;
    pathParams: string[];
    hasRequestBody: boolean;
    summary: string;
    description: string;
  }>,
  config: ConfigOptions
): string {
  // Determine the relative path to the types file
  const paths = getResolvedPaths(config);
  const operationsPath = paths.apiOperations;
  const typesPath = paths.apiTypes;

  let relativePath = path
    .relative(path.dirname(operationsPath), typesPath)
    .replace(/\\/g, "/")
    .replace(/\.ts$/, "");

  // Ensure relative path starts with ./ or ../ for local imports
  if (!relativePath.startsWith("./") && !relativePath.startsWith("../")) {
    relativePath = `./${relativePath}`;
  }

  const header = `/**
 * Auto-generated API operations from OpenAPI spec.
 * 
 * DO NOT EDIT MANUALLY - your changes will be overwritten.
 * 
 * Last generated: ${new Date().toISOString()}
 * Total operations: ${operations.length}
 * 
 * @example
 * // Import everything you need from this file:
 * import { 
 *   createTypedApiClient,
 *   RequestBody,
 *   ResponseData,
 *   QueryParams,
 *   PathParams
 * } from './.tasc/operations';
 * 
 * // Create your API client
 * export const api = createTypedApiClient({ baseURL: '...' });
 * 
 * // Extract types for your functions
 * type CreateUserInput = RequestBody<'/users', 'post'>;
 * type UserResponse = ResponseData<'/users/{id}', 'get'>;
 */

import type { paths } from "${relativePath}";
import type { AxiosRequestConfig } from "axios";
import { createApiClient, type ApiClientConfig } from "tasc-ts";

// Re-export paths type for convenience
export type { paths };

/**
 * Pre-typed utility types for this API.
 * These are already bound to your specific paths type, so you don't need to pass generics!
 */

type Operation<P extends keyof paths, M extends "get" | "post" | "put" | "delete" | "patch"> = 
  paths[P][M];

/**
 * Extract request body type for a specific endpoint.
 * Handles both optional (requestBody?) and required (requestBody) cases.
 * @example
 * type CreateUserBody = RequestBody<"/users", "post">;
 */
export type RequestBody<P extends keyof paths, M extends "get" | "post" | "put" | "delete" | "patch"> = 
  Operation<P, M> extends { requestBody?: { content: { "application/json": infer T } } }
    ? T
    : Operation<P, M> extends { requestBody: { content: { "application/json": infer T } } }
    ? T
    : never;

/**
 * Extracts all available status codes from an operation's responses.
 * @example
 * type UserStatusCodes = AvailableStatusCodes<"/users/{id}", "get">; // 200 | 404 | 500
 */
export type AvailableStatusCodes<
  P extends keyof paths,
  M extends "get" | "post" | "put" | "delete" | "patch"
> = Operation<P, M> extends { responses: infer R }
  ? R extends Record<string, unknown>
    ? keyof R & number
    : never
  : never;

/**
 * Extract response data type for a specific endpoint.
 * Handles multiple OpenAPI response structures for maximum compatibility.
 * @example
 * type UserResponse = ResponseData<"/users/{id}", "get">;
 * type UserResponse404 = ResponseData<"/users/{id}", "get", 404>;
 */
export type ResponseData<
  P extends keyof paths, 
  M extends "get" | "post" | "put" | "delete" | "patch",
  Status extends AvailableStatusCodes<P, M> = 200 extends AvailableStatusCodes<P, M>
    ? 200
    : AvailableStatusCodes<P, M>
> = Operation<P, M> extends {
  responses: { [K in Status]: { content: { "application/json": infer D } } };
}
  ? D
  : Operation<P, M> extends {
      responses: { [K in Status]: infer R };
    }
  ? R extends { content: { "application/json": infer D } }
    ? D
    : unknown
  : unknown;

/**
 * Unwraps the 'data' property from a wrapped API response.
 * Use this when your API returns { success, data, status } structure.
 * @example
 * type AddressData = UnwrapData<"/api/v1/address", "post">;
 * // Extracts just the 'data' property from { success, data, status }
 */
export type UnwrapData<
  P extends keyof paths,
  M extends "get" | "post" | "put" | "delete" | "patch",
  Status extends AvailableStatusCodes<P, M> = 200 extends AvailableStatusCodes<P, M>
    ? 200
    : AvailableStatusCodes<P, M>
> = ResponseData<P, M, Status> extends { data: infer D }
  ? D
  : ResponseData<P, M, Status>;

/**
 * Extract query parameters type for a specific endpoint.
 * @example
 * type UsersQueryParams = QueryParams<"/users", "get">;
 */
export type QueryParams<P extends keyof paths, M extends "get" | "post" | "put" | "delete" | "patch"> = 
  Operation<P, M> extends { parameters: { query?: infer Q } }
    ? Q extends Record<string, unknown> ? Q : never
    : never;

/**
 * Extract path parameters type for a specific endpoint.
 * @example
 * type UserPathParams = PathParams<"/users/{id}">;
 */
export type PathParams<P extends keyof paths> = 
  P extends \`\${string}{\${infer Param}}\${infer Rest}\`
    ? { [K in Param | keyof PathParams<Rest>]: string | number }
    : {};

type TypedAxiosConfig<P extends keyof paths, M extends "get" | "post" | "put" | "delete" | "patch"> = 
  Omit<AxiosRequestConfig, "params"> & {
    params?: QueryParams<P, M>;
  };

export const createOperations = (apiClient: any) => ({
`;

  const operationFunctions = operations
    .map((op) => generateOperationFunction(op))
    .join("\n");

  const footer = `}) as const;

/**
 * Type representing all available API operations.
 * This type is inferred from the createOperations return value for proper TypeScript support.
 */
export type ApiOperations = ReturnType<typeof createOperations>;

/**
 * Creates a typed API client with operations already attached.
 * This provides full IntelliSense support for all operations.
 * 
 * @example
 * \`\`\`typescript
 * import { api } from './.tasc/api-client';
 * 
 * // Full IntelliSense!
 * await api.op.getUserById({ id: '123' });
 * \`\`\`
 * 
 * Or create with custom config:
 * \`\`\`typescript
 * import { createTypedApiClient } from './.tasc/operations';
 * 
 * export const api = createTypedApiClient({
 *   baseURL: process.env.API_URL,
 *   interceptors: {
 *     request: (config) => {
 *       config.headers.Authorization = \`Bearer \${token}\`;
 *       return config;
 *     }
 *   }
 * });
 * 
 * await api.op.getUserById({ id: '123' });
 * \`\`\`
 */
export function createTypedApiClient(config: ApiClientConfig = {}) {
  const client = createApiClient<paths, ApiOperations>(config);
  client.op = createOperations(client) as ApiOperations;
  return client;
}
`;

  return header + operationFunctions + footer;
}

/**
 * Generates a single operation function.
 */
function generateOperationFunction(operation: {
  operationId: string;
  method: string;
  path: string;
  pathParams: string[];
  hasRequestBody: boolean;
  summary: string;
  description: string;
}): string {
  const {
    operationId,
    method,
    path: pathTemplate,
    pathParams,
    hasRequestBody,
    summary,
    description,
  } = operation;

  const httpMethod = method.toLowerCase();
  const params: string[] = [];

  if (pathParams.length > 0) {
    const pathParamsType = `{ ${pathParams
      .map((p) => `${toCamelCase(p)}: string | number`)
      .join(", ")} }`;
    params.push(`pathParams: ${pathParamsType}`);
  }

  if (hasRequestBody) {
    // Make data parameter use conditional typing to handle empty/optional bodies
    params.push(`data?: RequestBody<"${pathTemplate}", "${httpMethod}">`);
  }

  params.push(`config?: TypedAxiosConfig<"${pathTemplate}", "${httpMethod}">`);

  const jsdoc = ["  /**"];
  if (summary) jsdoc.push(`   * ${summary}`);
  if (description && description !== summary) jsdoc.push(`   * ${description}`);
  jsdoc.push("   * ");
  jsdoc.push(`   * @operationId ${operationId}`);
  jsdoc.push(`   * @method ${method.toUpperCase()}`);
  jsdoc.push(`   * @path ${pathTemplate}`);
  jsdoc.push(`   * @returns Promise with typed response data`);
  jsdoc.push("   */");

  const functionParams = params.join(", ");

  // Add explicit return type for proper type inference
  const returnType = `Promise<{ data: ResponseData<"${pathTemplate}", "${httpMethod}">; status: number; statusText: string; headers: any; config: any; }>`;

  let apiCall: string;
  if (hasRequestBody) {
    if (pathParams.length > 0) {
      apiCall = `apiClient.${httpMethod}("${pathTemplate}", data, pathParams, config)`;
    } else {
      apiCall = `apiClient.${httpMethod}("${pathTemplate}", data, config)`;
    }
  } else {
    if (pathParams.length > 0) {
      apiCall = `apiClient.${httpMethod}("${pathTemplate}", pathParams, config)`;
    } else {
      apiCall = `apiClient.${httpMethod}("${pathTemplate}", config)`;
    }
  }

  return `${jsdoc.join("\n")}
  ${operationId}: (${functionParams}): ${returnType} => ${apiCall},\n`;
}
