import { IncomingMessage, ServerResponse } from "http";
import { ParsedUrlQuery } from "querystring";
import { ILogger } from "./utils";

export interface ApplicationOptions {
  port?: number;
  host?: string;
  routesDir?: string;
  publicDir?: string;
  logLevel?: "error" | "warn" | "info" | "debug";
  autoIncrementPort?: boolean;
  maxPortAttempts?: number;
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

  use(middleware: RequestHandler, options?: object): this;
  route(method: string, path: string, handler: (ctx: IContext) => any): this;
  get(path: string, handler: (ctx: IContext) => any): this;
  post(path: string, handler: (ctx: IContext) => any): this;
  put(path: string, handler: (ctx: IContext) => any): this;
  delete(path: string, handler: (ctx: IContext) => any): this;

  service(name: string, service: any, scope?: "singleton" | "transient"): this;
  plugin(plugin: any): this;

  listen(
    port?: number,
    host?: string,
    callback?: (port: number) => void
  ): Promise<any>;
  close(): Promise<void>;
  shutdown(): Promise<void>;

  handleRequest(req: any, res: any): Promise<void>;

  health(): object;
  getRecentErrors(limit?: number): any[];
  clearErrors(): void;
}

// Container
export type ServiceScope = "singleton" | "transient";

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

  _parsedBody?: any;

  params: Record<string, string>;
  services: IContainer;

  headers: IncomingMessage["headers"];
  status(code: number): this;
  set(name: string, value: string): this;
  get(name: string): string | undefined;
  setHeaders(headers: Record<string, string>): this;
  send(body: any): this;
  json(data: object): this;
  html(html: string): this;
  text(text: string): this;
  redirect(url: string, status?: number): this;
  body<T = any>(): Promise<T>;
  rawBody: string;
  service<T = any>(name: string): T;
  sent: boolean;
  statusCode: number;
}

/**
 * Middleware function type
 */

export type RequestHandler = (
  context: IContext,
  next: () => Promise<void>
) => Promise<void> | void;

export type NextFn = () => Promise<void>;
