import { join } from "path";
import { pathToRegexp, Key } from "path-to-regexp";
import { RequestHandler, Handler, IContext, IRouter } from "../../types";
import { Logger } from "../utils/logger";
import { loadFileRoutes } from "../utils/router";

interface Route {
  method: string;
  path: string;
  regex?: RegExp;
  keys?: Key[];
  handler: Handler;
  middlewares: RequestHandler[];
  middlewareChain?: (ctx: IContext) => Promise<void>;
}

export class Router implements IRouter {
  private routes: Map<string, Route> = new Map();
  private paramRoutes: Route[] = [];
  private globalMiddlewares: RequestHandler[] = [];

  constructor(private logger = new Logger({ context: "Router" })) {}

  use(mw: RequestHandler) {
    this.globalMiddlewares.push(mw);
  }

  async loadRoutes(): Promise<void> {
    try {
      await loadFileRoutes(this, join(process.cwd(), "routes"));
    } catch {
      // swallow startup errors if no routes dir
    }
  }

  async handle(ctx: IContext) {
    const method = ctx.req.method || "GET";
    const url = ctx.req.url || "/";
    const normalized =
      url.length > 1 && url.endsWith("/") ? url.slice(0, -1) : url;

    let route = this.routes.get(method + ":" + normalized);
    let params: Record<string, string> | undefined;

    if (!route && this.paramRoutes.length) {
      for (const r of this.paramRoutes) {
        if (r.method !== method) continue;
        const match = r.regex!.exec(normalized);
        if (match) {
          params = {};
          for (let i = 0; i < r.keys!.length; i++) {
            params[r.keys![i].name] = match[i + 1];
          }
          route = r;
          break;
        }
      }
    }

    if (route) {
      if (params) (ctx as any).params = params;
      return route.middlewareChain!(ctx);
    }

    ctx.status(404).json({ error: "Not Found" });
  }

  addRoute(
    method: string,
    path: string,
    handler: Handler,
    middlewares: RequestHandler[] = []
  ) {
    const route: Route = { method, path, handler, middlewares };

    if (path.includes(":")) {
      // Use the correct API for path-to-regexp v8
      const { regexp, keys } = pathToRegexp(path);
      route.regex = regexp;
      route.keys = keys;
      this.paramRoutes.push(route);
    } else {
      this.routes.set(method + ":" + path, route);
    }

    // ✅ Precompiled middleware chain
    const stack = [...this.globalMiddlewares, ...middlewares, handler];
    route.middlewareChain = this.buildMiddlewareChain(stack);
  }

  private buildMiddlewareChain(
    stack: (RequestHandler | Handler | any)[]
  ): (ctx: IContext) => Promise<void> {
    return async (ctx: IContext) => {
      let i = 0;
      const next = async (): Promise<void> => {
        const middleware = stack[i++];
        if (!middleware) return;

        // Check if middleware is a function or object/class with handle method
        if (typeof middleware === "function") {
          const result = (middleware as RequestHandler)(ctx, next);
          if (result instanceof Promise) {
            await result;
          }
          return;
        } else if (
          middleware &&
          typeof middleware === "object" &&
          typeof middleware.handle === "function"
        ) {
          const result = middleware.handle(ctx, next);
          if (result instanceof Promise) {
            await result;
          }
          return;
        } else {
          throw new Error(
            `Invalid middleware at position ${
              i - 1
            }: must be a function or object with handle method`
          );
        }
      };
      await next();
    };
  }
}
