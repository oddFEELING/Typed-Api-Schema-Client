# Documentation Plan for TASC-TS

## 📋 Overview
This plan outlines the complete documentation structure for the Typed API Schema Client (tasc-ts) npm package. The documentation will be organized to serve both end-users and maintainers.

---

## 🎯 Documentation Structure

### **1. HERO SECTION**
**Purpose:** Quick value proposition and installation

**Content:**
- Package name and tagline
- Badges (npm version, downloads, license, build status)
- One-line description
- Key features (3-4 bullet points)
- Quick install command
- 30-second code example

**Example:**
```markdown
# 🔷 TASC-TS
> Typed API Schema Client - Generate type-safe API clients from OpenAPI specs

[![npm version](https://badge.fury.io/js/tasc-ts.svg)](...)
[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](...)

Transform your OpenAPI specification into a fully-typed, production-ready API client with one command.

✨ **Features:**
- 🎯 Full TypeScript type safety from OpenAPI specs
- 🔄 Auto-generate types and operations
- 🎨 Configurable interceptors and authentication
- 👀 Watch mode for live development

npm install tasc-ts
```

---

### **2. QUICK START**
**Purpose:** Get users running in under 5 minutes

**Sections:**
1. **Installation** (single command)
2. **Initialize** (tasc init)
3. **Configure** (edit config)
4. **Generate** (tasc generate)
5. **Use** (simple code example)

**Code Examples:**
```bash
# 1. Install
npm install tasc-ts

# 2. Initialize
npx tasc init

# 3. Configure (edit tasc.config.ts)
# ... user edits config ...

# 4. Generate types
npx tasc generate
```

```typescript
// 5. Create API client
import { createApiClient } from 'tasc-ts';
import type { paths } from './.tasc/types';

export const api = createApiClient<paths>({
  baseURL: 'https://api.example.com',
  interceptors: {
    request: (config) => {
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    }
  }
});

// Use it!
const user = await api.get('/users/{id}', { id: '123' });
const data = await api.op.getUserById({ id: '123' }); // operation-based
```

---

### **3. CONFIGURATION**
**Purpose:** Comprehensive config reference

**Sections:**

#### 3.1 Config File Overview
- File location: `tasc.config.ts`
- Type: `ConfigOptions`
- TypeScript support

#### 3.2 Configuration Options Reference Table

| Option | Type | Required | Default | Description |
|--------|------|----------|---------|-------------|
| `api_doc_url` | string | No | `http://localhost:8080/doc/openapi.json` | OpenAPI spec URL |
| `environment` | string | No | `development` | Environment type |
| `poll_interval_ms` | number | No | `5000` | Watch mode interval |
| `outputs.base_path` | string | No | `""` | Base path prefix |
| `outputs.dir` | string | No | `""` | Override directory |
| ... | ... | ... | ... | ... |

#### 3.3 Path Resolution Logic
**Detailed explanation with examples:**

```typescript
// Example 1: Default (no config)
outputs: {} 
// Result: .tasc/types.ts, .tasc/operations.ts, .tasc/openapi.json

// Example 2: With base_path
outputs: { base_path: "src" }
// Result: src/.tasc/types.ts, src/.tasc/operations.ts

// Example 3: With dir (overrides all)
outputs: { dir: "generated" }
// Result: generated/types.ts, generated/operations.ts

// Example 4: base_path + dir
outputs: { base_path: "src", dir: "api" }
// Result: src/api/types.ts, src/api/operations.ts

// Example 5: Custom individual paths
outputs: { 
  base_path: "src",
  api_types: "types/api.ts",
  api_operations: "lib/operations.ts"
}
// Result: src/types/api.ts, src/lib/operations.ts
```

#### 3.4 Full Config Example
Complete, annotated config with all options

---

### **4. CLI REFERENCE**
**Purpose:** Complete CLI command documentation

#### 4.1 `tasc init`
```bash
Usage: tasc init [options]

Options:
  -f, --force    Overwrite existing config file
  -h, --help     Display help

Examples:
  tasc init              # Create config
  tasc init --force      # Overwrite existing
```

#### 4.2 `tasc config`
```bash
Usage: tasc config

Description:
  Display current configuration

Example:
  tasc config
```

