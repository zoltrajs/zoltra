# Zoltra

A fast, file-based JavaScript web server framework built for Node.js 18+ with enterprise-grade features.

> **Note — experimental `next` branch:** This README describes the `next` branch. The API and features here are experimental and may change without notice. Many features are incomplete and not yet stable. Use for evaluation and testing only; avoid production deployments unless you accept breaking changes.

## Table of Contents

- [Features](#features)
- [Quick Start](#quick-start)
  - [Installation](#installation)
  - [Basic usage](#basic-usage)
- [Development features](#development-features)
  - [Hot reloading & file watching](#hot-reloading--file-watching)
- [Routing](#routing)
  - [File-based routing](#file-based-routing)
  - [Static routes](#static-routes)
- [Middleware](#middleware)
- [Dependency injection](#dependency-injection)
- [Plugins](#plugins)
- [API reference](#api-reference)
  - [Application](#application)
  - [Context](#context)

---

<a name="features"></a>

## ✨ Features

- 🚀 **File-based routing** — Define routes using the file system
- ⚡ **Fast development server** — Hot reload and development-friendly features
- 🛠️ **Middleware support** — Express-compatible middleware system via context passing
- 🔌 **Plugin architecture** — Extensible with hooks and lifecycle events
- 💉 **Dependency injection** — Built-in service container with singleton/transient scopes
- 🔧 **Auto environment loading** — Automatic `.env` file loading with type coercion
- 🧪 **Built-in testing** — Integrated testing framework with HTTP client
- 📁 **Static file serving** — High-performance static file handling with streaming
- 📊 **Professional logging** — Structured logging with multiple levels and formats
- 🛡️ **Advanced error handling** — Comprehensive error tracking and reporting
- 🔄 **Port auto-increment** — Automatic port incrementation when ports are in use
- 📈 **Health monitoring** — Built-in health checks and server metrics
- 🔌 **WebSocket support** — Built-in WebSocket server with event handling and broadcasting

<a name="quick-start"></a>

## Quick Start

<a name="installation"></a>

### Installation

```bash
npm install zoltra@next
```

<a name="basic-usage"></a>

### Basic usage

Create an `app.js` file:

```javascript
import { Application } from "zoltra";

const app = new Application();

app.listen(5000);
```

<a name="development-features"></a>

## Development features

<a name="hot-reloading--file-watching"></a>

### Hot reloading & file watching

The development server automatically watches for file changes and restarts the server:

```bash
npm run dev  # start with hot reloading enabled
```

What gets watched:

- Project files at the repository root (e.g., source and config files)
- The `.env` file (environment changes trigger reload)

Features:

- 🔥 Auto-restart on file changes
- 🌍 Environment watching — reloads when `.env` changes
- 📝 Debounced restarts to prevent excessive reloads
- 🚀 Fast restarts optimized for development workflow

<a name="routing"></a>

## Routing

<a name="file-based-routing"></a>

### File-based routing

Create routes in the `routes/` directory:

```javascript
// routes/index.js
export default function handler(context) {
  return context.json({ message: 'Hello World!' });
}

// routes/users/[id].js
export default async function handler(context) {
  const userId = context.params.id;
  return context.json({ userId, name: `User ${userId}` });
}

// routes/auth/login.js
export async function POST(context){
  const { email, password } = await context.body();
  // Or `context.validatedBody` when validateBody([...]) middleware is used
  const { email, password } = context.validatedBody;
  //...
}
```

<a name="static-routes"></a>

### Static routes

```javascript
const app = new Application();

// GET route
app.get("/api/users", (context) => {
  return context.json({ users: [] });
});

// POST route
app.post("/api/users", async (context) => {
  const userData = await context.body();
  return context.status(201).json({ created: userData });
});
```

<a name="middleware"></a>

## Middleware

```javascript
import { Application, cors } from "zoltra";

const app = new Application();

// Add middleware
app.use(cors());
```

Is Zoltra compatible with Express middleware?

Yes — Zoltra supports middleware that is conceptually similar to Express, but the middleware signature and context are different.

Example (Express):

```js
const app = express();
app.use(cors());
```

Example (Zoltra):

```js
import { Application, cors } from "zoltra";

const app = new Application();
app.use(cors()); // Note: Zoltra also provides CORS middleware
```

Middleware parameters:

- Express: `(req, res, next)` — Node request/response objects and next callback
- Zoltra: `(context, next)` — `context` is a Zoltra `Context` object; `next` is a `NextFunction` (or `() => Promise<void>`) to continue the chain

Example (using Express middleware in Zoltra):

```js
import cors from "cors";
import { Application } from "zoltra";

const app = new Application();
app.use((context, next) => cors()(context.req, context.res, next));
```

<a name="dependency-injection"></a>

## Dependency injection

```javascript
// Register services
app.service("database", {
  findUser: (id) => ({ id, name: `User ${id}` }),
});

// Use in routes
app.get("/users/:id", (context) => {
  const db = context.service("database");
  const user = db.findUser(context.params.id);
  return context.json(user);
});
```

<a name="api-reference"></a>

## API reference

<a name="application"></a>

### Application

- `app.use(middleware)` — Add middleware
- `app.get(path, handler)` — Add GET route
- `app.post(path, handler)` — Add POST route
- `app.put(path, handler)` — Add PUT route
- `app.delete(path, handler)` — Add DELETE route
- `app.service(name, service)` — Register DI service
- `app.plugin(plugin)` — Register plugin
- `app.ws(event, handler)` - Register a WebSocket event handler
- `app.broadcast(data, filter)` - Broadcast a message to all WebSocket clients
- `app.handler(req, res)` - Core request handler
- `app.listen(port, host)` — Start server

<a name="context"></a>

### Context

- `context.json(data)` — Send JSON response
- `context.html(html)` — Send HTML response
- `context.text(text)` — Send text response
- `context.status(code)` — Set status code
- `context.set(header, value)` — Set header
- `context.body()` — Parse request body
- `context.service(name)` — Get DI service
- `context.params` — Route parameters
- `context.throw(status, message, details)` - Throw new `ZoltraError`
