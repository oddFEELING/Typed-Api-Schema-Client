# 🔷 TASC-TS

> **Typed API Schema Client** - Generate type-safe API clients from OpenAPI specs

[![npm version](https://badge.fury.io/js/tasc-ts.svg)](https://www.npmjs.com/package/tasc-ts)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-blue.svg)](https://www.typescriptlang.org/)

Transform your OpenAPI specification into a fully-typed, production-ready API client with one command.

✨ **Features:**
- 🎯 **Full TypeScript type safety** - Generate types directly from your OpenAPI specs
- ✨ **Pre-typed utility types** - No need to pass generics manually, everything just works
- 🔄 **Auto-generate types and operations** - One command to generate everything you need
- 🎨 **Configurable interceptors** - Add authentication, logging, and error handling
- 👀 **Watch mode** - Automatically regenerate when your API changes
- 🚀 **Zero config** - Works out of the box with sensible defaults
- 💪 **Dual API styles** - Use path-based or operation-based methods

```bash
npm install tasc-ts
```

---

## 📑 Table of Contents

- [🚀 Quick Start](#-quick-start)
- [⚙️ Configuration](#️-configuration)
  - [Config File Overview](#config-file-overview)
  - [Configuration Options Reference](#configuration-options-reference)
  - [Path Resolution Logic](#path-resolution-logic)
  - [Full Config Example](#full-config-example)
- [🔧 CLI Reference](#-cli-reference)
  - [`tasc init`](#tasc-init)
  - [`tasc config`](#tasc-config)
  - [`tasc generate`](#tasc-generate)
  - [`tasc watch`](#tasc-watch)
- [📚 API Client Guide](#-api-client-guide)
  - [Creating a Client Instance](#creating-a-client-instance)
  - [Path-Based API](#path-based-api)
  - [Operation-Based API](#operation-based-api)
  - [Authentication Examples](#authentication-examples)
  - [Error Handling](#error-handling)
  - [Type Extraction](#type-extraction)
- [💡 Examples](#-examples)
  - [Next.js Integration](#nextjs-integration)
  - [React Query Integration](#react-query-integration)
  - [Express.js Backend](#expressjs-backend)
  - [Testing with Vitest](#testing-with-vitest)
- [📖 API Reference](#-api-reference)
  - [`createApiClient<T, TOperations>`](#createapiclientt-toperations-config)
  - [`ApiClientConfig`](#apiclientconfig)
  - [HTTP Methods](#http-methods)
  - [Generated Utility Types](#generated-utility-types)
- [🔍 Troubleshooting](#-troubleshooting)
- [❓ FAQ](#-faq)
- [🛠️ Recommended Package Scripts](#️-recommended-package-scripts)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 🚀 Quick Start

Get up and running in under 5 minutes:

### 1. Install

```bash
npm install tasc-ts
```

### 2. Initialize

```bash
npx tasc init
```

This creates a `tasc.config.ts` file in your project root.

### 3. Configure

Edit `tasc.config.ts` to point to your OpenAPI spec:

```typescript
import type { ConfigOptions } from "tasc-ts";

const config: ConfigOptions = {
  api_doc_url: "https://api.example.com/openapi.json",
  environment: "development",
  outputs: {
    base_path: "src",
  }
};

export default config;
```

### 4. Generate Types

```bash
npx tasc generate
```

This fetches your OpenAPI spec and generates TypeScript types and operations.

### 5. Create and Use Your API Client

```typescript
import { createTypedApiClient } from './.tasc/operations';

// Create a typed API client with full IntelliSense support
// All paths are automatically derived from your tasc.config.ts
export const api = createTypedApiClient({
  baseURL: 'https://api.example.com',
  interceptors: {
    request: (config) => {
      // Add authentication token
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }
  }
});

// Use path-based API
const user = await api.get('/users/{id}', { id: '123' });

// Or use operation-based API with full IntelliSense! (using operationId from OpenAPI spec)
const data = await api.op.getUserById({ id: '123' });
```

---

<div align="right">
  <a href="#-table-of-contents">⬆ Back to top</a>
</div>

## ⚙️ Configuration

### Config File Overview

The `tasc.config.ts` file controls how types are generated and where they're saved.

**Location:** `tasc.config.ts` (project root)  
**Type:** `ConfigOptions`  
**Format:** TypeScript or JSON

### Configuration Options Reference

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `api_doc_url` | `string` | No | `http://localhost:8080/doc/openapi.json` | URL to your OpenAPI specification |
| `environment` | `string` | No | `development` | Environment name (for reference) |
| `poll_interval_ms` | `number` | No | `5000` | Polling interval for watch mode (milliseconds) |
| `outputs.base_path` | `string` | No | `""` | Base directory for all outputs |
| `outputs.dir` | `string` | No | `""` | Override output directory (relative to base_path) |
| `outputs.api_types` | `string` | No | `".tasc/types.ts"` | Path for generated types file |
| `outputs.api_operations` | `string` | No | `".tasc/operations.ts"` | Path for generated operations file |
| `outputs.doc_file` | `string` | No | `".tasc/openapi.json"` | Path to save the OpenAPI spec |

### Path Resolution Logic

TASC-TS uses intelligent path resolution to give you flexibility:

```typescript
// Example 1: Default (no config)
outputs: {} 
// Result: 
// - .tasc/types.ts
// - .tasc/operations.ts
// - .tasc/openapi.json

// Example 2: With base_path
outputs: { base_path: "src" }
// Result:
// - src/.tasc/types.ts
// - src/.tasc/operations.ts
// - src/.tasc/openapi.json

// Example 3: With dir (overrides default directory)
outputs: { dir: "generated" }
// Result:
// - generated/types.ts
// - generated/operations.ts
// - generated/openapi.json

// Example 4: base_path + dir
outputs: { base_path: "src", dir: "api" }
// Result:
// - src/api/types.ts
// - src/api/operations.ts
// - src/api/openapi.json

// Example 5: Custom individual paths
outputs: { 
  base_path: "src",
  api_types: "types/api.ts",
  api_operations: "lib/operations.ts",
  doc_file: "openapi.json"
}
// Result:
// - src/types/api.ts
// - src/lib/operations.ts
// - src/openapi.json
```

### Full Config Example

```typescript
import type { ConfigOptions } from "tasc-ts";

const config: ConfigOptions = {
  // URL to your OpenAPI specification
  api_doc_url: "https://api.example.com/v1/openapi.json",
  
  // Environment identifier (for your reference)
  environment: "production",
  
  // Watch mode polling interval (5 seconds)
  poll_interval_ms: 5000,
  
  // Output configuration
  outputs: {
    // Base path for all generated files
    base_path: "src",
    
    // Override default directory (optional)
    dir: "api-client",
    
    // Custom paths (optional)
    api_types: "types.ts",
    api_operations: "operations.ts",
    doc_file: "openapi.json"
  }
};

export default config;
```

---

<div align="right">
  <a href="#-table-of-contents">⬆ Back to top</a>
</div>

## 🔧 CLI Reference

### `tasc init`

Initialize a new TASC configuration file.

```bash
Usage: tasc init [options]

Options:
  -f, --force    Overwrite existing config file
  -h, --help     Display help

Examples:
  tasc init              # Create new config file
  tasc init --force      # Overwrite existing config
```

**What it does:**
- Creates a `tasc.config.ts` file in your project root
- Pre-filled with sensible defaults
- Ready to customize for your API

---

### `tasc config`

Display your current configuration.

```bash
Usage: tasc config

Description:
  Display the current TASC configuration

Example:
  tasc config
```

**What it does:**
- Loads your `tasc.config.ts` file
- Displays all configuration options
- Shows resolved output paths

---

### `tasc generate`

Generate types and operations from your OpenAPI spec (one-time).

```bash
Usage: tasc generate

Description:
  Generate TypeScript types and operations from OpenAPI spec

Steps performed:
  1. Fetch OpenAPI spec from api_doc_url
  2. Save spec to outputs.doc_file
  3. Generate TypeScript types file
  4. Generate API operations file

Example:
  tasc generate
```

**What it does:**
- Fetches your OpenAPI specification
- Generates fully-typed TypeScript definitions
- Creates operation helper functions
- Saves everything to configured output paths

---

### `tasc watch`

Watch for API changes and automatically regenerate.

```bash
Usage: tasc watch

Description:
  Watch for API changes and regenerate types automatically

Features:
  - Polls API every poll_interval_ms (default: 5s)
  - Detects changes via SHA-256 hash comparison
  - Only regenerates when changes are detected
  - Graceful shutdown with Ctrl+C

Example:
  tasc watch
```

**What it does:**
- Continuously monitors your API for changes
- Automatically regenerates types when API changes
- Perfect for active development
- Press `Ctrl+C` to stop

---

<div align="right">
  <a href="#-table-of-contents">⬆ Back to top</a>
</div>

## 📚 API Client Guide

### Creating a Client Instance

```typescript
import { createTypedApiClient } from './.tasc/operations';

// Basic client
export const api = createTypedApiClient({
  baseURL: process.env.API_URL
});

// Advanced client with configuration
export const api = createTypedApiClient({
  baseURL: process.env.API_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'X-Custom-Header': 'value',
    'Content-Type': 'application/json'
  }
});
```

**Note:** The `createTypedApiClient` function is generated in your operations file. The import path is automatically determined by your `tasc.config.ts` output configuration.

### Path-Based API

Use REST paths directly with full type safety:

```typescript
// GET request
const user = await api.get('/users/{id}', { id: '123' });
console.log(user.data); // Fully typed!

// POST request
const newUser = await api.post('/users', {
  name: 'John Doe',
  email: 'john@example.com'
});

// PUT request
const updated = await api.put('/users/{id}', { id: '123' }, {
  name: 'Jane Doe'
});

// DELETE request
await api.delete('/users/{id}', { id: '123' });

// PATCH request
const patched = await api.patch('/users/{id}', { id: '123' }, {
  email: 'newemail@example.com'
});

// With query parameters
const users = await api.get('/users', {
  params: { 
    limit: 10, 
    offset: 0,
    sort: 'name'
  }
});
```

### Operation-Based API

Use operation IDs from your OpenAPI spec:

```typescript
// Using operationId from OpenAPI spec
const user = await api.op.getUserById({ id: '123' });

const users = await api.op.listUsers({ 
  params: { limit: 10, offset: 0 } 
});

const created = await api.op.createUser({
  name: 'John Doe',
  email: 'john@example.com'
});
```

### Authentication Examples

#### Bearer Token

```typescript
import { createTypedApiClient } from './.tasc/operations';

export const api = createTypedApiClient({
  baseURL: process.env.API_URL,
  interceptors: {
    request: (config) => {
      // Get token from localStorage
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }
  }
});
```

#### API Key

```typescript
import { createTypedApiClient } from './.tasc/operations';

export const api = createTypedApiClient({
  baseURL: process.env.API_URL,
  headers: {
    'X-API-Key': process.env.API_KEY!
  }
});
```

#### OAuth with Refresh Token

```typescript
import { createTypedApiClient } from './.tasc/operations';

export const api = createTypedApiClient({
  baseURL: process.env.API_URL,
  interceptors: {
    request: async (config) => {
      // Get current access token
      let token = getAccessToken();
      
      // Check if token is expired
      if (isTokenExpired(token)) {
        token = await refreshAccessToken();
      }
      
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    },
    responseError: async (error) => {
      // Handle 401 unauthorized
      if (error.response?.status === 401) {
        await handleUnauthorized();
      }
      return Promise.reject(error);
    }
  }
});
```

### Error Handling

```typescript
import axios from 'axios';

try {
  const user = await api.get('/users/{id}', { id: '123' });
  console.log('User:', user.data);
} catch (error) {
  if (axios.isAxiosError(error)) {
    // HTTP error from the server
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
    console.error('Headers:', error.response?.headers);
  } else {
    // Network error or other error
    console.error('Error:', error);
  }
}
```

### Type Extraction

Extract specific types from your **generated operations file** (not from tasc-ts!):

```typescript
import { 
  createTypedApiClient,
  RequestBody, 
  ResponseData,
  Raw,
  PathParams,
  QueryParams,
  type paths
} from './.tasc/operations';

// These utility types are pre-typed to your API!
// No need to pass the paths generic anymore!

// Extract request body type for POST /users
type CreateUserInput = RequestBody<'/users', 'post'>;

// Extract response type for GET /users/{id}
type UserResponse = ResponseData<'/users/{id}', 'get'>;

// Extract response for specific status code
type UserCreatedResponse = ResponseData<'/users', 'post', 201>;

// If your API wraps responses in { success, data, status }, use Raw to unwrap:
type AddressData = Raw<ResponseData<'/address', 'post'>>;
// Extracts just the inner data property

// Extract path parameters for /users/{id}
type UserPathParams = PathParams<'/users/{id}'>;
// Result: { id: string | number }

// Extract query parameters for GET /users
type UsersQueryParams = QueryParams<'/users', 'get'>;

// Use in your functions with full type safety
async function createUser(input: CreateUserInput): Promise<UserResponse> {
  const response = await api.post('/users', input);
  return response.data;
}

// For wrapped responses
async function createAddress(input: RequestBody<'/address', 'post'>): Promise<Raw<ResponseData<'/address', 'post'>>> {
  const response = await api.op.createAddress(input);
  return response.data.data; // First .data is Axios, second is your wrapper
}
```

**💡 Pro Tip:** Import everything from your generated `.tasc/operations.ts` file - it has all the utility types pre-configured for your specific API!

---

<div align="right">
  <a href="#-table-of-contents">⬆ Back to top</a>
</div>

## 💡 Examples

### Next.js Integration

```typescript
// src/lib/api-client.ts
import { createTypedApiClient } from '@/.tasc/operations';

export const api = createTypedApiClient({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  interceptors: {
    request: (config) => {
      // Only access localStorage in browser
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
      }
      return config;
    }
  }
});

// app/users/[id]/page.tsx
import { api } from '@/lib/api-client';

export default async function UserPage({ params }: { params: { id: string } }) {
  // Full IntelliSense on both path-based and operation-based APIs!
  const user = await api.get('/users/{id}', { id: params.id });
  // OR: const user = await api.op.getUserById({ id: params.id });
  
  return (
    <div>
      <h1>{user.data.name}</h1>
      <p>{user.data.email}</p>
    </div>
  );
}
```

### React Query Integration

```typescript
// hooks/useUser.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

// Fetch user
export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => api.op.getUserById({ id })
  });
}

// Create user
export function useCreateUser() {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (data: { name: string; email: string }) =>
      api.op.createUser(data),
    onSuccess: () => {
      // Invalidate users list
      queryClient.invalidateQueries({ queryKey: ['users'] });
    }
  });
}

// Component usage
function UserProfile({ userId }: { userId: string }) {
  const { data, isLoading, error } = useUser(userId);
  
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error loading user</div>;
  
  return (
    <div>
      <h1>{data?.data.name}</h1>
      <p>{data?.data.email}</p>
    </div>
  );
}
```

### Express.js Backend

```typescript
import express from 'express';
import { createTypedApiClient } from './.tasc/operations';

// Create API client for internal API with full type safety
const api = createTypedApiClient({
  baseURL: process.env.INTERNAL_API_URL,
  timeout: 5000
});

const app = express();

// Proxy endpoint with type safety
app.get('/proxy/users/:id', async (req, res) => {
  try {
    const user = await api.get('/users/{id}', { id: req.params.id });
    res.json(user.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Create user endpoint with IntelliSense
app.post('/proxy/users', async (req, res) => {
  try {
    const newUser = await api.op.createUser(req.body);
    res.status(201).json(newUser.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

app.listen(3000, () => {
  console.log('Server running on port 3000');
});
```

### Testing with Vitest

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { createTypedApiClient } from './.tasc/operations';

describe('API Client', () => {
  let api: ReturnType<typeof createTypedApiClient>;
  
  beforeAll(() => {
    // Create test API client
    api = createTypedApiClient({
      baseURL: 'http://localhost:3000'
    });
  });
  
  it('should fetch user by id', async () => {
    const response = await api.get('/users/{id}', { id: '123' });
    
    expect(response.data).toBeDefined();
    expect(response.data.id).toBe('123');
    expect(response.data.name).toBeTruthy();
  });
  
  it('should create a new user', async () => {
    const newUser = {
      name: 'Test User',
      email: 'test@example.com'
    };
    
    const response = await api.post('/users', newUser);
    
    expect(response.status).toBe(201);
    expect(response.data.name).toBe(newUser.name);
    expect(response.data.email).toBe(newUser.email);
  });
  
  it('should test operations with IntelliSense', async () => {
    // Test operation-based API
    const user = await api.op.getUserById({ id: '123' });
    expect(user.data).toBeDefined();
  });
  
  it('should handle errors gracefully', async () => {
    await expect(
      api.get('/users/{id}', { id: 'invalid' })
    ).rejects.toThrow();
  });
});
```

---

<div align="right">
  <a href="#-table-of-contents">⬆ Back to top</a>
</div>

## 📖 API Reference

### `createApiClient<T, TOperations>(config?)`

Create a typed API client instance with full IntelliSense support.

**Type Signature:**
```typescript
function createApiClient<
  T = Record<string, any>,
  TOperations extends ApiOperations = ApiOperations
>(config?: ApiClientConfig): ApiClient<T, TOperations>
```

**Parameters:**
- `config` (optional) - Configuration object for the API client

**Type Parameters:**
- `T` - The OpenAPI paths type (e.g., `paths` from generated types)
- `TOperations` - The operations type for IntelliSense (e.g., `ApiOperations` from generated operations)

**Returns:**
- `ApiClient<T, TOperations>` - API client instance with typed HTTP methods and operations

**Example:**
```typescript
import type { paths } from './.tasc/types';
import type { ApiOperations } from './.tasc/operations';

const api = createApiClient<paths, ApiOperations>({ 
  baseURL: 'https://api.example.com',
  timeout: 10000
});

// Now api.op has full IntelliSense!
await api.op.getUserById({ id: '123' });
```

---

### `ApiClientConfig`

Configuration interface for the API client.

```typescript
interface ApiClientConfig {
  // Base URL for all requests
  baseURL?: string;
  
  // Send cookies with cross-origin requests
  withCredentials?: boolean;
  
  // Request timeout in milliseconds
  timeout?: number;
  
  // Default headers for all requests
  headers?: Record<string, string>;
  
  // Request/response interceptors
  interceptors?: {
    request?: (config: any) => any | Promise<any>;
    requestError?: (error: any) => any;
    response?: (response: any) => any | Promise<any>;
    responseError?: (error: any) => any;
  };
  
  // Additional axios configuration
  axiosConfig?: AxiosRequestConfig;
}
```

---

### HTTP Methods

#### `get<Path, Method>(path, params?, config?)`

Perform a GET request.

```typescript
const response = await api.get('/users/{id}', { id: '123' });
```

#### `post<Path, Method>(path, data?, config?)`

Perform a POST request.

```typescript
const response = await api.post('/users', { name: 'John', email: 'john@example.com' });
```

#### `put<Path, Method>(path, params?, data?, config?)`

Perform a PUT request.

```typescript
const response = await api.put('/users/{id}', { id: '123' }, { name: 'Jane' });
```

#### `patch<Path, Method>(path, params?, data?, config?)`

Perform a PATCH request.

```typescript
const response = await api.patch('/users/{id}', { id: '123' }, { email: 'newemail@example.com' });
```

#### `delete<Path, Method>(path, params?, config?)`

Perform a DELETE request.

```typescript
await api.delete('/users/{id}', { id: '123' });
```

---

### Utility Types

### Generated Utility Types

The generated operations file exports pre-typed utility types that are already bound to your API. 

**Import from your generated file, not from tasc-ts:**

```typescript
import { 
  RequestBody,
  ResponseData,
  PathParams,
  QueryParams
} from './.tasc/operations';
```

#### `RequestBody<Path, Method>`

Extract request body type for a specific endpoint.

```typescript
type CreateUserInput = RequestBody<'/users', 'post'>;
```

#### `ResponseData<Path, Method, Status?>`

Extract response data type for a specific endpoint. Defaults to status 200.

```typescript
type UserResponse = ResponseData<'/users/{id}', 'get'>;
type UserCreated = ResponseData<'/users', 'post', 201>;
```

#### `Raw<ResponseType>`

Unwraps the `data` property from wrapped API responses. Use when your API returns `{ success, data, status }` structure.

```typescript
// If your API returns: { success: true, data: AddressResponse, status: 201 }
type FullResponse = ResponseData<'/address', 'post'>;
// Result: { success: true, data: AddressResponse, status: 201 }

type AddressData = Raw<ResponseData<'/address', 'post'>>;
// Result: AddressResponse (just the inner data)

// Composable with any response type
type RawUser = Raw<ResponseData<'/users/{id}', 'get'>>;
```

#### `PathParams<Path>`

Extract path parameters type for a specific endpoint.

```typescript
type UserPathParams = PathParams<'/users/{id}'>;
// Result: { id: string | number }
```

#### `QueryParams<Path, Method>`

Extract query parameters type for a specific endpoint.

```typescript
type UsersQueryParams = QueryParams<'/users', 'get'>;
// Result: { limit?: number; offset?: number }
```

**Why is this better?**
- ✅ No need to import from `tasc-ts` package
- ✅ No need to pass the `paths` generic type
- ✅ Simpler, cleaner imports
- ✅ All types are co-located with your API client
- ✅ Paths automatically derived from your `tasc.config.ts`

---

<div align="right">
  <a href="#-table-of-contents">⬆ Back to top</a>
</div>

## 🔍 Troubleshooting

### Common Issues

#### Issue: "Cannot find module 'tasc-ts'"

```bash
# Solution: Install the package
npm install tasc-ts
```

#### Issue: "Config file not found"

```bash
# Solution: Initialize config file
npx tasc init
```

#### Issue: "Failed to fetch API spec"

**Checklist:**
1. Is your API server running?
2. Is the `api_doc_url` correct in `tasc.config.ts`?
3. Are there CORS issues preventing access?
4. Can you access the URL in your browser?

```bash
# Test if API is accessible
curl https://api.example.com/openapi.json
```

#### Issue: "TypeScript config files not loading"

The `tsx` package is required for TypeScript config files.

```bash
# Solution: Install tsx as a dev dependency
npm install -D tsx
```

#### Issue: "Generated types not updating"

```bash
# Solution: Force regeneration
rm -rf .tasc/
npx tasc generate
```

#### Issue: "Type errors in generated code"

1. Make sure your OpenAPI spec is valid
2. Try regenerating: `npx tasc generate`
3. Check for breaking changes in your API
4. Verify TypeScript version compatibility (5.0+)

### Debug Mode

Enable verbose logging for troubleshooting:

```bash
# Set debug environment variable
LOG_LEVEL=debug npx tasc generate
```

### Getting Help

- 📝 [Open an issue](https://github.com/oddFEELING/Typed-Api-Schema-Client/issues)
- 💬 Check existing issues for solutions
- 📧 Contact the maintainers

---

<div align="right">
  <a href="#-table-of-contents">⬆ Back to top</a>
</div>

## ❓ FAQ

**Q: Can I use this with JavaScript projects?**  
A: Yes! The generated types work with JSDoc annotations for type checking in JavaScript.

**Q: Does this work with OpenAPI 2.0 (Swagger)?**  
A: Yes! The underlying `openapi-typescript` package supports both OpenAPI 2.0 and 3.0+.

**Q: Can I customize the generated code?**  
A: The operations are auto-generated, but you can extend the client with additional methods and interceptors.

**Q: Do I need to commit `.tasc/` to git?**  
A: Yes! Committing generated files ensures team synchronization and CI/CD compatibility. Add them to version control.

**Q: Can I use multiple config files?**  
A: Currently, one `tasc.config.ts` per project. However, you can create multiple API client instances for different APIs.

**Q: Does this support GraphQL?**  
A: No, TASC-TS is designed specifically for REST APIs with OpenAPI/Swagger specifications.

**Q: What happens if my API changes?**  
A: Run `tasc generate` to regenerate types, or use `tasc watch` during development for automatic updates.

**Q: Can I use this in a monorepo?**  
A: Yes! Each package can have its own `tasc.config.ts` and generated types.

**Q: Is this compatible with React Native?**  
A: Yes! The client uses Axios under the hood, which works great with React Native.

**Q: How do I handle different environments (dev/staging/prod)?**  
A: Use environment variables in your config:
```typescript
const config: ConfigOptions = {
  api_doc_url: process.env.API_DOC_URL || 'http://localhost:8080/openapi.json',
  // ...
};
```

---

<div align="right">
  <a href="#-table-of-contents">⬆ Back to top</a>
</div>

## 🛠️ Recommended Package Scripts

Add these scripts to your `package.json` for convenience:

```json
{
  "scripts": {
    "api:init": "tasc init",
    "api:generate": "tasc generate",
    "api:watch": "tasc watch",
    "api:config": "tasc config"
  }
}
```

Then use them:

```bash
npm run api:generate    # Generate types once
npm run api:watch       # Watch for changes
npm run api:config      # View current config
```

---

<div align="right">
  <a href="#-table-of-contents">⬆ Back to top</a>
</div>

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Development Setup

```bash
# Clone the repository
git clone https://github.com/oddFEELING/Typed-Api-Schema-Client.git
cd tasc-ts

# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev
```

### Guidelines

- Follow existing code style
- Add tests for new features
- Update documentation
- Keep commits atomic and descriptive

### Submitting Changes

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

<div align="right">
  <a href="#-table-of-contents">⬆ Back to top</a>
</div>

## 📄 License

This project is licensed under the **ISC License**.

---

<div align="right">
  <a href="#-table-of-contents">⬆ Back to top</a>
</div>

## 🙏 Acknowledgments

Built with:
- [openapi-typescript](https://github.com/drwpow/openapi-typescript) - For OpenAPI type generation
- [Axios](https://github.com/axios/axios) - For HTTP client functionality
- [Commander.js](https://github.com/tj/commander.js) - For CLI framework
- [tsx](https://github.com/esbuild-kit/tsx) - For TypeScript config file support

---

## 📊 Stats

![npm](https://img.shields.io/npm/dt/tasc-ts)
![GitHub stars](https://img.shields.io/github/stars/oddFEELING/Typed-Api-Schema-Client)
![GitHub issues](https://img.shields.io/github/issues/oddFEELING/Typed-Api-Schema-Client)

---

<div align="center">

**Made with ❤️ by [oddFEELING](https://github.com/oddFEELING)**

[Report Bug](https://github.com/oddFEELING/Typed-Api-Schema-Client/issues) · [Request Feature](https://github.com/oddFEELING/Typed-Api-Schema-Client/issues) · [Documentation](https://github.com/oddFEELING/Typed-Api-Schema-Client/wiki)

</div>

