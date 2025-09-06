import { join } from "path";
import { pathToRegexp } from "path-to-regexp";
import { RequestHandler, Handler, IContext, IRouter, Route } from "../../types";
import { Logger } from "../utils/logger";
import { promises as fs } from "fs";
import path, { resolve } from "path";

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
      await this._loadFileRoutes(join(process.cwd(), "routes"));
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

  /**
   * Convert file path to route path
   * @private
   */
  _filePathToRoutePath(filePath: string): string {
    let routePath = filePath.replace(/\\/g, "/");
    routePath = routePath.replace(/\.(js|mjs|cjs|ts)$/, "");

    if (routePath.endsWith("/index")) {
      routePath = routePath.slice(0, -6);
    }

    routePath = routePath.replace(/\[([^\]]+)\]/g, ":$1");

    if (!routePath.startsWith("/")) {
      routePath = "/" + routePath;
    }

    if (routePath === "") {
      routePath = "/";
    }

    return routePath;
  }

  async _loadFileRoutes(routesDir: string, currentPath: string = "") {
    const files = await fs.readdir(routesDir, { withFileTypes: true });

    for (const file of files) {
      const fullPath = path.join(routesDir, file.name);
      const relativePath = path.join(currentPath, file.name);

      if (file.isDirectory()) {
        await this._loadFileRoutes(fullPath, relativePath); // recurse into subdirs
      } else if (
        file.isFile() &&
        (file.name.endsWith(".ts") || file.name.endsWith(".js"))
      ) {
        // ✅ Build route path from file path
        const routePath = this._filePathToRoutePath(relativePath);

        // ✅ Dynamic import only once (at startup)
        const absolutePath = resolve(fullPath);
        const fileUrl = new URL(`file:///${absolutePath.replace(/\\/g, "/")}`)
          .href;
        const module = await import(fileUrl);

        // Default export = handler
        const handler = module.default;
        // Optional export = middlewares
        const middlewares = module.middlewares || [];

        if (typeof handler === "function") {
          // ✅ Register GET by default, or expose more if needed
          this.addRoute("GET", routePath, handler, middlewares);
        } else if (
          module.GET ||
          module.POST ||
          module.PUT ||
          module.PATCH ||
          module.DELETE
        ) {
          Object.entries(module).forEach(([method, handler]) => {
            if (typeof handler === "function") {
              this.addRoute(method, routePath, handler as any, middlewares);
            }
          });
        } else this._logModuleError();
      }
    }
  }

  private async _logModuleError() {
    this.logger.error(
      "Route module configuration error - Missing handler export",
      {
        problem: "Route file does not export a handler",
        solution:
          "Ensure your route file exports a default handler or method using:",
        codeExample: {
          "[default: handler]":
            "export default async function handler(context){...}",
          "[GET|POST|PATCH|POST|PUT]":
            "export const [METHOD] = async (context) => {...}",
        },
      }
    );
  }
}
