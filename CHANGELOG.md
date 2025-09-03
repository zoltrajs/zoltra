# Changelog

## [0.1.0-next.1] - 2025-03-09

### Added

- Initial implementation of Zoltra web framework core architecture.
- File-based routing system with automatic route discovery ([src/lib/core/router.ts](src/lib/core/router.ts)).
- Static file serving middleware and file server utility ([src/lib/middleware/static-middleware.ts](src/lib/middleware/static-middleware.ts), [src/lib/utils/file-server.ts](src/lib/utils/file-server.ts)).
- Middleware stack with support for global and route-specific middleware ([src/lib/middleware/stack.ts](src/lib/middleware/stack.ts)).
- Built-in middleware: CORS ([src/lib/middleware/cors.ts](src/lib/middleware/cors.ts)), JSON parser ([src/lib/middleware/json-parser.ts](src/lib/middleware/json-parser.ts)), error logger ([src/lib/utils/error-logger.ts](src/lib/utils/error-logger.ts)), and request logger ([src/lib/utils/request-logger.ts](src/lib/utils/request-logger.ts)).
- Plugin system with lifecycle hooks ([src/lib/plugins/manger.ts](src/lib/plugins/manger.ts)).
- Dependency injection container ([src/lib/di/container.ts](src/lib/di/container.ts)).
- Environment variable manager ([src/lib/utils/env.ts](src/lib/utils/env.ts)).
- Logger utility ([src/lib/utils/logger.ts](src/lib/utils/logger.ts)).
- CLI with commands for starting and developing applications ([src/cli/index.ts](src/cli/index.ts), [src/cli/commands/start.ts](src/cli/commands/start.ts), [src/cli/commands/dev.ts](src/cli/commands/dev.ts), [src/cli/commands/dev-ts.ts](src/cli/commands/dev-ts.ts)).
- Testing utilities: assertion, HTTP client, and test runner ([src/lib/testing/assert.ts](src/lib/testing/assert.ts), [src/lib/testing/http-client.ts](src/lib/testing/http-client.ts), [src/lib/testing/runner.ts](src/lib/testing/runner.ts)).
- Type definitions for core, middleware, plugins, router, testing, and utilities ([src/types/](src/types/)).

### Changed

- N/A (Initial release)

### Fixed

- N/A (Initial release)

---
