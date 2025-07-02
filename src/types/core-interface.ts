import { EventArgs, EventNames, RequestRes, ZoltraHandler } from "./core";
import { ErrorHandler, Plugin } from "./plugin";
import { IncomingMessage, ServerResponse } from "http";
import { Route } from "./route";

export interface AppInterface {
  /**
   * Holds the current list of registered routes. This array is
   * populated when routes are loaded during startup or dynamically
   * in serverless environments.
   */
  _routes: Route[];

  /**
   * Registers an event listener on the framework's internal event bus.
   * Useful for hooking into lifecycle events like request, response,
   * or custom events defined by plugins.
   *
   * @typeParam CustomEvents - Custom event string names
   * @param eventName - The name of the event to listen for
   * @param listener - The callback to invoke when the event is emitted
   */
  on<CustomEvents extends string = never>(
    eventName: EventNames<CustomEvents>,
    listener: (...args: EventArgs<CustomEvents>) => void
  ): void;

  /**
   * Emits an event on the framework's internal event bus,
   * notifying any registered listeners. This can be used to
   * trigger hooks or side effects during the app lifecycle.
   *
   * @typeParam CustomEvents - Custom event string names
   * @param eventName - The name of the event to emit
   * @param args - Arguments to pass to the event listeners
   */
  emit<CustomEvents extends string = never>(
    eventName: EventNames<CustomEvents>,
    ...args: EventArgs<CustomEvents>
  ): void;

  /**
   * Adds a middleware function to the request processing pipeline.
   * @param middleware - The middleware function to add.
   * @returns A result object for chaining or further configuration.
   * @example
   * zoltra.addMiddleware(async (req, res, next) => {
   *   // Your Function
   * });
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
   * Returns a serverless-compatible request handler function.
   *
   * The returned function can be directly exported as a default serverless handler.
   * @returns A request handler function compatible with serverless frameworks
   */
  exportHandler(): (req: IncomingMessage, res: ServerResponse) => Promise<void>;

  /**
   * Initializes the framework in a serverless environment by
   * loading necessary plugins, routes, and other setup code
   * without starting a full HTTP server.
   *
   * This method is only used for **serverless** deployments.
   */
  loadInit(): void;

  /**
   * Loads a pre-defined static array of routes.
   *
   * This method is **only intended for serverless environments** such as Vercel,
   * where dynamic file-based route scanning is not possible due to build-time
   * packaging limitations. Instead of scanning the filesystem, pass your
   * generated static route registry here.
   *
   * @param routes - An array of Route objects to register with the application.
   *
   * @example
   * import userRoutes from "../routes/user";
   * const routes = [...withPrefix("user", userRoutes)]
   *
   * app.loadStaticRoutes(routes);
   */
  loadStaticRoutes(routes: Route[]): void;

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
  /**
   * Logs a debug-level message. Useful for development and verbose output.
   *
   * @param message - The message to log
   * @param data - Optional additional context data to include in the log
   */
  debug(message: string, data?: Record<string, unknown>): void;

  /**
   * Logs an informational message. Use for standard runtime messages
   * that describe the normal operation of the application.
   *
   * @param message - The message to log
   * @param data - Optional additional context data to include in the log
   */
  info(message: string, data?: Record<string, unknown>): void;

  /**
   * Logs a warning message. Indicates something unexpected but not
   * necessarily an error or failure.
   *
   * @param message - The message to log
   * @param data - Optional additional context data to include in the log
   */
  warn(message: string, data?: Record<string, unknown>): void;

  /**
   * Logs an error message. Should be used when something has failed.
   *
   * @param message - The message to log
   * @param error - Optional Error object containing stack trace or details
   * @param data - Optional additional context data to include in the log
   */
  error(message: string, error?: Error, data?: Record<string, unknown>): void;

  trackRequest(req: IncomingMessage): {
    end: (res: { statusCode: number }) => void;
  };
}