#### 4.3 `tasc generate`
```bash
Usage: tasc generate

Description:
  Generate types and operations once

Steps performed:
  1. Fetch OpenAPI spec from api_doc_url
  2. Save to outputs.doc_file
  3. Generate TypeScript types
  4. Generate API operations

Example:
  tasc generate
```

#### 4.4 `tasc watch`
```bash
Usage: tasc watch

Description:
  Watch for API changes and regenerate

Features:
  - Polls API every poll_interval_ms
  - Detects changes via SHA-256 hash
  - Only regenerates on changes
  - Graceful shutdown (Ctrl+C)

Example:
  tasc watch
```

---

### **5. API CLIENT GUIDE**
**Purpose:** How to use the generated API client

#### 5.1 Creating a Client Instance

```typescript
import { createApiClient } from 'tasc-ts';
import type { paths } from './.tasc/types';

export const api = createApiClient<paths>({
  baseURL: process.env.API_URL,
  timeout: 10000,
  withCredentials: true,
  headers: {
    'X-Custom-Header': 'value'
  }
});
```

#### 5.2 Path-Based API
```typescript
// GET request
const user = await api.get('/users/{id}', { id: '123' });

// POST request
const newUser = await api.post('/users', {
  name: 'John',
  email: 'john@example.com'
});

// With query parameters
const users = await api.get('/users', {
  params: { limit: 10, offset: 0 }
});
```

#### 5.3 Operation-Based API
```typescript
// Using operationId from OpenAPI spec
const user = await api.op.getUserById({ id: '123' });
const users = await api.op.listUsers({ params: { limit: 10 } });
```

#### 5.4 Authentication Examples

##### Bearer Token
```typescript
export const api = createApiClient<paths>({
  baseURL: process.env.API_URL,
  interceptors: {
    request: (config) => {
      const token = localStorage.getItem('auth_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }
  }
});
```

##### API Key
```typescript
export const api = createApiClient<paths>({
  baseURL: process.env.API_URL,
  headers: {
    'X-API-Key': process.env.API_KEY!
  }
});
```

##### OAuth with Refresh
```typescript
export const api = createApiClient<paths>({
  baseURL: process.env.API_URL,
  interceptors: {
    request: async (config) => {
      let token = getAccessToken();
      if (isTokenExpired(token)) {
        token = await refreshToken();
      }
      config.headers.Authorization = `Bearer ${token}`;
      return config;
    },
    responseError: async (error) => {
      if (error.response?.status === 401) {
        // Handle token refresh
        await handleUnauthorized();
      }
      return Promise.reject(error);
    }
  }
});
```

#### 5.5 Error Handling
```typescript
try {
  const user = await api.get('/users/{id}', { id: '123' });
} catch (error) {
  if (axios.isAxiosError(error)) {
    console.error('Status:', error.response?.status);
    console.error('Data:', error.response?.data);
  }
}
```

#### 5.6 Type Extraction
```typescript
import type { 
  ApiRequestBody, 
  ApiResponseData,
  ApiPathParams,
  ApiQueryParams 
} from 'tasc-ts';
import type { paths } from './.tasc/types';

// Extract request body type
type CreateUserInput = ApiRequestBody<paths, '/users', 'post'>;

// Extract response type
type UserResponse = ApiResponseData<paths, '/users/{id}', 'get'>;

// Extract path params
type UserPathParams = ApiPathParams<paths, '/users/{id}'>;

// Extract query params
type UsersQueryParams = ApiQueryParams<paths, '/users', 'get'>;
```

---

### **6. ARCHITECTURE**
**Purpose:** For maintainers and contributors

#### 6.1 Project Structure
Visual tree with descriptions

#### 6.2 Module Responsibilities

**Core (`src/core/`)**
- `api-client.ts` - Generic API client factory
- `config.ts` - Type definitions for configuration
- `types.ts` - Shared type re-exports

**CLI (`src/cli/`)**
- `index.ts` - CLI entry point using Commander
- `commands/init.ts` - Scaffold config file
- `commands/config.ts` - Display configuration
- `commands/generate.ts` - One-time generation
- `commands/watch.ts` - Continuous polling

**Generator (`src/generator/`)**
- `fetch.ts` - HTTP fetching and saving
- `types.ts` - TypeScript type generation via openapi-typescript
- `operations.ts` - Operation function generation
- `index.ts` - Orchestration and exports

