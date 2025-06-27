import http from "http";
import { EventArgs, EventNames, RequestRes, ZoltraHandler } from "./core";
import { ErrorHandler, Plugin } from "./plugin";
import { IncomingMessage, ServerResponse } from "http";

export interface AppInterface {
  on<CustomEvents extends string = never>(
    eventName: EventNames<CustomEvents>,
    listener: (...args: EventArgs<CustomEvents>) => void
  ): void;

  emit<CustomEvents extends string = never>(
    eventName: EventNames<CustomEvents>,
    ...args: EventArgs<CustomEvents>
  ): void;

  /**
   * Adds a middleware function to the request processing pipeline.
   * @param middleware - The middleware function to add.
   * @returns A result object for chaining or further configuration.
   * @example
   * zoltra.addMiddleware(async (req, res, next) => { res.setHeader("X-Powered-By", "Zoltra"); next(); });
   */
  addMiddleware(middleware: ZoltraHandler): RequestRes;

  /**
   * Adds a static file handler to the application.
   * Similar to `Zoltra.static`, but instance-based.
   * @param handler - The static file handler middleware.
   * @example
   * app.useStatic(Zoltra.static("public", { prefix: "static" }));
   */
  useStatic(handler: ZoltraHandler): void;

  /**
   * Sets the handler for the root ("/") route.
   * @example
   * app.home((req, res) => res.send("Hello world!"));
   */
  home(handler: ZoltraHandler): void;

  /**
   * Core request handler for processing incoming requests.
   */
  handler(req: IncomingMessage, res: ServerResponse): Promise<void>;

  /**
   * Starts the Zoltra server, listening on the configured port.
   * @param maxAttempts - Maximum number of retry attempts if the port is in use.
   * @returns A promise that resolves when the server starts successfully.
   */
  start(maxAttempts?: number): Promise<void>;

  /**
   * Starts the Zoltra https server, listening on the configured port.
   * @param key - The relative path to the private key file. The path should be relative to the
   * project root and must point to the private key file e.g `./cert/key.pem`.
   * @param cert - The relative path to the SSL certificate file. The path should be relative to
   *  the project root and must point to the SSL certificate file e.g `./cert/cert.pem`.
   * @param maxAttempts - Maximum number of retry attempts if the port is in use.
   * @example
   * export async function startServer() {
   *  try {
   *    const app = new Zoltra();
   *
   *    await app.startHttps("./cert/key.pem", "./cert/cert.pem")
   * } catch (error) {
   *    const err = error as Error;
   *    logger.error(`Failed to start server: ${err.message}`);
   *    process.exit(1);
   *   }
   * }
   *
   * startServer();
   */
  startHttps(key: string, cert: string, maxAttempts?: number): Promise<void>;

  /**
   * Stops the Zoltra server gracefully.
   * @returns A promise that resolves when the server stops.
   * @example
   * zoltra.stop().then(() => console.log("Server stopped"));
   */
  stop(): Promise<void>;

  /* ========== Deprecated methods ======= */

  /**
   * Registers a plugin to extend Zoltra functionality.
   * @param plugin - The plugin to register.
   *
   * @deprecated  This method would be removed in stable version, use the `plugins` option inside `zoltra.config` instead
   */
  register(plugin: Plugin): void;

  /**
   * Registers a custom error handler for the application.
   * @param handler - The error handler function.
   * @deprecated This method would be removed in stable version, use the `plugins` option inside `zoltra.config` instead
   */
  registerErrorHandler(handler: ErrorHandler): void;

  /**
   * Execute a function from loaded `plugins`
   * @param name - Plugin name
   * @param functionName - Name of the function to be executed
   * @param arg - Optional Function argurments
   */
  executeFnFromPlugin(name: string, functionName: string, ...arg: any[]): void;
}

export interface LoggerInterface {
  debug(message: string, data?: Record<string, unknown>): void;
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, error?: Error, data?: Record<string, unknown>): void;
  trackRequest(req: http.IncomingMessage): {
    end: (res: { statusCode: number }) => void;
  };
}
