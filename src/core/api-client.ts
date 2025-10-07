/**
 * Generic typed HTTP client factory for OpenAPI-based APIs.
 *
 * This module provides a configurable Axios wrapper with:
 * - Full TypeScript type safety derived from OpenAPI-generated `paths` type
 * - Strongly typed helpers (`get`, `post`, `put`, `delete`, `patch`)
 * - Configurable request/response interceptors
 * - Automatic path parameter interpolation
 * - Operation-based API methods from operationIds
 *
 * Design notes:
 * - Keep the surface area minimal and predictable; only common HTTP verbs
 *   are exposed to encourage consistent usage.
 * - Favor type extraction from OpenAPI definitions to prevent manual drift.
 * - Fully configurable for any authentication scheme via interceptors.
 */

import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
  type InternalAxiosRequestConfig,
} from "axios";

/**
 * Configuration options for creating an API client instance.
 */
export interface ApiClientConfig {
  /** Base URL for all API requests */
  baseURL?: string;
  /** Whether to send cookies with requests */
  withCredentials?: boolean;
  /** Request timeout in milliseconds */
  timeout?: number;
  /** Default headers to include with every request */
  headers?: Record<string, string>;
  /** Request and response interceptors */
  interceptors?: {
    /** Intercept and modify requests before they are sent */
    request?: (
      config: InternalAxiosRequestConfig
    ) => InternalAxiosRequestConfig | Promise<InternalAxiosRequestConfig>;
    /** Handle request errors */
    requestError?: (error: unknown) => unknown;
    /** Intercept and modify responses before they are returned */
    response?: (
      response: AxiosResponse
    ) => AxiosResponse | Promise<AxiosResponse>;
    /** Handle response errors (e.g., 4xx, 5xx) */
    responseError?: (error: unknown) => unknown;
  };
  /** Direct access to configure the underlying Axios instance */
  axiosConfig?: AxiosRequestConfig;
}

/**
 * Generic paths type that can be provided by users.
 * This will be overridden with the actual OpenAPI paths type.
 */
export type Paths<T = Record<string, any>> = keyof T;

/**
 * HTTP methods supported by the client facade.
 * Exported for use in application code when you need to reference valid HTTP methods.
 */
export type HttpMethod = "get" | "post" | "put" | "delete" | "patch";

/**
 * Resolves the OpenAPI operation schema for a given path and method.
 */
type Operation<
  T,
  P extends Paths<T>,
  M extends HttpMethod
> = T[P] extends Record<string, any> ? T[P][M] : never;

/**
 * Extracts placeholder parameter names from an OpenAPI-style path template.
 * For example: "/users/{id}/posts/{postId}" -> "id" | "postId".
 */
type ExtractPathParamNames<T extends string> =
  T extends `${string}{${infer P}}${infer R}`
    ? P | ExtractPathParamNames<R>
    : never;

/**
 * Maps extracted path parameter names to a simple serializable value type.
 * If the path has no placeholders, this resolves to `never` to discourage usage.
 */
type PathParams<T, P extends Paths<T>> = ExtractPathParamNames<
  P & string
> extends never
  ? never
  : Record<ExtractPathParamNames<P & string>, string | number | boolean>;

/**
 * Extracts query parameter types from the OpenAPI operation schema.
 * Returns never if no query params are defined.
 */
type QueryParams<T, P extends Paths<T>, M extends HttpMethod> = Operation<
  T,
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
type TypedAxiosConfig<T, P extends Paths<T>, M extends HttpMethod> = Omit<
  AxiosRequestConfig,
  "params"
> & {
  params?: QueryParams<T, P, M>;
};

/**
 * Creates a configured Axios instance with optional interceptors.
 */
function createAxiosInstance(config: ApiClientConfig = {}): AxiosInstance {
  const instance = axios.create({
    baseURL: config.baseURL,
    withCredentials: config.withCredentials,
    timeout: config.timeout,
    headers: config.headers,
    ...config.axiosConfig,
  });

  // Register request interceptors if provided
  if (config.interceptors?.request || config.interceptors?.requestError) {
    instance.interceptors.request.use(
      config.interceptors.request,
      config.interceptors.requestError
    );
  }

  // Register response interceptors if provided
  if (config.interceptors?.response || config.interceptors?.responseError) {
    instance.interceptors.response.use(
      config.interceptors.response,
      config.interceptors.responseError
    );
  }

  return instance;
}

