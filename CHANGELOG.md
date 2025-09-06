# Changelog

All notable changes to this project will be documented in this file.

## [0.1.0-next.4] - 2025-09-06

### Added

- **Build directory support**: Router now automatically detects and uses `dist/routes` when a `dist` directory exists for built applications
- **Enhanced route loading**: Added `handler.default` fallback support for better ES module compatibility

### Enhanced

- **Route path mapping**: Improved handling of index files - `index.js`/`index.ts` now correctly maps to root path `/`
- **Error messaging**: Updated router 404 error message from generic "Not Found" to more specific "Route Not Found"

### Changed

- **Breaking**: Default application port changed from `3000` to `5000`
- **Breaking**: Context response method signatures updated - [`json()`](src/types/core.ts:119), [`html()`](src/types/core.ts:120), [`text()`](src/types/core.ts:121) methods no longer return `this` in interface
- **Type system simplification**: Removed `Registry` namespace complexity, [`Context.service()`](src/types/core.ts:125) now accepts plain `string` parameter
- Version bumped to 0.1.0-next.4

## [0.1.0-next.3] - 2025-09-06

### Enhanced

- **Request body parsing**: Modernized [`Context.body()`](src/lib/core/Context.ts:144) method using async iterators instead of event-based approach for better performance and reliability
- **Buffer handling**: Improved content type detection and processing for JSON, form-urlencoded, and raw binary data
- **Response headers**: Fixed header writing mechanism in [`Context._send()`](src/lib/core/Context.ts:185) using `writeHead` with spread operator for better compatibility

### Changed

- **Breaking**: Body parsing implementation changed from Promise-based event handling to async iterator pattern using `for await (const chunk of this.req)`
- File naming standardized to PascalCase: `context.ts` → `Context.ts`
- Version bumped to 0.1.0-next.3

### Fixed

- Response header corruption issues in high-concurrency scenarios
- Better error handling for malformed request bodies

## [0.1.0-next.2] - 2025-09-06

### Added

- **Enhanced logging system**: Complete refactor of [`Logger`](src/lib/utils/logger.ts) class with colored console output, request tracking, and context support
- **Color utilities**: New [`colorText`](src/lib/utils/color.ts) utility for terminal color formatting
- **Route-specific middleware**: Added support for middleware arrays on individual routes in [`IApplication`](src/types/core.ts) interface
- **Middleware utilities**: New [`defineMiddlewares`](src/lib/middleware/index.ts) helper function for middleware composition
- **Type safety improvements**: Added `Registry` namespace for service name typing and better service resolution

### Enhanced

- **Static file serving**: Improved [`FileServer`](src/lib/utils/file-server.ts) with better root path handling and enhanced MIME type detection using mime library
- **Development tools**: Enhanced dev servers with improved logging using the new Logger class and added node_modules to ignored files
- **Request logging**: Simplified [`RequestLogger`](src/lib/utils/request-logger.ts) to use new logger tracking system
- **Router interface**: Added `handle` method to [`IRouter`](src/types/router.ts) interface
- **API documentation**: Added `app.handler(req, res)` method documentation to README

### Fixed

- Removed debug console.log statements from static middleware
- Better handling of root path requests (no longer sends 404 for root)
- Cleaned up tsconfig.json formatting

### Changed

- **Breaking**: Renamed `handleRequest` to `handler` in [`IApplication`](src/types/core.ts) interface
- Version bumped to 0.1.0-next.2
- Logger now supports colored status codes and better request tracking
- Development servers now use structured logging instead of console.log

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
