import { IncomingMessage, ServerResponse } from "http";
import { RouteHandler } from "./route";
import { errorHandler } from "middleware/error-handler";
import { requestLogger } from "middleware/request-logger";
import { RequestError, Logger } from "zoltra/utils";
import http from "http";
import { config } from "zoltra/config";
import { bodyParser } from "middleware/body-parser";
import {
  Middleware,
  ZoltraNext,
  ZoltraRequest,
  ZoltraResponse,
} from "zoltra/types";
import dotenv from "dotenv";

class App {
  private routeHandler: RouteHandler;
  private logger: Logger;
  private server?: http.Server;
  private middlewares: Middleware[] = [];

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

  private async setup() {
    await this.routeHandler.loadRoutes();
  }

  private handler() {
    return async (req: IncomingMessage, res: ServerResponse) => {
      try {
        this.enhanceResponse(res);
        res.logger = this.logger;

        // Apply logger
        this.logger.debug(`Handling request: ${req.method} ${req.url}`);

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

  public async start() {
    await this.routeHandler.loadRoutes();

    this.server = http.createServer(this.handler());
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
