/**
 * TypeScript type generation from OpenAPI spec using openapi-typescript.
 */

import { spawn } from "node:child_process";
import { mkdir } from "node:fs/promises";
import path from "node:path";

/**
 * Generates TypeScript types from OpenAPI spec using openapi-typescript.
 */
export async function generateTypes(
  specPath: string,
  outputPath: string
): Promise<void> {
  return new Promise((resolve, reject) => {
    const dir = path.dirname(outputPath);

    // Ensure output directory exists
    mkdir(dir, { recursive: true })
      .then(() => {
        // Run openapi-typescript CLI
        const child = spawn(
          "npx",
          [
            "openapi-typescript",
            specPath,
            "--output",
            outputPath,
            "--export-type",
          ],
          {
            stdio: ["ignore", "pipe", "pipe"],
          }
        );

        let stdout = "";
        let stderr = "";

        if (child.stdout) {
          child.stdout.on("data", (chunk) => {
            stdout += chunk.toString();
          });
        }

        if (child.stderr) {
          child.stderr.on("data", (chunk) => {
            stderr += chunk.toString();
          });
        }

        child.on("close", (code) => {
          if (code === 0) {
            resolve();
          } else {
            reject(
              new Error(
                `openapi-typescript failed with code ${code}\n${
                  stderr || stdout
                }`
              )
            );
          }
        });

        child.on("error", (error) => {
          reject(error);
        });
      })
      .catch(reject);
  });
}
