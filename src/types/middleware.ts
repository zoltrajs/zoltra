import { IContext, RequestHandler } from "./core";

/**
 * Middleware object type (class-based)
 */
export interface MiddlewareObject {
  handle: RequestHandler;
}

/**
 * Middleware entry with options
 */
export interface MiddlewareEntry {
  handler: RequestHandler;
  options?: Record<string, any>;
}

/**
 * Middleware stack interface
 */
export interface IMiddlewareStack {
  add(
    middleware: RequestHandler | MiddlewareObject,
    options?: Record<string, any>
  ): void;
  execute(ctx: IContext): Promise<void>;
  remove(middleware: RequestHandler): void;
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