/**
 * Infers the JSON request body type for a given path/method pair from OpenAPI.
 * Handles both required and optional requestBody definitions in the OpenAPI spec.
 */
type RequestBody<T, P extends Paths<T>, M extends HttpMethod> = Operation<
  T,
  P,
  M
> extends {
  requestBody?: { content: { "application/json": infer B } };
}
  ? B
  : never;

/**
 * Extracts all available status codes from an operation's responses.
 */
export type AvailableStatusCodes<
  T,
  P extends Paths<T>,
  M extends HttpMethod
> = Operation<T, P, M> extends { responses: infer R }
  ? R extends Record<string, unknown>
    ? keyof R & number
    : never
  : never;

/**
 * Infers the JSON response body type for a given status code from OpenAPI.
 * Status parameter is constrained to only valid status codes for that endpoint.
 * Defaults to 200 if no status code is provided.
 */
type ResponseData<
  T,
  P extends Paths<T>,
  M extends HttpMethod,
  Status extends AvailableStatusCodes<
    T,
    P,
    M
  > = 200 extends AvailableStatusCodes<T, P, M>
    ? 200
    : AvailableStatusCodes<T, P, M>
> = Operation<T, P, M> extends {
  responses: { [K in Status]: { content: { "application/json": infer D } } };
}
  ? D
  : never;

/**
 * Public utility types for extracting request/response types from the OpenAPI schema.
 * Use these in your application code to type method parameters and return values.
 *
 * @example
 * ```typescript
 * import type { paths } from './types/api';
 *
 * // Extract request body type for POST /api/v1/school
 * type CreateSchoolInput = ApiRequestBody<paths, "/api/v1/school", "post">;
 *
 * // Extract response data type for GET /api/v1/school (defaults to 200)
 * type SchoolListResponse = ApiResponseData<paths, "/api/v1/school", "get">;
 *
 * // Extract response data type for POST /api/v1/school with 201 status
 * type CreateSchoolResponse = ApiResponseData<paths, "/api/v1/school", "post", 201>;
 *
 * // Extract path parameters for GET /api/v1/school/{id}
 * type SchoolPathParams = ApiPathParams<paths, "/api/v1/school/{id}">;
 *
 * // Extract query parameters for GET /api/v1/school/paginated
 * type SchoolQueryParams = ApiQueryParams<paths, "/api/v1/school/paginated", "get">;
 * ```
 */
export type ApiRequestBody<
  T,
  P extends Paths<T>,
  M extends HttpMethod
> = RequestBody<T, P, M>;
export type ApiResponseData<
  T,
  P extends Paths<T>,
  M extends HttpMethod,
  Status extends AvailableStatusCodes<
    T,
    P,
    M
  > = 200 extends AvailableStatusCodes<T, P, M>
    ? 200
    : AvailableStatusCodes<T, P, M>
> = ResponseData<T, P, M, Status>;
export type ApiPathParams<T, P extends Paths<T>> = PathParams<T, P>;
export type ApiQueryParams<
  T,
  P extends Paths<T>,
  M extends HttpMethod
> = QueryParams<T, P, M>;

/**
 * Replaces `{param}` placeholders in a path template using provided values.
 * Throws a descriptive error if a required placeholder value is missing.
 */
function interpolatePath<T, P extends Paths<T>>(
  template: P,
  params?: PathParams<T, P> | never
): string {
  const path = String(template);
  if (!params) return path;
  const missing: string[] = [];
  const result = path.replace(/\{([^}]+)\}/g, (match, key: string) => {
    const value = (params as Record<string, unknown>)[key];
    if (value === undefined || value === null) {
      missing.push(key);
      return match;
    }
    return encodeURIComponent(String(value));
  });
  if (missing.length > 0) {
    throw new Error(
      `Missing required path param(s): ${missing.join(
        ", "
      )} for template: ${path}`
    );
  }
  return result;
}