**Utils (`src/utils/`)**
- `config-loader.ts` - Config file discovery and loading (supports .ts via tsx)
- `path-resolver.ts` - Smart path resolution with base_path and dir support

**Scripts (`src/scripts/`)**
- Legacy standalone scripts (backward compatibility)

#### 6.3 Data Flow Diagrams

```
User runs: tasc generate
    ↓
CLI parses command
    ↓
Load config (config-loader.ts)
    ↓
Resolve paths (path-resolver.ts)
    ↓
Fetch OpenAPI spec (generator/fetch.ts)
    ↓
Generate types (generator/types.ts → openapi-typescript)
    ↓
Generate operations (generator/operations.ts)
    ↓
Done!
```

#### 6.4 Type System Architecture
How the generic types work with OpenAPI paths

---

### **7. PACKAGE.JSON SCRIPTS**
**Purpose:** Recommended scripts for user projects

```json
{
  "scripts": {
    "api:generate": "tasc generate",
    "api:watch": "tasc watch",
    "api:init": "tasc init"
  }
}
```

---

### **8. EXAMPLES**
**Purpose:** Real-world use cases

#### 8.1 Next.js Integration
```typescript
// src/lib/api-client.ts
import { createApiClient } from 'tasc-ts';
import type { paths } from '@/.tasc/types';

export const api = createApiClient<paths>({
  baseURL: process.env.NEXT_PUBLIC_API_URL,
  interceptors: {
    request: (config) => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (token) config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    }
  }
});
```

#### 8.2 React Query Integration
```typescript
// hooks/useUser.ts
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api-client';

export function useUser(id: string) {
  return useQuery({
    queryKey: ['user', id],
    queryFn: () => api.op.getUserById({ id })
  });
}
```

#### 8.3 Express.js Backend
```typescript
import { createApiClient } from 'tasc-ts';
import type { paths } from './.tasc/types';

const api = createApiClient<paths>({
  baseURL: process.env.INTERNAL_API_URL,
  timeout: 5000
});

app.get('/proxy/users/:id', async (req, res) => {
  const user = await api.get('/users/{id}', { id: req.params.id });
  res.json(user.data);
});
```

#### 8.4 Testing with Vitest
```typescript
import { describe, it, expect, vi } from 'vitest';
import { createApiClient } from 'tasc-ts';
import type { paths } from './.tasc/types';

describe('API Client', () => {
  it('should fetch user', async () => {
    const api = createApiClient<paths>({
      baseURL: 'http://localhost:3000'
    });
    
    const response = await api.get('/users/{id}', { id: '123' });
    expect(response.data).toBeDefined();
  });
});
```

---

### **9. ADVANCED USAGE**
**Purpose:** Power user features

#### 9.1 Custom Path Resolution
```typescript
import { resolveOutputPath } from 'tasc-ts';

const config = { 
  outputs: { 
    base_path: 'src', 
    dir: 'generated' 
  } 
};

const typesPath = resolveOutputPath(config, 'api_types', 'types.ts');
// Result: src/generated/types.ts
```

#### 9.2 Programmatic Generation
```typescript
import { loadConfig, runGeneration } from 'tasc-ts';

const config = await loadConfig();
await runGeneration(config, {
  info: (msg) => logger.info(msg),
  error: (msg) => logger.error(msg),
  success: (msg) => logger.success(msg)
});
```

#### 9.3 Multiple API Clients
```typescript
// Primary API
export const api = createApiClient<paths>({
  baseURL: process.env.API_URL
});

// Admin API
import type { paths as adminPaths } from './.tasc/admin-types';
export const adminApi = createApiClient<adminPaths>({
  baseURL: process.env.ADMIN_API_URL,
  headers: { 'X-Admin-Key': process.env.ADMIN_KEY }
});
```

---

### **10. TROUBLESHOOTING**
**Purpose:** Common issues and solutions

#### 10.1 Common Issues

**Issue: "Cannot find module 'tasc-ts'"**
```bash
# Solution
npm install tasc-ts
```

**Issue: "Config file not found"**
```bash
# Solution
npx tasc init
```

