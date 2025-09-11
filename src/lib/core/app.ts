import { createServer, Server } from "http";
import { Router } from "./router";
import { Context } from "./context";
import { Container } from "../di/container";
import { EnvironmentManager } from "../utils/env";
import { Logger } from "../utils/logger";
import type {
  IMiddlewareStack,
  MiddlewareObject,
} from "../../types/middleware";
import { Handler } from "../../types/router";
import {
  ApplicationOptions,
  IApplication,
  Middleware,
  ServerInfo,
} from "../../types/core";
import { PluginManager } from "../plugins/manger";
import { ILogger } from "../../types/utils";
import { MiddlewareStack } from "../middleware/stack";
import { ErrorLogger } from "../utils/error-logger";
import { RequestLogger } from "../utils/request-logger";
import { CORSOptions, Plugin } from "../../types/plugin";
import { cors } from "../middleware/cors";
import { compress } from "../middleware/compression";
import { createHTTP2Server } from "./http2-server";
import { WebSocketManager } from "./websocket-server";
import { WebSocketHandler } from "../../types/websocket";

export class Application implements IApplication {
  public readonly options: ApplicationOptions;
  private readonly router: Router;
  public readonly middleware: IMiddlewareStack;
  public readonly plugins: PluginManager;
  public readonly container: Container;
  public readonly env: EnvironmentManager;
  public logger: ILogger;
  public readonly websocket: WebSocketManager;

  private server: Server | null;
  private isListening: boolean;
  private actualPort: number | null;
  private errors: Array<{
    timestamp: Date;
    method: string;
    path: string;
    error: string;
    stack?: string;
  }>;

  constructor(options: ApplicationOptions = {}) {
    this.options = {
      port: 5000,
      host: "localhost",
      routesDir: "./routes",
      publicDir: "./public",
      logLevel: "info",
      autoIncrementPort: true,
      maxPortAttempts: 5,
      ...options,
    };

    // Core components
    this.router = new Router();
    this.middleware = new MiddlewareStack();
    this.plugins = new PluginManager();
    this.container = new Container();
    this.env = new EnvironmentManager();

    // Logger
    this.logger = new Logger({
      level: this.options.logLevel,
      timestamp: true,
      colors: true,
      context: "App",
    });

    // Initialize WebSocket manager
    this.websocket = new WebSocketManager(this, this.options.websocket);

    // Server state
    this.server = null;
    this.isListening = false;
    this.actualPort = this.options.port ?? null;

    this.errors = [];

    // Initialize
    this._initialize();
  }

  /**
   * Initialize components
   */
  private async _initialize() {
    try {
      await this.env.load();

      this.container.register("app", this);
      this.container.register("router", this.router);
      this.container.register("env", this.env);
      this.container.register("logger", this.logger);

      this._addBuiltInMiddleware();

      // Add compression middleware if enabled
      if (this.options.compression?.enabled) {
        this.use(
          compress({
            level: this.options.compression.level,
            threshold: this.options.compression.threshold,
          })
        );
        this.logger.info("Response compression enabled");
      }

      await this.plugins.initialize(this);

      await this.router.loadRoutes();

      this.logger.info("Application initialized successfully");
    } catch (err: any) {
      this.logger.error("Failed to initialize application", {
        error: err.message,
        stack: err.stack,
      });
      throw err;
    }
  }

  private _addBuiltInMiddleware() {
    this.middleware.add(new ErrorLogger(this.logger));
    this.middleware.add(new RequestLogger(this.logger));
  }

  enableCors(options: CORSOptions = {}) {
    this.middleware.add(cors(options));
    return this;
  }

  use(middleware: Middleware | MiddlewareObject, options = {}): this {
    this.middleware.add(middleware, options);
    return this;
  }

  private _route(
    method: string,
    path: string,
    handler: Handler,
    ...middleware: (Middleware | MiddlewareObject)[]
  ): this {
    this.router.addRoute(method, path, handler, middleware);
    return this;
  }

  get(
    path: string,
    handler: Handler,
    ...middleware: (Middleware | MiddlewareObject)[]
  ): this {
    return this._route("GET", path, handler, ...middleware);
  }

