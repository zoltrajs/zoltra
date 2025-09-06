import { createServer, Server } from "http";
import { Router } from "./router";
import { Context } from "./context";
import { Container } from "../di/container";
import { EnvironmentManager } from "../utils/env";
import { Logger } from "../utils/logger";
import type { IMiddlewareStack } from "../../types/middleware";
import { Handler } from "../../types/router";
import {
  ApplicationOptions,
  IApplication,
  RequestHandler,
  ServerInfo,
} from "../../types/core";
import { PluginManager } from "../plugins/manger";
import { ILogger } from "../../types/utils";
import { MiddlewareStack } from "../middleware/stack";
import { ErrorLogger } from "../utils/error-logger";
import { RequestLogger } from "../utils/request-logger";
import { CORSOptions, Plugin } from "../../types/plugin";
import { cors } from "../middleware/cors";

export class Application implements IApplication {
  public readonly options: ApplicationOptions;
  public readonly router: Router;
  public readonly middleware: IMiddlewareStack;
  public readonly plugins: PluginManager;
  public readonly container: Container;
  public readonly env: EnvironmentManager;
  public logger: ILogger;

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
      port: 3000,
      host: "localhost",
      routesDir: "./routes",
      publicDir: "./public",
      logLevel: "info",
      autoIncrementPort: true,
      maxPortAttempts: 5,
      ...options,
    };

    // Core components
    this.router = new Router(this.options.routesDir);
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

  use(middleware: RequestHandler, options = {}): this {
    this.middleware.add(middleware, options);
    return this;
  }

  private _route(
    method: string,
    path: string,
    handler: Handler,
    middleware?: RequestHandler[]
  ): this {
    this.router.addRoute(method, path, handler, middleware);
    return this;
  }

  get(path: string, handler: Handler, middleware?: RequestHandler[]): this {
    return this._route("GET", path, handler, middleware);
  }

  post(path: string, handler: Handler, middleware?: RequestHandler[]): this {
    return this._route("POST", path, handler, middleware);
  }

  put(path: string, handler: Handler, middleware?: RequestHandler[]): this {
    return this._route("PUT", path, handler, middleware);
  }

  delete(path: string, handler: Handler, middleware?: RequestHandler[]): this {
    return this._route("DELETE", path, handler, middleware);
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

  async handler(req: any, res: any): Promise<void> {
    const context = new Context(req, res, this);

    try {
      await this.middleware.execute(context);

      await this.router.handle(context);
    } catch (err: any) {
      this.errors.push({
        timestamp: new Date(),
        method: context.method,
        path: context.path,
        error: err.message,
        stack: err.stack,
      });

      this.logger.error(`Request failed: ${context.method} ${context.path}`, {
        method: context.method,
        path: context.path,
        error: err.message,
        stack: err.stack,
        ip: req.socket.remoteAddress,
        userAgent: req.headers["user-agent"],
      });

      if (!context.sent) {
        const isDev = this.env.get("NODE_ENV") === "development";
        context.status(500).json({
          error: "Internal Server Error",
          message: isDev ? err.message : "Something went wrong",
          ...(isDev && { stack: err.stack }),
        });
      }
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
      return new Promise((resolve) => {
        this.server!.close((err?: any) => {
          this.isListening = false;
          this.actualPort = null;

          if (err) {
            this.logger.error("Error during server shutdown", {
              error: err.message,
            });
          } else {
            this.logger.info("Server shutdown complete");
          }

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
