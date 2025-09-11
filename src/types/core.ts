import { IncomingMessage, ServerResponse } from "http";
import { ParsedUrlQuery } from "querystring";
import { IEnvironmentManager, ILogger } from "./utils";
import { MiddlewareObject } from "./middleware";

export interface ApplicationOptions {
  port?: number;
  host?: string;
  routesDir?: string;
  publicDir?: string;
  logLevel?: "error" | "warn" | "info" | "debug";
  autoIncrementPort?: boolean;
  maxPortAttempts?: number;

  /**
   * HTTP/2 options
   */
  http2?: {
    /**
     * Enable HTTP/2 support
     */
    enabled?: boolean;

    /**
     * Path to SSL certificate
     */
    cert?: string | Buffer;

    /**
     * Path to SSL key
     */
    key?: string | Buffer;

    /**
     * Maximum concurrent streams per connection
     */
    maxConcurrentStreams?: number;

    /**
     * Plain HTTP/2 without TLS (not recommended for production)
     */
    plain?: boolean;
  };

  /**
   * Compression options
   */
  compression?: {
    /**
     * Enable response compression
     */
    enabled?: boolean;

    /**
     * Compression level (0-9, where 0 is no compression and 9 is maximum compression)
     */
    level?: number;

    /**
     * Minimum response size in bytes to compress
     */
    threshold?: number;
  };

  /**
   * WebSocket options
   */
  websocket?: {
    /**
     * Enable WebSocket support
     */
    enabled?: boolean;

    /**
     * WebSocket server path
     * @default '/ws'
     */
    path?: string;

    /**
     * Maximum allowed message size in bytes
     */
    maxPayload?: number;

    /**
     * Enable/disable per-message deflate
     */
    perMessageDeflate?: boolean | object;

    /**
     * Ping interval in milliseconds
     * @default 30000
     */
    pingInterval?: number;

    /**
     * Ping timeout in milliseconds
     * @default 5000
     */
    pingTimeout?: number;
  };

  /**
   * Custom error handler
   */
  errorHandler?: (
    error: Error,
    context: IContext,
    options: { app: IApplication }
  ) => void;
}

export interface ServerInfo {
  isListening: boolean;
  port: number | null;
  host: string;
  url: string | null;
  uptime: number;
  errorCount: number;
}

export interface IApplication {
  config: ApplicationOptions;
  serverInfo: ServerInfo;
  container: IContainer;
  logger: ILogger;
  readonly env: IEnvironmentManager;

  use(middleware: Middleware | MiddlewareObject, options?: object): this;
  get(
    path: string,
    handler: (ctx: IContext) => any,
    ...middleware: (Middleware | MiddlewareObject)[]
  ): this;
  post(
    path: string,
    handler: (ctx: IContext) => any,
    ...middleware: (Middleware | MiddlewareObject)[]
  ): this;

  /**
   * Register a WebSocket event handler
   */
  ws(event: string, handler: Function): this;

  /**
   * Broadcast a message to all WebSocket clients
   */
  broadcast(data: any, filter?: (client: any) => boolean): void;
  put(
    path: string,
    handler: (ctx: IContext) => any,
    ...middleware: (Middleware | MiddlewareObject)[]
  ): this;
  patch(
    path: string,
    handler: (ctx: IContext) => any,
    ...middleware: (Middleware | MiddlewareObject)[]
  ): this;
  delete(
    path: string,
    handler: (ctx: IContext) => any,
    ...middleware: (Middleware | MiddlewareObject)[]
  ): this;

  service(name: string, service: any, scope?: "singleton" | "transient"): this;
  plugin(plugin: any): this;

  listen(
    port?: number,
    host?: string,
    callback?: (port: number) => void
  ): Promise<any>;
  close(): Promise<void>;
  shutdown(): Promise<void>;

  handler(req: any, res: any): Promise<void>;

  health(): object;
  getRecentErrors(limit?: number): any[];
  clearErrors(): void;
}

// Container
export type ServiceScope = "singleton" | "transient" | "request";

export interface ServiceRegistration<T = any> {
  service: T | (new (...args: any[]) => T) | (() => T);
  scope: ServiceScope;
  instance: T | null;
}

export interface IContainer {
  register<T = any>(
    name: string,
    service: T | (new (...args: any[]) => T) | (() => T),
    scope?: ServiceScope
  ): void;

  resolve<T = any>(name: string): T;

  has(name: string): boolean;

  unregister(name: string): void;

  createChild(): IContainer;

  getServiceNames(): string[];

  clear(): void;

  createChild(): IContainer;
}

export interface IContext {
  req: IncomingMessage;
  res: ServerResponse;
  app: IApplication;

  method: string;
  url: string;
  path: string;
  query: ParsedUrlQuery;

  _body?: any;
  _startTime: [number, number];
  rawBody: string;
  sent: boolean;
  statusCode: number;

  params: Record<string, string>;
  services: IContainer;

  headers: IncomingMessage["headers"];
  status(code: number): this;
  get(key: string): string | undefined;
  set(key: string, value: string): this;
  send(body: any): void;
  json(data: object): void;
  html(html: string): void;
  text(text: string): void;
  redirect(url: string, status?: number): this;
  body<T = any>(): Promise<T>;
  service<T = any>(name: string): T;
  throw(status: number, message?: string, details?: any): never;
}

/**
 * Middleware function type
 */

export type Middleware = (
  context: IContext,
  next: NextFunction
) => Promise<void> | void;

export type NextFunction = () => Promise<void>;
