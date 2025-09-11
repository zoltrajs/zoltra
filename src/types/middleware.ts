import { IContext, Middleware } from "./core";

/**
 * Middleware object type (class-based)
 */
export interface MiddlewareObject {
  handle: Middleware;
}

/**
 * Middleware entry with options
 */
export interface MiddlewareEntry {
  handler: Middleware;
  options?: Record<string, any>;
}

/**
 * Middleware stack interface
 */
export interface IMiddlewareStack {
  add(
    middleware: Middleware | MiddlewareObject,
    options?: Record<string, any>
  ): void;
  execute(ctx: IContext): Promise<void>;
  remove(middleware: Middleware): void;
  clear(): void;
  readonly length: number;
}

export interface StaticMiddlewareOptions {
  index?: string;
  maxAge?: number;
  etag?: boolean;
  lastModified?: boolean;
  directoryListing?: boolean;
}
