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
  let defaultBaseUrl: string;
  try {
    defaultBaseUrl = new URL(apiUrl).origin;
  } catch {
    defaultBaseUrl = "https://api.example.com";
  }

  return `/**
 * Auto-generated typed API client - Ready to use!
 * 
 * This file exports a fully-typed API client instance with:
 * - Full TypeScript type safety from your OpenAPI spec
 * - IntelliSense support for all operations
 * - Pre-configured interceptors for authentication
 * 
 * DO NOT EDIT MANUALLY - your changes will be overwritten.
 * Re-run 'npx tasc generate' to regenerate this file.
 * 
 * Last generated: ${new Date().toISOString()}
 * 
 * @example
 * \`\`\`typescript
 * import { api } from './path/to/this/file';
 * 
 * // Full IntelliSense everywhere!
 * const user = await api.op.getUserById({ id: '123' });
 * const schools = await api.op.getAllSchool();
 * \`\`\`
 */

import axios, { type AxiosInstance, type AxiosRequestConfig, type InternalAxiosRequestConfig, type AxiosResponse } from "axios";
import type { paths } from "${operationsRelativePath.replace(
    "/operations",
    "/types"
  )}";
import { createOperations, type ApiOperations } from "${operationsRelativePath}";

/**
 * All path templates defined by the OpenAPI paths map.
 */
export type Paths = keyof paths;

/**
 * HTTP methods supported by the client.
 */
export type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

/**
 * Resolves the OpenAPI operation schema for a given path and method.
 */
type Operation<P extends Paths, M extends HttpMethod> = paths[P][M];

/**
 * Extracts placeholder parameter names from an OpenAPI-style path template.
 */
type ExtractPathParamNames<T extends string> =
  T extends \`\${string}{\${infer P}}\${infer R}\`
    ? P | ExtractPathParamNames<R>
    : never;

/**
 * Maps extracted path parameter names to serializable values.
 */
type PathParams<P extends Paths> = ExtractPathParamNames<
  P & string
> extends never
  ? never
  : Record<ExtractPathParamNames<P & string>, string | number | boolean>;

/**
 * Extracts query parameter types from the OpenAPI operation schema.
 */
type QueryParams<P extends Paths, M extends HttpMethod> = Operation<
  P,
  M
> extends { parameters: { query?: infer Q } }
  ? Q extends Record<string, unknown>
    ? Q
    : never
  : never;

/**
 * Extended Axios config that includes typed query parameters.
 */
type TypedAxiosConfig<P extends Paths, M extends HttpMethod> = Omit<
  AxiosRequestConfig,
  "params"
> & {
  params?: QueryParams<P, M>;
};

/**
 * Infers the JSON request body type from OpenAPI.
 * Handles both required and optional requestBody definitions.
 */
type RequestBody<P extends Paths, M extends HttpMethod> = Operation<
  P,
  M
> extends {
  requestBody?: { content: { "application/json": infer T } };
}
  ? T
  : never;

/**
 * Extracts all available status codes from an operation's responses.
 */
type AvailableStatusCodes<P extends Paths, M extends HttpMethod> = Operation<
  P,
  M
> extends { responses: infer R }
  ? R extends Record<string, unknown>
    ? keyof R & number
    : never
  : never;

/**
 * Infers the JSON response body type for a given status code from OpenAPI.
 */
type ResponseData<
  P extends Paths,
  M extends HttpMethod,
  Status extends AvailableStatusCodes<P, M> = 200 extends AvailableStatusCodes<
    P,
    M
  >
    ? 200
    : AvailableStatusCodes<P, M>
> = Operation<P, M> extends {
  responses: { [K in Status]: { content: { "application/json": infer T } } };
}
  ? T
  : never;

/**
 * Replaces {param} placeholders in a path template using provided values.
 */
function interpolatePath<P extends Paths>(
  template: P,
  params?: PathParams<P> | never
): string {
  const path = String(template);
  if (!params) return path;
  const missing: string[] = [];
  const result = path.replace(/\\{([^}]+)\\}/g, (match, key: string) => {
    const value = (params as Record<string, unknown>)[key];
    if (value === undefined || value === null) {
      missing.push(key);
      return match;
    }
    return encodeURIComponent(String(value));
  });
  if (missing.length > 0) {
    throw new Error(
      \`Missing required path param(s): \${missing.join(", ")} for template: \${path}\`
    );
  }
  return result;
}

/**
 * Shared Axios instance configured with the API base URL.
 */
const axiosInstance = axios.create({
  baseURL: process.env.API_URL || "${defaultBaseUrl}",
  withCredentials: true,
});

/**
 * Request interceptor for authentication.
 * Modify this to match your authentication strategy.
 */
axiosInstance.interceptors.request.use(
  (config) => {
    // Example: Add authentication token
    // Uncomment and modify for your needs:
    
    // if (typeof window !== "undefined") {
    //   const token = localStorage.getItem('auth_token');
    //   if (token) {
    //     config.headers.Authorization = \`Bearer \${token}\`;
    //   }
    // }
    
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response interceptor for error handling.
 * Modify this to handle errors globally.
 */
axiosInstance.interceptors.response.use(
  (response) => response,
  (error) => {
    // Example: Handle 401 unauthorized
    // if (error.response?.status === 401) {
    //   // Redirect to login, refresh token, etc.
    // }
    return Promise.reject(error);
  }
);

/**
 * Fully-typed API client with path-based and operation-based methods.
 * 
 * @example
 * \`\`\`typescript
 * // Path-based API
 * const user = await api.get('/users/{id}', { id: '123' });
 * 
 * // Operation-based API (recommended - full IntelliSense!)
 * const user = await api.op.getUserById({ id: '123' });
 * \`\`\`
 */
export const api = {
  /**
   * Sends a GET request to the given OpenAPI path.
   */
  get<P extends Paths>(
    url: P,
    ...args: PathParams<P> extends never
      ? [config?: TypedAxiosConfig<P, "get">]
      : [pathParams: PathParams<P>, config?: TypedAxiosConfig<P, "get">]
  ) {
    const hasPathParams = String(url).includes("{");
    const [pathParamsOrConfig, config] = args;
    const pathParams = hasPathParams ? (pathParamsOrConfig as PathParams<P>) : undefined;
    const finalConfig = hasPathParams
      ? (config as TypedAxiosConfig<P, "get"> | undefined)
      : (pathParamsOrConfig as TypedAxiosConfig<P, "get"> | undefined);
    return axiosInstance.get<ResponseData<P, "get">>(
      interpolatePath(url, pathParams),
      finalConfig
    );
  },

  /**
   * Sends a POST request with a JSON body.
   */
  post<P extends Paths>(
    url: P,
    data: RequestBody<P, "post">,
    ...args: PathParams<P> extends never
      ? [config?: TypedAxiosConfig<P, "post">]
      : [pathParams: PathParams<P>, config?: TypedAxiosConfig<P, "post">]
  ) {
    const hasPathParams = String(url).includes("{");
    const [pathParamsOrConfig, config] = args;
    const pathParams = hasPathParams ? (pathParamsOrConfig as PathParams<P>) : undefined;
    const finalConfig = hasPathParams
      ? (config as TypedAxiosConfig<P, "post"> | undefined)
      : (pathParamsOrConfig as TypedAxiosConfig<P, "post"> | undefined);
    return axiosInstance.post<ResponseData<P, "post">>(
      interpolatePath(url, pathParams),
      data,
      finalConfig
    );
  },

  /**
   * Sends a PUT request with a JSON body.
   */
  put<P extends Paths>(
    url: P,
    data: RequestBody<P, "put">,
    ...args: PathParams<P> extends never
      ? [config?: TypedAxiosConfig<P, "put">]
      : [pathParams: PathParams<P>, config?: TypedAxiosConfig<P, "put">]
  ) {
    const hasPathParams = String(url).includes("{");
    const [pathParamsOrConfig, config] = args;
    const pathParams = hasPathParams ? (pathParamsOrConfig as PathParams<P>) : undefined;
    const finalConfig = hasPathParams
      ? (config as TypedAxiosConfig<P, "put"> | undefined)
      : (pathParamsOrConfig as TypedAxiosConfig<P, "put"> | undefined);
    return axiosInstance.put<ResponseData<P, "put">>(
      interpolatePath(url, pathParams),
      data,
      finalConfig
    );
  },

  /**
   * Sends a DELETE request.
   */
  delete<P extends Paths>(
    url: P,
    ...args: PathParams<P> extends never
      ? [config?: TypedAxiosConfig<P, "delete">]
      : [pathParams: PathParams<P>, config?: TypedAxiosConfig<P, "delete">]
  ) {
    const hasPathParams = String(url).includes("{");
    const [pathParamsOrConfig, config] = args;
    const pathParams = hasPathParams ? (pathParamsOrConfig as PathParams<P>) : undefined;
    const finalConfig = hasPathParams
      ? (config as TypedAxiosConfig<P, "delete"> | undefined)
      : (pathParamsOrConfig as TypedAxiosConfig<P, "delete"> | undefined);
    return axiosInstance.delete<ResponseData<P, "delete">>(
      interpolatePath(url, pathParams),
      finalConfig
    );
  },

  /**
   * Sends a PATCH request with a JSON body.
   */
  patch<P extends Paths>(
    url: P,
    data: RequestBody<P, "patch">,
    ...args: PathParams<P> extends never
      ? [config?: TypedAxiosConfig<P, "patch">]
      : [pathParams: PathParams<P>, config?: TypedAxiosConfig<P, "patch">]
  ) {
    const hasPathParams = String(url).includes("{");
    const [pathParamsOrConfig, config] = args;
    const pathParams = hasPathParams ? (pathParamsOrConfig as PathParams<P>) : undefined;
    const finalConfig = hasPathParams
      ? (config as TypedAxiosConfig<P, "patch"> | undefined)
      : (pathParamsOrConfig as TypedAxiosConfig<P, "patch"> | undefined);
    return axiosInstance.patch<ResponseData<P, "patch">>(
      interpolatePath(url, pathParams),
      data,
      finalConfig
    );
  },

  /**
   * Operation-based API methods generated from OpenAPI operationIds.
   * Provides semantic function names with full IntelliSense support.
   *
   * @example
   * \`\`\`typescript
   * // Full IntelliSense and type safety!
   * await api.op.getUserById({ id: "123" });
   * await api.op.createUser({ name: "John", email: "john@example.com" });
   * \`\`\`
   */
  get op(): ApiOperations {
    return createOperations(this);
  },
};

// Re-export types for convenience
export type {
  paths,
  RequestBody,
  ResponseData,
  UnwrapData,
  PathParams,
  QueryParams,
  ApiOperations,
  AvailableStatusCodes,
} from "${operationsRelativePath}";
`;
}
