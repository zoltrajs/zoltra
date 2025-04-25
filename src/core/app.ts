import { IncomingMessage, ServerResponse } from "http";
import { Router } from "./router";
import { requestLogger } from "middleware/request-logger";
import { Logger } from "../utils";
import http from "http";
import { bodyParser } from "middleware/body-parser";
import dotenv from "dotenv";
import { ConfigManager } from "zoltra/config";
import { config as Config } from "config/read";
import {
  ErrorHandler,
  Plugin,
  RequestRes,
  StaticOptions,
  ZoltraConfig,
  ZoltraHandler,
} from "../types";
import { serverStatic } from "utils/static";
import { generateWelcomePage } from "utils/client-home";

class Zoltra {
  private routeHandler: Router;
  private logger: Logger;
  private server?: http.Server;
  private configManger = new ConfigManager();
  private plugins: Plugin[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private middlewareChain: Array<ZoltraHandler> = [];
  private _homeRouteInitialized = false;

  constructor() {
    this.routeHandler = new Router();
    this.logger = new Logger("Zoltra");
    this.loadEnv();
  }

  static static(rootDir: string, options: StaticOptions = {}) {
    return serverStatic(rootDir, options);
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

  private async initializePlugins() {
    for (const plugin of this.plugins) {
      await plugin.install(this);
    }
  }

  public link(path: string, handler: ZoltraHandler) {}

  public home(handler: ZoltraHandler) {
    this._homeRouteInitialized = true;
    this.routeHandler.registerHomeRoute(handler);
  }

  private _setupDefaultHomeRoute() {
    if (!this._homeRouteInitialized) {
      this.routeHandler.registerHomeRoute((_, res) => {
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

        res.send(generateWelcomePage);
      });
    }
  }

  private handler() {
    return async (req: IncomingMessage, res: ServerResponse) => {
      res.setHeader("X-Powered-By", "Zoltra");

      const next = async (error?: Error | unknown) => {
        if (error) await this.handleError(error, req, res);
      };

      try {
        this.enhanceRequest(req);
        this.enhanceResponse(res);
        res.logger = this.logger;

        await this.applyMiddleware(req, res);

        const runMiddleware = async (index: number) => {
          if (index >= this.middlewareChain.length) {
            await this.routeHandler.handle(req, res, next);
            return;
          }

          await this.middlewareChain[index](req, res, () =>
            runMiddleware(index + 1)
          );
        };

        await runMiddleware(0);
      } catch (error) {
        this.handleError(error, req, res);
      }
    };
  }

  // Error Handling
  private defaultErrorHandler(
    error: unknown,
    // @ts-ignore
    req: IncomingMessage,
    res: ServerResponse
  ) {
    const err = error as Error;
    console.log(err);

    res.status(500).json({
      error: "Internal Server Error",
      message: error instanceof Error ? error.message : String(error),
    });
  }

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

  private async applyMiddleware(req: IncomingMessage, res: ServerResponse) {
    await bodyParser()(req, res, async () => {});
    await requestLogger()(req, res, async () => {});
  }

  private enhanceResponse(res: http.ServerResponse) {
    res.json = function (data: unknown) {
      this.setHeader("Content-Type", "application/json");
      this.end(JSON.stringify(data));
    };

    res.status = function (code: number) {
      this.statusCode = code;
      return this;
    };

    res.send = function (data: unknown) {
      if (typeof data === "object") {
        this.setHeader("Content-Type", "application/json");
        this.end(JSON.stringify(data));
      } else {
        this.setHeader("Content-Type", "text/html");
        this.end(data);
      }
    };
  }

  private enhanceRequest(req: http.IncomingMessage) {
    req.configManger = this.configManger;
  }

  public async start(maxAttempts = 5) {
    await this.initializePlugins();
    this._setupDefaultHomeRoute();
    await this.routeHandler.loadRoutes();
    this.configManger.createDir();
    const config = await Config.import();

    let port = config.PORT;

    this._tryStartServer(port, config, maxAttempts);
  }

  private _tryStartServer(
    initialPort: number,
    config: ZoltraConfig,
    maxAttempts: number
  ) {
    this._validatePort(initialPort);

    let attempts = 0;
    let currentPort = initialPort;

    const tryStart = (port: number) => {
      this.server = http.createServer(this.handler());
      this.routeHandler.setCacheEnabled(
        config.experimetal?.router?.cache?.enabled ?? true
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

  private loadEnv() {
    return dotenv.config();
  }
}

export default Zoltra;
