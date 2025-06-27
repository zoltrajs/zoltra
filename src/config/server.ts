import { existsSync, readFileSync } from "fs";
import {
  createServer,
  ServerResponse,
  IncomingMessage,
  Server as HTTPServer,
} from "http";
import { createServer as createHttpsServer, Server } from "https";
import { join } from "path";
import { LoggerInterface } from "types";

class ServerConfig {
  private logger: LoggerInterface;
  public server?: HTTPServer | Server;

  constructor(logger: LoggerInterface) {
    this.logger = logger;
  }

  private retrieveKey(key: string, cert: string) {
    const keyPath = join(process.cwd(), key);
    const certPath = join(process.cwd(), cert);

    if (existsSync(keyPath) && existsSync(certPath)) {
      const httpsOptions = {
        key: readFileSync(keyPath),
        cert: readFileSync(certPath),
      };

      return httpsOptions;
    } else {
      this.logger.error(`SSL/TLS key or certificate file missing. 
          Key: ${keyPath} 
          Cert: ${certPath}`);
      return undefined;
    }
  }

  public startHttps(
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>,
    key: string,
    cert: string,
    port: number,
    maxAttempts: number,
    outerFn: () => void,
    innerFn: () => void
  ) {
    const httpServer = createServer(handler);

    httpServer.on("request", (req, res) => {
      if (req.headers["x-forwarded-proto"] !== "https") {
        res
          .writeHead(301, {
            location: `https://${req.headers.host}${req.url}`,
          })
          .end();
        // res.end();
      } else {
        handler(req, res);
      }
    });

    httpServer.listen(80, () => {
      this.logger.info("HTTP server running on http://localhost:80");
    });

    // Start HTTPS server with SSL/TLS
    const httpsOptions = this.retrieveKey(key, cert);

    if (httpsOptions) {
      this._tryStartServer(
        port,
        maxAttempts,
        outerFn,
        innerFn,
        handler,
        httpsOptions
      );
    } else {
      this.logger.error(
        "Failed to start HTTPS server due to missing key/certificate."
      );
    }
  }

  private _tryStartServer(
    initialPort: number,
    maxAttempts: number,
    outerFn: () => void,
    innerFn: () => void,
    handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>,
    httpsOptions: {
      key: Buffer<ArrayBufferLike>;
      cert: Buffer<ArrayBufferLike>;
    }
  ) {
    outerFn();

    let attempts = 0;
    let currentPort = initialPort;

    const tryStart = (port: number) => {
      this.server = createHttpsServer(httpsOptions, handler);

      innerFn();

      this.server
        .listen(port, () => {
          this.logger.info(`Server running on https://localhost:${port}`);
        })
        .on("error", (err: NodeJS.ErrnoException) => {
          if (err.code === "") {
            attempts++;
            currentPort = initialPort + 1;

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
}

export default ServerConfig;
