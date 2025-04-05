import { IncomingMessage, ServerResponse } from "http";
import { RouteHandler } from "./route";
import { errorHandler } from "middleware/error-handler";
import { requestLogger } from "middleware/request-logger";
import { RequestError, Logger } from "../utils";
import http from "http";
import { bodyParser } from "middleware/body-parser";
import {
  Middleware,
  ZoltraNext,
  ZoltraRequest,
  ZoltraResponse,
} from "../types";
import dotenv from "dotenv";
import { ConfigManager } from "zoltra/config";
import { config as Config } from "config/read";

class App {
  private routeHandler: RouteHandler;
  private logger: Logger;
  private server?: http.Server;
  private middlewares: Middleware[] = [];
  private config = new ConfigManager();

  constructor() {
    this.routeHandler = new RouteHandler();
    this.logger = new Logger("App");
    this.loadEnv();
  }

  public use(middleware: Middleware) {
    this.middlewares.push(middleware);
  }

  private async run(req: ZoltraRequest, res: ZoltraResponse) {
    for (const middleware of this.middlewares) {
      await new Promise((resolve) =>
        middleware(req, res, resolve as ZoltraNext)
      );
    }
  }

  private handler() {
    return async (req: IncomingMessage, res: ServerResponse) => {
      try {
        this.enhanceRequest(req);
        this.enhanceResponse(res);
        res.logger = this.logger;

        // Apply logger
        // this.logger.debug(`Handling request: ${req.method} ${req.url}`);

        // Apply middleware chain
        await this.applyMiddleware(req, res);

        // Route handling
        await this.routeHandler.handle(req, res);
      } catch (error) {
        this.logger.error("Request failed:", error as RequestError, {
          method: req.method,
          url: req.url,
        });
        errorHandler(error, req, res);
      }
    };
  }

  private async applyMiddleware(req: IncomingMessage, res: ServerResponse) {
    await bodyParser()(req, res, async () => {});
    await requestLogger()(req, res, async () => {});
    await this.run(req, res);
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
    req.config = this.config;
  }

  public async start() {
    this.config.createDir();
    await this.routeHandler.loadRoutes();

    this.server = http.createServer(this.handler());
    const config = await Config.import();
    this.config.configToJSON(config);
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
