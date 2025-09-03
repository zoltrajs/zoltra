# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0-next.1] - 2025-09-03

### Overview

This release captures the initial, foundational implementation of the Zoltra framework new architecture. It provides a minimal but complete set of building blocks for creating HTTP applications: routing, middleware, plugin lifecycle, dependency injection, CLI tooling, and basic testing utilities.

### Added

- Core application bootstrap and context management ([src/lib/core/app.ts](src/lib/core/app.ts), [src/lib/core/context.ts](src/lib/core/context.ts)).
- File-based router with automatic route discovery and helper utilities ([src/lib/core/router.ts](src/lib/core/router.ts)).
- Middleware stack abstraction supporting global and route-level middleware ([src/lib/middleware/stack.ts](src/lib/middleware/stack.ts)).
- Built-in middleware implementations:
  - CORS handler ([src/lib/middleware/cors.ts](src/lib/middleware/cors.ts)).
  - JSON body parser ([src/lib/middleware/json-parser.ts](src/lib/middleware/json-parser.ts)).
  - Static file serving middleware and low-level file server utility ([src/lib/middleware/static-middleware.ts](src/lib/middleware/static-middleware.ts), [src/lib/utils/file-server.ts](src/lib/utils/file-server.ts)).
- Plugin manager with lifecycle hooks (register, init, teardown) ([src/lib/plugins/manger.ts](src/lib/plugins/manger.ts)).
- Lightweight dependency injection container for wiring services ([src/lib/di/container.ts](src/lib/di/container.ts)).
- CLI utilities and commands to run and develop apps locally ([src/cli/index.ts](src/cli/index.ts), [src/cli/commands/\*.ts](src/cli/commands/)).
- Developer-friendly utilities: environment loader, structured logger, request/error loggers ([src/lib/utils/\*.ts](src/lib/utils/*.ts)).
- Basic testing helpers: assertion helpers, HTTP test client, and a test runner ([src/lib/testing/\*.ts](src/lib/testing/*.ts)).
- Type definitions for core concepts, middleware, plugins, router and tests (`src/types/`).

### Why this matters

- Routing and middleware provide a familiar, composable surface for building HTTP handlers.
- Plugins and DI enable extension and inversion of control for apps and libraries built on top of Zoltra.
- CLI and testing utilities reduce friction for iteration and automated checks.

### Usage notes

- This is the initial release — APIs are subject to change.

### Known limitations

- No backward-compatibility guarantees yet. Expect API churn as the project stabilizes.
- Edge cases around streaming request bodies and advanced content-negotiation are not fully implemented.
