import { IncomingMessage, ServerResponse } from "http";
import { Router } from "./router";
import { requestLogger } from "middleware/request-logger";
import { colorText, Logger } from "../utils";
import http from "http";
import { bodyParser } from "middleware/body-parser";
import dotenv from "dotenv";
import { ConfigManager } from "zoltra/config";

import {
  AppInterface,
  EventArgs,
  EventNames,
  RequestRes,
  StaticOptions,
  ZoltraConfig,
  ZoltraHandler,
} from "../types";
import { Plugin, ErrorHandler } from "../types/plugin";
import { serveStatic } from "utils/static";
import { homeRouteContent } from "content/client-home";
import EventEmitter from "events";
import importConfig from "../config/read/import";
import { Plugin as _Plugin } from "../plugins/plugin";
import { loadPluginsAsync } from "plugins/system";
import ServerConfig from "config/server";
import { Server } from "https";

/**
 * Zoltra web server framework class.
 * Provides methods for handling requests, logging, and serving static files.
 */
class Zoltra implements AppInterface {
  private routeHandler: Router;
  private logger: Logger;
  private server?: http.Server | Server;
  private configManger: ConfigManager;
  private plugins: Plugin[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private middlewareChain: Array<ZoltraHandler> = [];
  private _homeRouteInitialized = false;
  private eventEmitter: EventEmitter;
  private _plugins: Record<string, _Plugin>;
  private protocol: "https" | "http" = "http";

  /**
   * Creates a new Zoltra instance.
   */
  constructor() {
    this.routeHandler = new Router();
    this.logger = new Logger("Zoltra");
    this.loadEnv();
    this.eventEmitter = new EventEmitter();
    this.configManger = new ConfigManager(this.logger);
    this._plugins = {};
  }

  on<CustomEvents extends string = never>(
    eventName: EventNames<CustomEvents>,
    listener: (...args: EventArgs<CustomEvents>) => void
  ) {
    this.eventEmitter.on(eventName, listener);
  }

  emit<CustomEvents extends string = never>(
    eventName: EventNames<CustomEvents>,
    ...args: EventArgs<CustomEvents>
  ) {
    this.eventEmitter.emit(eventName, ...args);
  }

  /**
   * Serves static files from a specified directory.
   * @param rootDir - The directory containing static files.
   * @param options - Optional configuration for serving static files.
   * @returns A middleware function to handle static file requests.
   * @example
   * app.useStatic(Zoltra.static("public", { prefix: "static" }));
   */
  static static(rootDir: string, options: StaticOptions) {
    return serveStatic(rootDir, options);
  }

  private getPlugin(name: string) {
    const plugin = this._plugins[name];
    if (typeof plugin === "undefined") {
      throw new Error(`Plugin ${name} Does not exits`);
    }
    return plugin;
  }

  public executeFnFromPlugin(
    name: string,
    functionName: string,
    ...arg: any[]
  ) {
    const plugin = this.getPlugin(name);
    // @ts-ignore
    const fn = plugin[functionName];
    if (typeof fn !== "function") {
      throw new Error(
        `Function ${functionName} does not exits in Plugin: ${plugin?.name}`
      );
    }

    fn(...arg);
  }

  public register(plugin: Plugin) {
    this.plugins.push(plugin);
  }

  public addMiddleware(middleware: ZoltraHandler): RequestRes {
    this.middlewareChain.push(middleware);
  }

  public registerErrorHandler(handler: ErrorHandler) {
    this.errorHandlers.push(handler);
  }

  /**
   * Initializes plugins configured for the application.
   * Called during Zoltra instance creation.
   * @internal
   */
  private async initializePlugins() {
    for (const plugin of this.plugins) {
      await plugin.install(this);
    }
  }

  public useStatic(handler: ZoltraHandler) {
    this.addMiddleware(handler);
  }

  public home(handler: ZoltraHandler) {
    this._homeRouteInitialized = true;
    this.routeHandler.addRoute("/", "GET", handler);
  }

  /**
   * Sets up a default handler for the root ("/") route if none is specified.
   */
  private _setupDefaultHomeRoute() {
    if (!this._homeRouteInitialized) {
      this.routeHandler.addRoute("/", "GET", (_, res) => {
        // Set comprehensive CSP headers

        res.setHeader(
          "Content-Security-Policy",
          `
        default-src 'self';
        img-src 'self' data: https://raw.githubusercontent.com https://ka-f.fontawesome.com;
        script-src 'self' https://cdn.tailwindcss.com https://kit.fontawesome.com;
        style-src 'self' 'unsafe-inline' https://cdn.tailwindcss.com https://fonts.googleapis.com https://ka-f.fontawesome.com;
        font-src 'self' https://fonts.gstatic.com https://ka-f.fontawesome.com;
        connect-src 'self' https://ka-f.fontawesome.com;
        frame-src 'none';
        object-src 'none';
      `
            .replace(/\n/g, "")
            .replace(/\s+/g, " ")
            .trim()
        );

        res.send(homeRouteContent);
      });
    }
  }

  /**
   * Core request handler for processing incoming requests.
   * @internal
   */
  private handler() {
    return async (req: IncomingMessage, res: ServerResponse) => {
      res.setHeader("X-Powered-By", "Zoltra");

      const next = async (error?: Error | any) => {
        if (error) {
          this.emit("error", error, req, res, this.logger);
          await this.handleError(error, req, res);
        }
      };

      try {
        this.emit("requestReceived", req);
        this.enhanceRequest(req);
        this.enhanceResponse(res);
        res.logger = this.logger;

        await this.applyMiddleware(req, res);

        const runMiddleware = async (index: number) => {
          if (index >= this.middlewareChain.length) {
            await this.routeHandler.handle(req, res, next, this.protocol);
            return;
          }

          await this.middlewareChain[index](req, res, () =>
            runMiddleware(index + 1)
          );
        };

        await runMiddleware(0);
        this.emit("responseSent", res);
      } catch (error) {
        this.handleError(error, req, res);
      }
    };
  }

  /**
   * Default error handler used when no custom handler is registered.
   * @internal
   */
  private defaultErrorHandler(
    error: unknown,
    req: IncomingMessage,
    res: ServerResponse
  ) {
    if (res.headersSent) {
      this.logger.warn(
        "To Apply Custom Error handlers enable the 'disableHandlerError' option"
      );
      return;
    }

    const err = error as Error;
    this.emit("error", err, req, res, this.logger);

    if (this.configManger.readConfig().disableHandlerError === true) {
      return;
    }

    this.logger.error(`Request handler error for ${req.url}`, {
      name: "RequestHandlerError",
      message: err.message,
      stack: err.stack,
    });

    res.status(500).json({
      error: `Request handler error for ${req.url}`,
      message: err.message,
      success: false,
    });
  }

  /**
   * Handles errors by invoking the registered error handler or default handler.
   * @internal
   */
  private async handleError(
    error: unknown,
    req: IncomingMessage,
    res: ServerResponse
  ) {
    const runErrorHandler = async (index: number) => {
      if (index >= this.errorHandlers.length) {
        return this.defaultErrorHandler(error, req, res);
      }

      await this.errorHandlers[index](error, req, res, () =>
        runErrorHandler(index + 1)
      );
    };
    await runErrorHandler(0);
  }

  /**
   * Applies a middleware function to the request pipeline.
   * @param middleware - The middleware function to apply.
   * @returns A result object for chaining or further configuration.
   * @internal
   */
  private async applyMiddleware(req: IncomingMessage, res: ServerResponse) {
    await bodyParser()(req, res, async () => {});
    await requestLogger()(req, res, async () => {});
  }

  /**
   * Enhances the response object with additional Zoltra-specific methods.
   * @param res - The response object to enhance.
   * @internal
   */
  private enhanceResponse(res: http.ServerResponse) {
    res.json = function (data: unknown) {
      this.setHeader("Content-Type", "application/json");
      this.body = JSON.stringify(data);
      this.end(this.body);
    };

    res.status = function (code: number) {
      this.statusCode = code;
      return this;
    };

    res.send = function (data: unknown) {
      if (typeof data === "object") {
        this.setHeader("Content-Type", "application/json");
        this.body = JSON.stringify(data);
      } else {
        this.setHeader("Content-Type", "text/html");
        this.body = String(data);
      }
      this.end(this.body);
    };
  }

  /**
   * Enhances the request object with additional Zoltra-specific properties.
   * @param req - The request object to enhance.
   * @internal
   */
  private enhanceRequest(_: http.IncomingMessage) {}

  public async start(maxAttempts = 5) {
    const config = await importConfig(this.logger);
    this._plugins = await loadPluginsAsync(this, config);
    await this.initializePlugins();
    this._setupDefaultHomeRoute();
    await this.routeHandler.loadRoutes();
    this.configManger.createDir();

    let port = config.PORT;
    this.protocol = "http";
    this._tryStartServer(port, config, maxAttempts);
  }

  public async startHttps(key: string, cert: string, maxAttempts = 5) {
    const config = await importConfig(this.logger);
    this._plugins = await loadPluginsAsync(this, config);
    await this.initializePlugins();
    this._setupDefaultHomeRoute();
    await this.routeHandler.loadRoutes();
    this.configManger.createDir();

    let port = config.PORT;
    const serverConfig = new ServerConfig(this.logger);

    if (this.server) {
      this.logger.warn("Server is already active");
      return;
    }

    this.protocol = "https";
    serverConfig.startHttps(
      this.handler(),
      key,
      cert,
      port,
      maxAttempts,
      () => {},
      () => {}
    );
    this.server = serverConfig.server;
  }

  /**
   * Attempts to start the server, retrying if the port is in use.
   * @param maxAttempts - Maximum number of retry attempts.
   * @returns A promise that resolves when the server starts.
   * @internal
   */
  private _tryStartServer(
    initialPort: number,
    config: ZoltraConfig,
    maxAttempts: number
  ) {
    this._validatePort(initialPort);
    this._logExperimentalWarn(config);

    let attempts = 0;
    let currentPort = initialPort;

    const tryStart = (port: number) => {
      this.server = http.createServer(this.handler());
      this.routeHandler.setCacheEnabled(
        config.experimental?.router?.cache?.enabled ?? true
      );
      this.configManger.configToJSON(config);
      this.configManger.createCachePath();

      this.server
        .listen(port, () => {
          this.logger.info(`Server running on http://localhost:${port}`);
        })
        .on("error", (err: NodeJS.ErrnoException) => {
          if (err.code === "EADDRINUSE") {
            attempts++;
            currentPort = port + 1;

            if (attempts >= maxAttempts) {
              this.logger.error(
                `No available ports (tried ${initialPort}-${port})`,
                {
                  name: "PortConflictError",
                  message: "All candidate ports are in use",
                  stack: "",
                },
                {
                  details: {
                    initialPort,
                    maxAttempts,
                    lastAttemptedPort: port,
                  },
                }
              );
              return;
            }

            this.logger.warn(`Port ${port} in use, trying ${currentPort}...`);
            tryStart(currentPort);
          } else {
            this.logger.error(`Critical server error: ${err.message}`, {
              name: err.name,
              message: err.message,
              stack: err.stack,
            });
          }
        });
    };

    tryStart(initialPort);
  }

  private _validatePort(port: number) {
    if (typeof port !== "number" || port < 5000 || port > 65535) {
      throw new Error(`Invalid port: ${port}. Must be 5000-65535`);
    }
  }

  public async stop() {
    if (this.server) {
      this.server.close();
    }
  }

  /**
   * Loads environment variables into the configuration.
   * @internal
   */
  private loadEnv() {
    return dotenv.config();
  }

  private _logExperimentalWarn(config: ZoltraConfig) {
    if (!config.experimental || typeof config.experimental !== "object") {
      return;
    }

    const collectExperimentalFeatures = (
      obj: Record<string, any>,
      prefix = ""
    ): string[] => {
      return Object.entries(obj).reduce<string[]>((features, [key, value]) => {
        const fullPath = prefix ? `${prefix}.${key}` : key;

        if (value === true) {
          return [...features, fullPath];
        }

        if (
          typeof value === "object" &&
          value !== null &&
          !Array.isArray(value)
        ) {
          const nestedFeatures = collectExperimentalFeatures(value, fullPath);
          return [...features, ...nestedFeatures];
        }

        return features;
      }, []);
    };

    const experimentalFeatures = collectExperimentalFeatures(
      config.experimental
    );

    if (experimentalFeatures.length > 0) {
      const warningMessage = [
        "⚠️  Experimental Features Enabled ⚠️",
        "The following experimental features are enabled:",
        ...experimentalFeatures.map((f) => `• ${f}`),
        "",
        "Experimental features may:",
        "- Change without notice",
        "- Have stability issues",
        "- Be removed in future versions",
        "- Not be production-ready",
        "",
        "Use with caution.",
      ].join("\n");

      this.logger.warn(colorText(warningMessage, "bold", "white"));

      if (process.env.NODE_ENV === "production") {
        const prodMessage =
          "Experimental features are enabled in PRODUCTION environment. " +
          "This is not recommended for mission-critical applications.";
        this.logger.warn(colorText(prodMessage, "bold", "white"));
      }
    } else {
      this.logger.debug("No experimental features enabled");
    }
  }

  // @ts-ignore
  private _logUnstableMethodWarn(_method: string) {
    if (!_method) {
      return;
    }

    const warningMessage = [
      "⚠️  Unstable Method Used ⚠️",
      `The following method is unstable and experimental:`,
      `• ${_method}`,
      "",
      "Unstable methods may:",
      "- Change without notice",
      "- Have stability issues",
      "- Be removed in future versions",
      "- Not be production-ready",
      "",
      "Use with caution.",
    ].join("\n");

    this.logger.warn(colorText(warningMessage, "bold", "white"));

    if (process.env.NODE_ENV === "production") {
      const prodMessage =
        `Unstable method "${_method}" is used in PRODUCTION environment. ` +
        "This is not recommended for mission-critical applications.";
      this.logger.warn(colorText(prodMessage, "bold", "white"));
    }
  }
}

export default Zoltra;
