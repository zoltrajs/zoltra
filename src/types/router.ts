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

  addMiddleware(pattern: string, middleware: RequestHandler): void;

  match(context: IContext): Promise<MatchResult | null>;

  getRoutes(): { static: string[]; file: string[] };
}
