import { Key } from "path-to-regexp";
import { IContext, RequestHandler } from "./core";

export type Handler = (ctx: IContext) => Promise<any> | any;

export interface StaticRoute {
  handler: Handler;
  middleware: RequestHandler[];
}

export interface MatchResult {
  handler: Handler;
  middleware: RequestHandler[];
  params: Record<string, string>;
  type: "static" | "file";
}

export interface Route {
  method: string;
  path: string;
  regex?: RegExp;
  keys?: Key[];
  handler: Handler;
  middlewares: RequestHandler[];
  middlewareChain?: (ctx: IContext) => Promise<void>;
}

/**
 * Router interface
 */
export interface IRouter {
  loadRoutes(): Promise<void>;

  addRoute(
    method: string,
    path: string,
    handler: Handler,
    middleware?: RequestHandler[]
  ): void;

  handle(context: IContext): Promise<void>;
}
