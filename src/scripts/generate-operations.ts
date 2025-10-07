import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { loadConfig } from "../utils/config-loader.js";

/* ~ =================================== ~ */
/* -- OpenAPI Operation Generator -- */
/* -- Generates typed API operation functions from OpenAPI spec -- */
/* ~ =================================== ~ */

// Type definitions for OpenAPI spec structure
interface OpenAPISpec {
  paths?: Record<string, PathItem>;
}

interface PathItem {
  get?: Operation;
  post?: Operation;
  put?: Operation;
  delete?: Operation;
  patch?: Operation;
}

interface Operation {
  operationId?: string;
  summary?: string;
  description?: string;
  requestBody?: unknown;
  parameters?: Array<{ in: string; [key: string]: unknown }>;
}

interface ParsedOperation {
  operationId: string;
  method: string;
  path: string;
  pathParams: string[];
  hasRequestBody: boolean;
  hasQueryParams: boolean;
  summary: string;
  description: string;
}

/**
 * Extracts path parameter names from an OpenAPI path template.
 * Example: "/api/users/{id}/posts/{postId}" -> ["id", "postId"]
 */
const extractPathParams = (pathTemplate: string): string[] => {
  const matches = pathTemplate.matchAll(/\{([^}]+)\}/g);
  return [...matches].map((match) => match[1]);
};

/**
 * Converts a path parameter name to camelCase.
 * Example: "user_id" -> "userId", "user-id" -> "userId"
 */
const toCamelCase = (str: string): string => {
  return str.replace(/[-_]([a-z])/g, (_: string, letter: string) =>
    letter.toUpperCase()
  );
};

/**
 * Converts an operationId to a valid JavaScript function name.
 * Handles cases like "adminAgentCallTrackerControllerGetThreadAgentCallGraph"
 */
const toFunctionName = (operationId: string): string => {
  // ~ ======= Remove common suffixes/prefixes if needed ======= ~
  return operationId;
};

/**
 * Generates TypeScript type for path parameters.
 */
const generatePathParamsType = (pathParams: string[]): string | null => {
  if (pathParams.length === 0) return null;

  const params = pathParams
    .map((param: string) => `${toCamelCase(param)}: string | number`)
    .join(", ");
  return `{ ${params} }`;
};

/**
 * Generates the function signature for an operation.
 */
const generateOperationFunction = (operation: ParsedOperation): string => {
  const {
    operationId,
    method,
    path: pathTemplate,
    pathParams,
    hasRequestBody,
    summary,
    description,
  } = operation;

  const functionName = toFunctionName(operationId);
  const httpMethod = method.toLowerCase();

  // ~ ======= Build parameter list ======= ~
  const params: string[] = [];

  // ~ ======= Path parameters ======= ~
  if (pathParams.length > 0) {
    const pathParamsType = generatePathParamsType(pathParams);
    params.push(`pathParams: ${pathParamsType}`);
  }

  // ~ ======= Request body for POST/PUT/PATCH ======= ~
  if (hasRequestBody) {
    params.push(`data: RequestBody<"${pathTemplate}", "${httpMethod}">`);
  }

  // ~ ======= Config parameter (always last and optional) ======= ~
  params.push(`config?: TypedAxiosConfig<"${pathTemplate}", "${httpMethod}">`);

  // ~ ======= Generate JSDoc comment ======= ~
  const jsdoc = [];
  jsdoc.push("  /**");
  if (summary) {
    jsdoc.push(`   * ${summary}`);
  }
  if (description && description !== summary) {
    jsdoc.push(`   * ${description}`);
  }
  jsdoc.push("   * ");
  jsdoc.push(`   * @operationId ${operationId}`);
  jsdoc.push(`   * @method ${method.toUpperCase()}`);
  jsdoc.push(`   * @path ${pathTemplate}`);
  jsdoc.push("   */");

  // ~ ======= Generate function ======= ~
  const functionParams = params.join(", ");

  // ~ ======= Build the apiClient call ======= ~
  let apiCall: string;
  if (hasRequestBody) {
    // ~ ======= POST/PUT/PATCH with body ======= ~
    if (pathParams.length > 0) {
      apiCall = `apiClient.${httpMethod}("${pathTemplate}", data, pathParams, config)`;
    } else {
      apiCall = `apiClient.${httpMethod}("${pathTemplate}", data, config)`;
    }
  } else {
    // ~ ======= GET/DELETE without body ======= ~
    if (pathParams.length > 0) {
      apiCall = `apiClient.${httpMethod}("${pathTemplate}", pathParams, config)`;
    } else {
      apiCall = `apiClient.${httpMethod}("${pathTemplate}", config)`;
    }
  }

  return `${jsdoc.join("\n")}
  ${functionName}: (${functionParams}) => ${apiCall},\n`;
};

/**
 * Parses the OpenAPI spec and extracts all operations with operationIds.
 */
