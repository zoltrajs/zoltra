import { IncomingMessage, ServerResponse } from "http";
import { Router } from "./router";
import { requestLogger } from "middleware/request-logger";
import { Logger } from "../utils";
import http from "http";
import { bodyParser } from "middleware/body-parser";
import dotenv from "dotenv";
import { ConfigManager } from "zoltra/config";
import { config as Config } from "config/read";
import { ErrorHandler, Plugin, RequestRes, ZoltraHandler } from "../types";

class App {
  private routeHandler: Router;
  private logger: Logger;
  private server?: http.Server;
  private configManger = new ConfigManager();
  private plugins: Plugin[] = [];
  private errorHandlers: ErrorHandler[] = [];
  private middlewareChain: Array<ZoltraHandler> = [];

  constructor() {
    this.routeHandler = new Router();
    this.logger = new Logger("App");
    this.loadEnv();
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

  private handler() {
    return async (req: IncomingMessage, res: ServerResponse) => {
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
  }

  private enhanceRequest(req: http.IncomingMessage) {
    req.configManger = this.configManger;
  }

  public async start() {
    this.configManger.createDir();
    await this.initializePlugins();
    await this.routeHandler.loadRoutes();

    this.server = http.createServer(this.handler());
    const config = await Config.import();
    // this.register(CorsPlugin(config.corsOptions));
    this.routeHandler.setCacheEnabled(
      config.experimetal?.router?.cache?.enabled ?? true
    );
    this.configManger.configToJSON(config);
    this.configManger.createCachePath();
    this.server.listen(config.PORT, () => {
      this.logger.info(`Server running on http://localhost:${config.PORT}`);
    });
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

export default App;
