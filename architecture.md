# Zoltra Web Framework New Architecture

## Overview

Zoltra is a fast, file-based web server framework built for Node.js 18+. It combines the simplicity of file-based routing with powerful features like middleware, plugins, dependency injection.

## Core Architecture

### Application Class

The main entry point that orchestrates all components:

- Initializes router, middleware stack, plugin manager, and DI container
- Handles server startup and configuration
- Manages request/response lifecycle

### Router System

**File-Based Routing**

- Routes defined in `routes/` directory
- Nested folder structure maps to URL paths
- Dynamic routes with `[param]` syntax
- Layout files for shared functionality
- Automatic route discovery and loading

**Static Routing:**

- Traditional `app.get()`, `app.post()` methods
- Supports all HTTP methods
- Middleware integration per route

### Middleware System

- Express-compatible middleware interface
- Global and route-specific middleware
- Error handling middleware
- Built-in CORS, logging, compression middleware

### Plugin Architecture

- Hook system for extending framework functionality
- Lifecycle hooks: init, beforeRoute, afterRoute, shutdown
- Plugin registry and dependency management
- Built-in plugins for common features

### Dependency Injection Container

- Service registration and resolution
- Singleton and transient scopes
- Constructor injection
- Property injection support

### Development Server

- Fast file watching and hot reload
- Automatic route reloading
- Development middleware (logging, error pages)

### File Serving

- Static file serving from configurable directories
- MIME type detection
- Caching headers
- Directory listing (optional)

<!-- ### Serverless Support

- Platform adapters for AWS Lambda, Vercel, Netlify
- Request/response transformation
- Environment detection
- Cold start optimization -->

### Environment Management

- Automatic `.env` file loading
- Environment-specific configurations
- Validation and type coercion
- Secure environment variable handling

### Testing Framework

- Built-in test runner
- HTTP request testing utilities
- Mocking capabilities
- Integration with popular test frameworks

## Project Structure

```
zoltra/
├── src/                    # Core framework code
│   ├── core/
│   │   ├── app.ts
│   │   ├── router.ts
│   │   └── server.ts
│   ├── middleware/
│   ├── plugins/
│   ├── di/
|   ├── types/
│   └── utils/
└── examples/               # Example applications
```

## Request Flow

1. Request received by server
2. Global middleware executed
3. Route matched (file-based or static)
4. Route-specific middleware executed
5. Handler executed with DI services
6. Response middleware applied
7. Response sent to client

## Key Design Decisions

- **Node.js 18+**: Uses modern JavaScript features (ES modules, top-level await)
- **File-based routing**: Inspired by SvelteKit for developer experience
- **Plugin system**: Extensible architecture for custom functionality
<!-- - **Serverless-first**: Designed to work in serverless environments -->
- **Performance-focused**: Minimal overhead, fast routing, efficient middleware

## Component Interactions

```
┌─────────────────┐    ┌─────────────────┐
│   Application   │────│     Router      │
│                 │    │                 │
│ - init()        │    │ - match()       │
│ - start()       │    │ - loadRoutes()  │
│ - use()         │    │ - handle()      │
└─────────────────┘    └─────────────────┘
         │                       │
         │                       │
┌─────────────────┐    ┌─────────────────┐
│  Middleware     │────│    Plugins      │
│   Stack         │    │   Manager       │
│                 │    │                 │
│ - execute()     │    │ - register()    │
│ - add()         │    │ - hook()        │
└─────────────────┘    └─────────────────┘
         │                       │
         │                       │
┌─────────────────┐    ┌─────────────────┐
│     DI          │────│   Environment   │
│  Container      │    │   Manager       │
│                 │    │                 │
│ - register()    │    │ - load()        │
│ - resolve()     │    │ - get()         │
└─────────────────┘    └─────────────────┘
```

This architecture provides a solid foundation for building fast, scalable web applications with excellent developer experience.
