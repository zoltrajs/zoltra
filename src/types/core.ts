import { IncomingMessage, ServerResponse } from "http";
import { LoggerInterface } from "./core-interface";
import { Plugin } from "../plugins";

export type ZoltraRequest = IncomingMessage;
export type ZoltraResponse = ServerResponse;
export type ZoltraNext = (error?: Error | unknown) => Promise<void>;
export type RequestRes =
  | void
  | Promise<void>
  | ServerResponse<IncomingMessage>
  | Promise<ServerResponse>
  | Promise<void | ServerResponse>;

export type ZoltraHandler = (
  req: ZoltraRequest,
  res: ZoltraResponse,
  next: ZoltraNext
) => RequestRes;

export interface ZoltraConfig {
  /**
   * The port number on which the server listens for incoming requests.
   * @example 5000
   */
  PORT: number;
  /**
   * The environment in which the server is running.
   * Determines behavior such as logging verbosity and error reporting.
   * @default "development"
   */
  NODE_ENV: "development" | "production" | "test";
  /**
   * The logging level for the server.
   * Controls the verbosity of log output.
   * - "debug": Detailed logs for debugging.
   * - "info": Informational logs for normal operation.
   * - "warn": Warnings for potential issues.
   * - "error": Errors only.
   * @default "info"
   */
  LOG_LEVEL: "debug" | "info" | "warn" | "error";
  /**
   * Optional file path for writing logs to a file.
   * If specified, logs are appended to this file in addition to console output.
   * @example "./logs/app.log"
   */
  LOG_FILE?: string;

  /**
   * Configuration for error handling and logging.
   */
  error: {
    /**
     * Whether to include stack traces in error logs and responses.
     * Typically enabled in development and disabled in production to avoid leaking sensitive details.
     * @default true
     */
    showStack: boolean;
    /**
     * Whether to include a detailed error object (name, message, stack) in logs.
     * If false, only the error message is logged without structured error details.
     * @default true
     */
    displayErrObj: boolean;

    /**
     * Whether to append the error's message to the log message.
     * If true, the log message is formatted as "<message> - <error.message>".
     * @default true
     */
    includeErrorMessage?: boolean;
  };

  /**
   * Configuration for experimental features.
   * These features are unstable and may change or be removed in future versions.
   */
  experimental?: {
    /**
     * Experimental router settings.
     */
    router?: {
      /**
       * Experimental caching settings for routes.
       */
      cache?: {
        /**
         * Whether to enable experimental route caching..
         * @default false
         */
        enabled?: boolean;
      };
    };

    dev?: {
      turboClient?: boolean;
    };
  };

  plugins?: (string | Plugin)[];

  disableHandlerError?: boolean;
}

export interface StaticOptions {
  prefix: string;
  extensions?: string[];
  etag?: boolean;
  lastModified?: boolean;
  acceptRanges?: boolean;
  cacheControl?: boolean;
  maxAge?: number;
  immutable?: boolean;
  fallthrough?: boolean;
  mimeTypes?: Record<string, string>;
  debug?: boolean;
}

type BuiltInEvent = "requestReceived" | "responseSent" | "error";

export type EventNames<CustomEvents extends string = never> =
  | BuiltInEvent
  | CustomEvents;

type BuiltInEventArgs = {
  error: [Error, IncomingMessage, ServerResponse, LoggerInterface];
  requestReceived: [IncomingMessage];
  responseSent: [ServerResponse];
};

export type EventArgs<CustomEvents extends string = never> =
  CustomEvents extends keyof BuiltInEventArgs
    ? BuiltInEventArgs[CustomEvents]
    : any[];