/**
 * Base type for operation-based API methods.
 * The actual operations type is generated and will be much more specific.
 * This exists only for the generic parameter default.
 */
export type ApiOperations = Record<string, (...args: any[]) => Promise<any>>;

/**
 * Creates a typed API client instance with full OpenAPI type safety.
 *
 * @template T - The OpenAPI paths type (e.g., `paths` from generated types)
 * @template TOperations - The operations type from your generated operations file
 * @param config - Configuration options for the client
 * @returns A fully typed API client with HTTP methods and operation-based API
 *
 * @example
 * ```typescript
 * // Manual usage (if not using createTypedApiClient from generated file)
 * import { createApiClient } from 'tasc-ts';
 * import type { paths } from './.tasc/types';
 * import type { ApiOperations } from './.tasc/operations';
 *
 * export const apiClient = createApiClient<paths, ApiOperations>({
 *   baseURL: process.env.API_URL,
 *   withCredentials: true,
 *   interceptors: {
 *     request: (config) => {
 *       const token = localStorage.getItem('auth_token');
 *       if (token) config.headers.Authorization = `Bearer ${token}`;
 *       return config;
 *     }
 *   }
 * });
 *
 * // Use path-based API
 * await apiClient.get("/users/{id}", { id: "123" });
 *
 * // Use operation-based API (fully typed!)
 * await apiClient.op.getUserById({ id: "123" });
 * ```
 */
export function createApiClient<
  T = Record<string, any>,
  TOperations = Record<string, any>