  post(
    path: string,
    handler: Handler,
    ...middleware: (Middleware | MiddlewareObject)[]
  ): this {
    return this._route("POST", path, handler, ...middleware);
  }

  put(
    path: string,
    handler: Handler,
    ...middleware: (Middleware | MiddlewareObject)[]
  ): this {
    return this._route("PUT", path, handler, ...middleware);
  }

  patch(
    path: string,
    handler: Handler,
    ...middleware: (Middleware | MiddlewareObject)[]
  ): this {
    return this._route("PATCH", path, handler, ...middleware);
  }

  delete(
    path: string,
    handler: Handler,
    ...middleware: (Middleware | MiddlewareObject)[]
  ): this {
    return this._route("DELETE", path, handler, ...middleware);
  }

  service(
    name: string,
    service: any,
    scope: "singleton" | "transient" = "singleton"
  ): this {
    this.container.register(name, service, scope);
    return this;
  }

  plugin(plugin: Plugin): this {
    this.plugins.register(plugin);
    return this;
  }

  /**
   * Register a WebSocket event handler
   * @param event Event name
   * @param handler Handler function
   */
  ws(event: string, handler: WebSocketHandler): this {
    this.websocket.on(event, handler);
    return this;
  }

  /**
   * Broadcast a message to all WebSocket clients
   * @param data Message data
   * @param filter Optional filter function
   */
  broadcast(data: any, filter?: (client: any) => boolean): void {
    this.websocket.broadcast(data, filter);
  }

  async handler(req: any, res: any): Promise<void> {
    const context = new Context(req, res, this);

    try {
      // Execute before request hook
      await this.plugins.executeHook("beforeRequest", {
        app: this,
        requestContext: context,
      });

      await this.middleware.execute(context);

      // Execute before route hook
      await this.plugins.executeHook("beforeRoute", {
        app: this,
        requestContext: context,
      });

      await this.router.handle(context);

      // Execute after route hook
      await this.plugins.executeHook("afterRoute", {
        app: this,
        requestContext: context,
      });
    } catch (err: any) {
      this.errors.push({
        timestamp: new Date(),
        method: context.method,
        path: context.path,
        error: err.message,
        stack: err.stack,
      });

      // Execute error hook
      await this.plugins.executeHook("onError", {
        app: this,
        requestContext: context,
        error: err,
      });

      if (!context.sent) {
        // Use the ZoltraError handling if it's a ZoltraError
        if (
          err.name &&
          err.name.includes("Error") &&
          typeof err.toJSON === "function"
        ) {
          return context.status(err.status || 500).json(err.toJSON());
        } // Call custom error handler if provided
        else if (this.options.errorHandler) {
          this.options.errorHandler(err, context, { app: this });
        } else {
          // Default error handling
          const isDev = this.env.get("NODE_ENV") === "development";

          this.logger.error(
            `Request failed: ${context.method} ${context.path}`,
            {
              method: context.method,
              path: context.path,
              error: err.message,
              stack: err.stack,
              ip: req.socket.remoteAddress,
              userAgent: req.headers["user-agent"],
            }
          );

          return context.status(500).json({
            error: "Internal Server Error",
            code: err.code || "INTERNAL_ERROR",
            message: isDev ? err.message : "Something went wrong",
            ...(isDev && { stack: err.stack }),
          });
        }
      }
    } finally {
      // Clean up request-scoped services
      const { RequestContext } = require("../di/request-context");
      RequestContext.clear(context);
    }
  }

