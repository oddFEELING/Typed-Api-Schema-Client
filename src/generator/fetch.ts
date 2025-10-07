/**
 * Utilities for fetching and saving OpenAPI specifications.
 */

import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

/**
 * Fetches OpenAPI spec from the configured URL.
 * Returns the spec content and its hash for change detection.
 */
export async function fetchApiSpec(
  apiUrl: string
): Promise<{ content: string; hash: string }> {
  const response = await fetch(apiUrl);
  if (!response.ok) {
    throw new Error(
      `Failed to fetch API spec: ${response.status} ${response.statusText}`
    );
  }

  const content = await response.text();
  const hash = createHash("sha256").update(content).digest("hex");

  return { content, hash };
}

/**
 * Saves OpenAPI spec to the configured output path.
 */
export async function saveApiSpec(
  content: string,
  outputPath: string
): Promise<void> {
  const dir = path.dirname(outputPath);
  await mkdir(dir, { recursive: true });
  await writeFile(outputPath, content, "utf8");
}
