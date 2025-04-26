import { RequestError } from "zoltra/utils";
import { Zoltra } from "../core";
import { ZoltraNext, ZoltraRequest, ZoltraResponse } from "./core";
import { Methods } from "./route";

/**
 * Plugin interface for extending Zoltra functionality.
 * Plugins are registered with the Zoltra instance to add features like middleware or error handling.
 */
export interface Plugin {
  /**
   * The name of the plugin.
   * Used for identification and error reporting.
   * @example "cors-plugin"
   */
  name: string;

  /**
   * Optional version of the plugin.
   * Useful for tracking compatibility and updates.
   * @example "1.0.0"
   */
  version?: string;

  /**
   * Installs the plugin into the Zoltra instance.
   * Configures the plugin’s functionality, such as adding middleware or routes.
   * @param app - The Zoltra instance to configure.
   * @returns A promise that resolves when installation is complete, or void for synchronous installation.
   * @example
   * const plugin: Plugin = {
   *   name: "my-plugin",
   *   install: (app) => {
   *     app.addMiddleware(async (req, res, next) => { res.setHeader("X-Plugin", "MyPlugin"); next(); });
   *   }
   * };
   */
  install: (app: Zoltra) => Promise<void> | void;
}

/**
 * Error interface for plugin-related issues.
 * Used to report errors specific to plugin initialization or execution.
 */
export interface PluginError {
  /**
   * The name of the plugin that caused the error.
   * @example "cors-plugin"
   */
  plugin: string;

  /**
   * A unique code identifying the error type.
   * Useful for programmatic error handling.
   * @example "INVALID_CONFIG"
   */
  code: string;

  /**
   * Optional suggestion for resolving the error.
   * Provides actionable guidance for developers.
   * @example "Ensure the 'origins' option is a valid array or '*'."
   */
  suggestion?: string;
}

/**
 * Error handler function type for Zoltra.
 * Handles errors in the request pipeline, including standard and custom errors.
 */
export type ErrorHandler = (
  /**
   * The error object, which may be a standard Error, RequestError, or unknown type.
   * @example new RequestError("Invalid request", 400)
   */
  error: unknown | Error | RequestError,

  /**
   * The Zoltra request object.
   */
  req: ZoltraRequest,

  /**
   * The Zoltra response object.
   */
  res: ZoltraResponse,

  /**
   * The next middleware function in the pipeline.
   */
  next: ZoltraNext
) => Promise<void>;

/**
 * Options for an error-handling plugin.
 * Combines plugin metadata with a custom error handler.
 */
export interface ErrorPluginOptions {
  /**
   * The name of the error-handling plugin.
   * @example "error-handler"
   */
  name: string;

  /**
   * Optional installation function to configure the plugin.
   * If omitted, the handler is registered directly.
   * @param app - The Zoltra instance to configure.
   * @example
   * install: (app) => app.registerErrorHandler(handler)
   */
  install?: (app: Zoltra) => void;

  /**
   * The error handler function to process errors.
   * @example
   * handler: async (error, req, res, next) => res.status(500).send("Error occurred")
   */
  handler: ErrorHandler;
}

/**
 * Configuration options for the CORS plugin.
 * Controls Cross-Origin Resource Sharing behavior for Zoltra routes.
 */
export interface CorsOptions {
  /**
   * Allowed origins for CORS requests.
   * Use "*" to allow all origins or specify an array of allowed domains.
   * @default "*"
   * @example ["https://example.com", "https://api.example.com"]
   */
  origins?: string[] | "*";

  /**
   * Allowed HTTP methods for CORS requests.
   * @default ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"]
   * @example ["GET", "POST"]
   */
  methods?: Methods[];

  /**
   * Allowed headers for CORS requests.
   * @example ["Content-Type", "Authorization"]
   */
  headers?: string[];

  /**
   * Headers exposed to the client in CORS responses.
   * @example ["X-Custom-Header"]
   */
  exposedHeaders?: string[];

  /**
   * Whether to include credentials (e.g., cookies) in CORS requests.
   * @default false
   */
  credentials?: boolean;

  /**
   * Maximum age (in seconds) for preflight request caching.
   * @default 86400
   * @example 3600
   */
  maxAge?: number;

  /**
   * HTTP status code for preflight responses.
   * @default 204
   * @example 200
   */
  preflightStatus?: number;

  /**
   * HTTP status code for successful OPTIONS requests.
   * @default 200
   * @example 204
   */
  optionsSuccessStatus?: number;
}
