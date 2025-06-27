import { Router } from "../core/router";
import http from "http";

class Server {
  server: http.Server | null = null;
  router: Router;

  constructor() {
    this.router = new Router(true);
  }

  handler() {
    return async (req: any, res: any) => {
      const next = async (error: any) => {
        if (error) {
          console.log("ERROR:", error);
          return error;
        }
      };

      try {
        this.enhanceResponse(res);

        await this.router.handle(req, res, next);
      } catch (error) {
        console.log("HANDLER_ERROR:", error);
      }
    };
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

  async start() {
    await this.router.loadRoutes();

    this._tryStartServer(2000);
  }

  public stop() {
    if (this.server) {
      this.server.close();
    }
  }

  private _tryStartServer(initialPort: number) {
    let attempts = 0;
    let currentPort = initialPort;

    const tryStart = (port: number) => {
      this.server = http.createServer(this.handler);
      this.server
        .listen(port, () => {
          console.log("server is runing...");
        })
        .on("error", (err: NodeJS.ErrnoException) => {
          if (err.code === "EADDRINUSE") {
            attempts++;
            currentPort = port + 1;

            if (attempts >= 5) {
              return;
            }

            tryStart(currentPort);
          } else {
            console.log("ERR", err.message);
            return;
          }
        });
    };

    tryStart(initialPort);
  }
}

export default Server;
