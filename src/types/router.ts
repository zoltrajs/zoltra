import { Key } from "path-to-regexp";
import { IContext, Middleware } from "./core";
import { MiddlewareObject } from "./middleware";

export type Handler = (ctx: IContext) => Promise<any> | any;

export interface Route {
  method: string;
  path: string;
  regex?: RegExp;
  keys?: Key[];
  handler: Handler;
  middlewares: (Middleware | MiddlewareObject)[];
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
    middleware?: Middleware[]
  ): void;

  handle(context: IContext): Promise<void>;
}