const parseOpenApiSpec = async (
  openApiPath: string
): Promise<ParsedOperation[]> => {
  const content = await readFile(openApiPath, "utf8");
  const spec = JSON.parse(content) as OpenAPISpec;

  const operations: ParsedOperation[] = [];

  // ~ ======= Iterate through all paths ======= ~
  for (const [pathTemplate, pathItem] of Object.entries(spec.paths || {})) {
    // ~ ======= Iterate through all HTTP methods ======= ~
    for (const method of ["get", "post", "put", "delete", "patch"] as const) {
      const operation = pathItem[method as keyof PathItem];

      if (!operation) continue;

      // ~ ======= Skip operations without operationId ======= ~
      if (!operation.operationId) {
        console.log(
          `⚠️  Skipping ${method.toUpperCase()} ${pathTemplate} - no operationId`
        );
        continue;
      }

      // ~ ======= Extract path parameters ======= ~
      const pathParams = extractPathParams(pathTemplate);

      // ~ ======= Check for request body ======= ~
      const hasRequestBody = Boolean(operation.requestBody);

      // ~ ======= Check for query parameters ======= ~
      const hasQueryParams =
        operation.parameters?.some(
          (param: { in: string }) => param.in === "query"
        ) ?? false;

      operations.push({
        operationId: operation.operationId,
        method,
        path: pathTemplate,
        pathParams,
        hasRequestBody,
        hasQueryParams,
        summary: operation.summary || "",
        description: operation.description || "",
      });

      console.log(`✅ Found operation: ${operation.operationId}`);
    }
  }

  return operations;
};

/**
 * Generates the TypeScript file content with all operations.
 */
const generateTypeScriptFile = (operations: ParsedOperation[]): string => {
  const header = `/**
 * Auto-generated API operations from OpenAPI spec.
 * 
 * This file is automatically generated by scripts/generate-operations.js
 * DO NOT EDIT MANUALLY - your changes will be overwritten.
 * 
 * Last generated: ${new Date().toISOString()}
 * Total operations: ${operations.length}
 */

/* ~ =================================== ~ */
/* -- This file provides semantic operation-based API functions -- */
/* -- Use apiClient.op.operationName() instead of raw paths -- */
/* ~ =================================== ~ */

import type { paths } from "@/types/api"
import type { AxiosRequestConfig } from "axios"

/* ~ =================================== ~ */
/* -- Type Helpers -- */
/* ~ =================================== ~ */

type Operation<P extends keyof paths, M extends "get" | "post" | "put" | "delete" | "patch"> = 
  paths[P][M]

/**
 * Extracts the request body type for a given path and method.
 */
type RequestBody<P extends keyof paths, M extends "get" | "post" | "put" | "delete" | "patch"> = 
  Operation<P, M> extends { requestBody: { content: { "application/json": infer T } } }
    ? T
    : never

/**
 * Extracts query parameters for a given path and method.
 */
type QueryParams<P extends keyof paths, M extends "get" | "post" | "put" | "delete" | "patch"> = 
  Operation<P, M> extends { parameters: { query?: infer Q } }
    ? Q extends Record<string, unknown>
      ? Q
      : never
    : never

/**
 * Extended Axios config with typed query parameters.
 */
type TypedAxiosConfig<P extends keyof paths, M extends "get" | "post" | "put" | "delete" | "patch"> = 
  Omit<AxiosRequestConfig, "params"> & {
    params?: QueryParams<P, M>
  }

/* ~ =================================== ~ */
/* -- Generated Operations -- */
/* ~ =================================== ~ */

/**
 * Collection of all API operations extracted from the OpenAPI spec.
 * Each operation is a typed function that wraps the underlying apiClient methods.
 * 
 * @example
 * \`\`\`typescript
 * // Using operation-based API
 * await apiClient.op.getUserById({ id: "123" })
 * 
 * // With query parameters
 * await apiClient.op.listUsers({ params: { limit: 10, offset: 0 } })
 * 
 * // With request body
 * await apiClient.op.createUser({ name: "John", email: "john@example.com" })
 * \`\`\`
 */
export const createOperations = (apiClient: any) => ({
`;

  const operationFunctions = operations
    .map((op: ParsedOperation) => generateOperationFunction(op))
    .join("\n");

  const footer = `}) as const

/**
 * Type representing all available API operations.
 * This type is inferred from the createOperations return value for proper TypeScript support.
 */
export type ApiOperations = ReturnType<typeof createOperations>
`;

  return header + operationFunctions + footer;
};

/**
 * Main function that orchestrates the generation process.
 */
const main = async (): Promise<void> => {
  console.log("\n🚀 Starting OpenAPI operation generation...\n");

  try {
    // ~ ======= Load configuration ======= ~
    console.log("📋 Loading tasc configuration...");
    const config = await loadConfig();

    // ~ ======= Determine file paths from config ======= ~
    const openApiPath =
      config.outputs.doc_file ?? path.join(process.cwd(), "openapi.json");
    const outputPath =
      config.outputs.api_operations ??
      path.join(process.cwd(), "src/services/axios/api-operations.ts");

    console.log("   API Doc:", openApiPath);
    console.log("   Output:", outputPath);

    // ~ ======= Parse OpenAPI spec ======= ~
    console.log("\n📖 Reading OpenAPI spec...");
    const operations = await parseOpenApiSpec(openApiPath);

    if (operations.length === 0) {
      console.warn(
        "\n⚠️  No operations with operationId found in OpenAPI spec"
      );
      return;
    }

    console.log(
      `\n✅ Found ${operations.length} operations with operationId\n`
    );

    // ~ ======= Generate TypeScript file ======= ~
    console.log("📝 Generating TypeScript file...");
    const fileContent = generateTypeScriptFile(operations);

    // ~ ======= Write to disk ======= ~
    console.log("💾 Writing to:", outputPath);
    await writeFile(outputPath, fileContent, "utf8");

    console.log(
      `\n✅ Successfully generated ${operations.length} API operations!`
    );
    console.log(`📁 Output file: ${outputPath}\n`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    const errorStack = error instanceof Error ? error.stack : "";
    console.error("\n❌ Error generating operations:", errorMessage);
    console.error(errorStack);
    process.exit(1);
  }
};

// ~ ======= Run the generator ======= ~
main();