**Issue: "Failed to fetch API spec"**
```bash
# Check:
1. Is your API server running?
2. Is the api_doc_url correct in tasc.config.ts?
3. Are there CORS issues?
```

**Issue: "TypeScript config files not loading"**
```bash
# tsx is required for .ts config files
npm install tsx
```

**Issue: "Generated types not updating"**
```bash
# Force regeneration
rm -rf .tasc/
npx tasc generate
```

#### 10.2 Debug Mode
```bash
# Enable verbose logging
LOG_LEVEL=debug npx tasc generate
```

---

### **11. COMPARISON**
**Purpose:** Why choose tasc-ts?

| Feature | tasc-ts | openapi-typescript-codegen | swagger-typescript-api |
|---------|---------|---------------------------|------------------------|
| Type safety | ✅ Full | ✅ Full | ✅ Full |
| Watch mode | ✅ Built-in | ❌ Manual | ❌ Manual |
| Configurable | ✅ Interceptors | ⚠️ Limited | ⚠️ Limited |
| Operation IDs | ✅ Yes | ✅ Yes | ✅ Yes |
| Path-based API | ✅ Yes | ❌ No | ❌ No |
| Zero config | ✅ Yes | ❌ Complex | ❌ Complex |

---

### **12. API REFERENCE**
**Purpose:** Complete API documentation

#### 12.1 `createApiClient<T>(config)`
**Type signature:**
```typescript
function createApiClient<T = Record<string, any>>(
  config?: ApiClientConfig
): ApiClient<T>
```

**Parameters:**
- `config` (optional) - Client configuration object

**Returns:**
- API client instance with typed HTTP methods

**Example:**
```typescript
const api = createApiClient<paths>({ 
  baseURL: 'https://api.example.com' 
});
```

#### 12.2 `ApiClientConfig`
**Interface:**
```typescript
interface ApiClientConfig {
  baseURL?: string;
  withCredentials?: boolean;
  timeout?: number;
  headers?: Record<string, string>;
  interceptors?: {
    request?: (config) => config | Promise<config>;
    requestError?: (error) => any;
    response?: (response) => response | Promise<response>;
    responseError?: (error) => any;
  };
  axiosConfig?: AxiosRequestConfig;
}
```

#### 12.3 HTTP Methods
Detail each method: `get`, `post`, `put`, `delete`, `patch`

#### 12.4 Utility Types
- `ApiRequestBody<T, P, M>`
- `ApiResponseData<T, P, M, Status>`
- `ApiPathParams<T, P>`
- `ApiQueryParams<T, P, M>`

---

### **13. CONTRIBUTING GUIDE**
**Purpose:** For open-source contributors

#### 13.1 Development Setup
```bash
git clone https://github.com/oddFEELING/Typed-Api-Schema-Client.git
cd tasc-ts
npm install
npm run build
```

#### 13.2 Project Structure Explained
Deep dive into each directory

#### 13.3 Adding New Features
Guidelines for:
- Adding CLI commands
- Adding generator features
- Extending the API client

#### 13.4 Testing Guidelines
```bash
npm test                    # Run tests
npm run test:watch         # Watch mode
npm run test:coverage      # Coverage report
```

#### 13.5 Code Style
- TypeScript strict mode
- ESLint rules
- Prettier formatting
- Comment standards

---

### **14. MIGRATION GUIDES**

#### 14.1 From v0.0.x to v1.0.0
Breaking changes and migration steps

#### 14.2 From Other Tools
- From openapi-typescript-codegen
- From swagger-typescript-api

---

### **15. FAQ**
**Purpose:** Quick answers to common questions

**Q: Can I use this with JavaScript projects?**
A: Yes! The generated types work with JSDoc annotations.

**Q: Does this work with OpenAPI 2.0 (Swagger)?**
A: Yes, openapi-typescript supports both 2.0 and 3.0+.

**Q: Can I customize the generated code?**
A: The operations are generated, but you can extend the client.

**Q: Do I need to commit .tasc/ to git?**
A: Yes! This ensures team sync and CI/CD compatibility.

**Q: Can I use multiple config files?**
A: Currently one per project, but you can create multiple clients.

**Q: Does this support GraphQL?**
A: No, only REST APIs with OpenAPI/Swagger specs.

---

### **16. CHANGELOG**
**Purpose:** Version history