>(config: ApiClientConfig = {}) {
  const axiosInstance = createAxiosInstance(config);

  // Private cache for operations to enable lazy loading
  let _operationsCache: TOperations | null = null;

  const client = {
    /**
     * Sends a GET request to the given OpenAPI path.
     * Automatically handles paths with/without parameters and provides typed query params.
     */
    get<P extends Paths<T>>(
      url: P,
      ...args: PathParams<T, P> extends never
        ? [config?: TypedAxiosConfig<T, P, "get">]
        : [pathParams: PathParams<T, P>, config?: TypedAxiosConfig<T, P, "get">]
    ) {
      // Check if the URL contains path parameters by looking for curly braces
      const hasPathParams = String(url).includes("{");
      const [pathParamsOrConfig, config] = args;

      // If path has params, first arg is pathParams, otherwise it's config
      const pathParams = hasPathParams
        ? (pathParamsOrConfig as PathParams<T, P>)
        : undefined;

      const finalConfig = hasPathParams
        ? (config as TypedAxiosConfig<T, P, "get"> | undefined)
        : (pathParamsOrConfig as TypedAxiosConfig<T, P, "get"> | undefined);

      return axiosInstance.get<ResponseData<T, P, "get">>(
        interpolatePath(url, pathParams),
        finalConfig
      );
    },

    /**
     * Sends a POST request with a JSON body inferred from the OpenAPI spec.
     * Automatically handles paths with/without parameters and provides typed query params.
     */
    post<P extends Paths<T>>(
      url: P,
      data: RequestBody<T, P, "post">,
      ...args: PathParams<T, P> extends never
        ? [config?: TypedAxiosConfig<T, P, "post">]
        : [
            pathParams: PathParams<T, P>,
            config?: TypedAxiosConfig<T, P, "post">
          ]
    ) {
      // Check if the URL contains path parameters by looking for curly braces
      const hasPathParams = String(url).includes("{");
      const [pathParamsOrConfig, config] = args;

      // If path has params, first arg is pathParams, otherwise it's config
      const pathParams = hasPathParams
        ? (pathParamsOrConfig as PathParams<T, P>)
        : undefined;

      const finalConfig = hasPathParams
        ? (config as TypedAxiosConfig<T, P, "post"> | undefined)
        : (pathParamsOrConfig as TypedAxiosConfig<T, P, "post"> | undefined);

      return axiosInstance.post<ResponseData<T, P, "post">>(
        interpolatePath(url, pathParams),
        data,
        finalConfig
      );
    },

    /**
     * Sends a PUT request with a JSON body inferred from the OpenAPI spec.
     * Automatically handles paths with/without parameters and provides typed query params.
     */
    put<P extends Paths<T>>(
      url: P,
      data: RequestBody<T, P, "put">,
      ...args: PathParams<T, P> extends never
        ? [config?: TypedAxiosConfig<T, P, "put">]
        : [pathParams: PathParams<T, P>, config?: TypedAxiosConfig<T, P, "put">]
    ) {
      // Check if the URL contains path parameters by looking for curly braces
      const hasPathParams = String(url).includes("{");
      const [pathParamsOrConfig, config] = args;

      // If path has params, first arg is pathParams, otherwise it's config
      const pathParams = hasPathParams
        ? (pathParamsOrConfig as PathParams<T, P>)
        : undefined;

      const finalConfig = hasPathParams
        ? (config as TypedAxiosConfig<T, P, "put"> | undefined)
        : (pathParamsOrConfig as TypedAxiosConfig<T, P, "put"> | undefined);

      return axiosInstance.put<ResponseData<T, P, "put">>(
        interpolatePath(url, pathParams),
        data,
        finalConfig
      );
    },

    /**
     * Sends a DELETE request and returns the typed successful response body.
     * Automatically handles paths with/without parameters and provides typed query params.
     */
    delete<P extends Paths<T>>(
      url: P,
      ...args: PathParams<T, P> extends never
        ? [config?: TypedAxiosConfig<T, P, "delete">]
        : [
            pathParams: PathParams<T, P>,
            config?: TypedAxiosConfig<T, P, "delete">
          ]
    ) {
      // Check if the URL contains path parameters by looking for curly braces
      const hasPathParams = String(url).includes("{");
      const [pathParamsOrConfig, config] = args;

      // If path has params, first arg is pathParams, otherwise it's config
      const pathParams = hasPathParams
        ? (pathParamsOrConfig as PathParams<T, P>)
        : undefined;

      const finalConfig = hasPathParams
        ? (config as TypedAxiosConfig<T, P, "delete"> | undefined)
        : (pathParamsOrConfig as TypedAxiosConfig<T, P, "delete"> | undefined);

      return axiosInstance.delete<ResponseData<T, P, "delete">>(
        interpolatePath(url, pathParams),
        finalConfig
      );
    },

    /**
     * Sends a PATCH request with a JSON body inferred from the OpenAPI spec.
     * Automatically handles paths with/without parameters and provides typed query params.
     */
    patch<P extends Paths<T>>(
      url: P,
      data: RequestBody<T, P, "patch">,
      ...args: PathParams<T, P> extends never
        ? [config?: TypedAxiosConfig<T, P, "patch">]
        : [
            pathParams: PathParams<T, P>,
            config?: TypedAxiosConfig<T, P, "patch">
          ]
    ) {
      // Check if the URL contains path parameters by looking for curly braces
      const hasPathParams = String(url).includes("{");
      const [pathParamsOrConfig, config] = args;

      // If path has params, first arg is pathParams, otherwise it's config
      const pathParams = hasPathParams
        ? (pathParamsOrConfig as PathParams<T, P>)
        : undefined;

      const finalConfig = hasPathParams
        ? (config as TypedAxiosConfig<T, P, "patch"> | undefined)
        : (pathParamsOrConfig as TypedAxiosConfig<T, P, "patch"> | undefined);

      return axiosInstance.patch<ResponseData<T, P, "patch">>(
        interpolatePath(url, pathParams),
        data,
        finalConfig
      );
    },

    /**
     * Operation-based API methods generated from OpenAPI operationIds.
     * This will be populated by the generated createTypedApiClient function.
     *
     * For best IntelliSense, use createTypedApiClient from the generated operations file.
     *
     * @example
     * ```typescript
     * import { createTypedApiClient } from './.tasc/operations';
     *
     * const api = createTypedApiClient({ baseURL: '...' });
     *
     * // Full IntelliSense!
     * await api.op.getUserById({ id: "123" });
     * ```
     */
    get op(): TOperations {
      // Return cached operations if available, otherwise return empty operations object
      // The actual operations will be set by createTypedApiClient or createOperations
      return _operationsCache ?? ({} as TOperations);
    },
    set op(operations: TOperations) {
      // Allow operations to be set by createTypedApiClient
      _operationsCache = operations;
    },
  };

  return client;
}