  async listen(
    port = this.options.port!,
    host = this.options.host!,
    callback?: (port: number) => void
  ): Promise<Server> {
    if (this.server) {
      throw new Error("Server is already running");
    }

    // Execute before start hook
    await this.plugins.executeHook("beforeStart", { app: this });

    // Create HTTP/2 server if enabled, otherwise create HTTP/1 server
    // if (this.options.http2?.enabled) {
    // try {
    //   this.server = createHTTP2Server(this, {
    //     cert: this.options.http2.cert,
    //     key: this.options.http2.key,
    //     maxConcurrentStreams: this.options.http2.maxConcurrentStreams,
    //     plain: this.options.http2.plain,
    //   });
    //   this.logger.info("HTTP/2 server created");
    // } catch (err: any) {
    //   this.logger.error(
    //     "Failed to create HTTP/2 server, falling back to HTTP/1",
    //     {
    //       error: err.message,
    //     }
    //   );
    //   this.server = createServer(this.handler.bind(this));
    // }
    // } else {
    //   this.server = createServer(this.handler.bind(this));
    // }

    this.server = createServer(this.handler.bind(this));

    const maxAttempts = this.options.autoIncrementPort
      ? this.options.maxPortAttempts!
      : 1;
    let currentPort = port;
    let lastError: any = null;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        await this._tryListen(currentPort, host);
        this.actualPort = currentPort;
        this.isListening = true;

        this.logger.info(`🚀 Server running on http://${host}:${currentPort}`);

        // Initialize WebSocket server if enabled
        if (this.options.websocket?.enabled) {
          this.websocket.initialize(this.server);
          this.logger.info(
            `WebSocket server enabled on path: ${
              this.options.websocket.path || "/ws"
            }`
          );
        }

        // Execute after start hook
        await this.plugins.executeHook("afterStart", {
          app: this,
          server: this.server,
          port: currentPort,
          host,
        });

        if (callback) callback(currentPort);

        return this.server;
      } catch (err: any) {
        lastError = err;
        if (err.code === "EADDRINUSE" && this.options.autoIncrementPort) {
          this.logger.warn(
            `Port ${currentPort} is in use, trying ${currentPort + 1}...`
          );
          currentPort++;
          continue;
        }

        this.logger.error("Failed to start server", {
          error: err.message,
          port: currentPort,
          host,
        });
        throw err;
      }
    }

    this.logger.error("Failed to start server after all attempts", {
      error: lastError?.message,
      initialPort: port,
      finalPort: currentPort - 1,
      attempts: maxAttempts,
    });
    throw lastError;
  }

  private _tryListen(port: number, host: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const onError = (err: any) => {
        this.server?.removeListener("listening", onListening);
        reject(err);
      };

      const onListening = () => {
        this.server?.removeListener("error", onError);
        resolve();
      };

      this.server?.once("error", onError);
      this.server?.once("listening", onListening);
      this.server?.listen(port, host);
    });
  }

  async close(): Promise<void> {
    if (this.server && this.isListening) {
      return new Promise((resolve) => {
        this.server!.close(() => {
          this.isListening = false;
          this.logger.info("🛑 Server stopped");
          resolve();
        });
      });
    }
  }

  async shutdown(): Promise<void> {
    this.logger.info("Shutting down server...");
    if (this.server && this.isListening) {
      // Execute before shutdown hook
      await this.plugins.executeHook("beforeShutdown", {
        app: this,
        server: this.server,
      });

      return new Promise((resolve) => {
        this.server!.close(async (err?: any) => {
          this.isListening = false;
          this.actualPort = null;

          if (err) {
            this.logger.error("Error during server shutdown", {
              error: err.message,
            });
          } else {
            this.logger.info("Server shutdown complete");
          }

          // Shutdown all plugins
          await this.plugins.shutdown();

          // Execute after shutdown hook
          await this.plugins.executeHook("afterShutdown", { app: this });

          resolve();
        });

        setTimeout(() => {
          this.logger.warn("Forcing server shutdown");
          process.exit(0);
        }, 10_000);
      });
    }
  }

  get config(): ApplicationOptions {
    return this.options;
  }

  get serverInfo(): ServerInfo {
    return {
      isListening: this.isListening,
      port: this.actualPort,
      host: this.options.host!,
      url: this.isListening
        ? `http://${this.options.host}:${this.actualPort}`
        : null,
      uptime: this.server ? process.uptime() : 0,
      errorCount: this.errors.length,
    };
  }

  getRecentErrors(limit = 10) {
    return this.errors.slice(-limit);
  }

  clearErrors() {
    this.errors = [];
  }

  health() {
    return {
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: process.version,
      server: this.serverInfo,
    };
  }
}