Format:
```markdown
## [0.0.1] - 2024-10-07
### Added
- Initial release
- CLI commands: init, config, generate, watch
- Generic API client factory
- TypeScript type generation
- Operation-based API methods

### Changed
- N/A (initial release)

### Fixed
- N/A (initial release)
```

---

### **17. LICENSE & CREDITS**
**Purpose:** Legal and attribution

- License type (ISC)
- Author information
- Dependencies acknowledgment
- Contributing link

---

## 📚 Documentation Organization

### **README.md Structure:**
1. Hero Section (1-2)
2. Quick Start (2)
3. Configuration (3)
4. CLI Reference (4)
5. API Client Guide (5)
6. Examples (8)
7. API Reference (12)
8. Troubleshooting (10)
9. FAQ (15)
10. Contributing (link to CONTRIBUTING.md)
11. License (17)

### **Separate Wiki Pages:**
1. **Home** - Overview and quick links
2. **Installation** - Detailed setup
3. **Configuration** - Full config reference
4. **CLI Commands** - Complete CLI docs
5. **API Client** - Usage guide
6. **Examples** - Real-world examples
7. **Architecture** - For maintainers
8. **Contributing** - Contribution guide
9. **Troubleshooting** - Common issues
10. **Migration** - Upgrade guides

### **Additional Files:**

**CONTRIBUTING.md**
- Development setup
- Code style guide
- PR process
- Testing requirements

**ARCHITECTURE.md**
- Detailed architecture
- Module dependencies
- Design decisions
- Type system explanation

**EXAMPLES/**
- `next-js/` - Next.js example
- `react-query/` - React Query example
- `express/` - Express example
- `testing/` - Testing example

---

## 🎨 Documentation Style Guide

### **Code Blocks:**
- Always specify language: ```typescript, ```bash, ```json
- Include comments for clarity
- Show complete, runnable examples
- Highlight key lines when helpful

### **Tone:**
- Friendly and conversational
- Clear and concise
- Beginner-friendly with advanced sections
- Use emojis sparingly for visual markers

### **Structure:**
- Use proper heading hierarchy (H1 → H2 → H3)
- Include table of contents for long sections
- Cross-link related sections
- Include "back to top" links in long docs

### **Examples:**
- Start simple, increase complexity
- Show both basic and advanced usage
- Include expected output when helpful
- Cover common use cases first

---

## 📊 Documentation Metrics

### **Success Criteria:**
- ✅ User can get started in < 5 minutes
- ✅ All CLI commands have examples
- ✅ All config options documented
- ✅ At least 3 real-world examples
- ✅ Troubleshooting covers 80% of issues
- ✅ API reference is complete
- ✅ Architecture is clear for maintainers

### **Maintenance:**
- Update on every feature addition
- Add examples for new use cases
- Keep troubleshooting section current
- Version all breaking changes

---

## 🚀 Implementation Order

1. **Phase 1: Essential Docs** (README.md)
   - Hero section
   - Quick start
   - Basic configuration
   - CLI reference

2. **Phase 2: Usage Docs**
   - API client guide
   - Common examples
   - Type extraction

3. **Phase 3: Advanced Docs**
   - Architecture guide
   - Contributing guide
   - Full API reference

4. **Phase 4: Wiki & Examples**
   - Set up GitHub wiki
   - Create example projects
   - Add troubleshooting guides

---

## 📝 Writing Guidelines

### **For README.md:**
- Keep it scannable (use headings, lists, code blocks)
- Front-load the most important info
- Include visual separators
- Link to detailed wiki pages for deep dives

### **For Wiki Pages:**
- One topic per page
- Include navigation links
- Use consistent formatting
- Add diagrams where helpful

### **For Code Comments:**
- JSDoc format for all public APIs
- Explain WHY not just WHAT
- Include usage examples in complex functions
- Link to related documentation

---

## 🎯 Next Steps

1. Generate README.md from this plan
2. Create CONTRIBUTING.md
3. Create ARCHITECTURE.md  
4. Set up GitHub Wiki
5. Create example projects
6. Add badges and shields
7. Set up automated docs deployment
8. Create video tutorials (optional)

---

**This plan provides a complete roadmap for world-class documentation that serves both users and maintainers effectively.**

