import { readdirSync, statSync } from "fs";
import { join, extname, resolve } from "path";
import {
  RequestHandler,
  Handler,
  StaticRoute,
  IContext,
  MatchResult,
  IRouter,
  MiddlewareObject,
} from "../../types";
import { Logger } from "../utils/logger";

export class Router implements IRouter {
  private routesDir: string;
  private staticRoutes: Map<string, StaticRoute>;
  private fileRoutes: Map<string, Handler>;
  private middlewares: Map<string, RequestHandler[]>;
  private logger: Logger;
  private routes: string[];

  constructor(routesDir: string = "./routes") {
    this.routesDir = routesDir;
    this.staticRoutes = new Map();
    this.fileRoutes = new Map();
    this.middlewares = new Map();
    this.logger = new Logger({ context: "Router" });
    this.routes = [];
  }

  /**
   * Load file-based routes from the routes directory
   */
  async loadRoutes(): Promise<void> {
    try {
      await this._loadRoutesFromDir(this.routesDir);
    } catch (error: any) {
      console.warn(
        "No routes directory found or error loading routes:",
        error.message
      );
    }
  }

  /**
   * Recursively load routes from directory
   * @private
   */
  private async _loadRoutesFromDir(
    dir: string,
    currentPath: string = ""
  ): Promise<void> {
    const entries = readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = join(currentPath, entry.name);

      if (entry.isDirectory()) {
        await this._loadRoutesFromDir(fullPath, relativePath);
      } else if (entry.isFile() && this._isRouteFile(entry.name)) {
        await this._loadRouteFile(fullPath, relativePath);
      }
    }
  }

  /**
   * Check if file is a valid route file
   * @private
   */
  private _isRouteFile(filename: string): boolean {
    const ext = extname(filename);
    return [".js", ".mjs", ".cjs"].includes(ext);
  }

  /**
   * Load a single route file
   * @private
   */
  private async _loadRouteFile(
    filePath: string,
    relativePath: string
  ): Promise<void> {
    try {
      const routePath = this._filePathToRoutePath(relativePath);

      const absolutePath = resolve(filePath);
      const fileUrl = new URL(`file:///${absolutePath.replace(/\\/g, "/")}`)
        .href;

      const routeModule: any = await import(fileUrl);

      if (typeof routeModule.middleware === "object") {
        // load middleware
        if (Array.isArray(routeModule.middleware)) {
          for (const middleware of routeModule.middleware) {
            this.addMiddleware(routePath, middleware);
          }
        } else {
          this.logger.error(
            `Invalid middleware export: Expected 'array' but received '${typeof routeModule.middleware}'`
          );
        }
      }

      if (typeof routeModule.default === "function") {
        this.fileRoutes.set(routePath, routeModule.default);
      } else if (typeof routeModule === "function") {
        this.fileRoutes.set(routePath, routeModule);
      } else if (
        routeModule.GET ||
        routeModule.POST ||
        routeModule.PUT ||
        routeModule.PATCH ||
        routeModule.DELETE
      ) {
        Object.entries(routeModule).forEach(([method, handler]) => {
          if (typeof handler === "function") {
            const methodPath = `${method.toUpperCase()} ${routePath}`;
            this.fileRoutes.set(methodPath, handler as Handler);
          }
        });
      } else {
        this._logModuleError();
      }
    } catch (error) {
      console.error(`Error loading route ${relativePath}:`, error);
    }
  }

  async handle(context: IContext): Promise<void> {
    const matched = await this.match(context);
    if (!matched) {
      this.logger.error(`Route not found: ${context.method} ${context.path}`);
      context.status(404).json({
        error: "Not Found",
        message: `Route ${context.method} ${context.path} not found`,
      });
      return;
    }

    if (matched.params) {
      context.params = { ...context.params, ...matched.params };
    }

    await this._runMiddleware(matched.middleware, context);

    if (context.sent) return;

    await matched.handler(context);
  }

  /**
   * @private
   */
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

  /**
   * @private
   */
  private async _runMiddleware(
    middlewares: (RequestHandler | MiddlewareObject)[],
    context: IContext
  ) {
    // Create middleware chain
    const middlewareChain = middlewares.reduceRight<() => Promise<void>>(
      (next, middleware) => async () => {
        // Check if middleware is an object or function
        if (typeof middleware === "function") {
          await middleware(context, next);
        } else if (typeof middleware === "object") {
          // Execute object handle
          await middleware.handle(context, next);
        }
      },
      async () => {}
    );

    await middlewareChain();
  }

  /**
   * Convert file path to route path
   * @private
   */
  private _filePathToRoutePath(filePath: string): string {
    let routePath = filePath.replace(/\\/g, "/");
    routePath = routePath.replace(/\.(js|mjs|cjs)$/, "");

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

  /**
   * Add a static route
   */
  addRoute(
    method: string,
    path: string,
    handler: Handler,
    middleware: RequestHandler[] = []
  ): void {
    const key = `${method.toUpperCase()} ${this._normalizePath(path)}`;
    this.staticRoutes.set(key, { handler, middleware });
  }

  /**
   * Add middleware for a specific route pattern
   */
  addMiddleware(
    pattern: string,
    middleware: RequestHandler | MiddlewareObject
  ): void {
    if (typeof middleware === "function") {
      const prev = this.middlewares.get(pattern);

      const updatedMiddleware = prev ? [...prev, middleware] : [middleware];

      this.middlewares.set(pattern, updatedMiddleware);
    } else if (
      typeof middleware === "object" &&
      typeof middleware.handle === "function"
    ) {
      const prev = this.middlewares.get(pattern);

      // Bind handle to middleware body
      const updatedMiddleware = prev
        ? [...prev, middleware.handle.bind(middleware)]
        : [middleware.handle.bind(middleware)];

      this.middlewares.set(pattern, updatedMiddleware);
    }
  }

  private _getMiddleware(pattern: string) {
    if (this.middlewares.has(pattern)) {
      return this.middlewares.get(pattern) || [];
    }

    return [];
  }

  /**
   * Match a request to a route
   */
  async match(context: IContext): Promise<MatchResult | null> {
    const method = context.method.toUpperCase();
    const path = this._normalizePath(context.path);

    const staticKey = `${method} ${path}`;
    if (this.staticRoutes.has(staticKey)) {
      const route = this.staticRoutes.get(staticKey)!;
      return {
        handler: route.handler,
        middleware: route.middleware,
        params: {},
        type: "static",
      };
    }

    const staticMatch = this._matchStaticRoute(method, path);
    if (staticMatch) {
      return {
        handler: staticMatch.handler,
        middleware: staticMatch.middleware,
        params: staticMatch.params,
        type: "static",
      };
    }

    const fileMatch = this._matchFileRoute(context, path);
    if (fileMatch) {
      return {
        handler: fileMatch.handler,
        middleware: fileMatch.middlewares,
        params: fileMatch.params,
        type: "file",
      };
    }

    return null;
  }

  /**
   * Match parameterized static routes
   * @private
   */
  private _matchStaticRoute(
    method: string,
    path: string
  ): {
    handler: Handler;
    middleware: RequestHandler[];
    params: Record<string, string>;
  } | null {
    for (const [routeKey, route] of this.staticRoutes) {
      if (routeKey.includes(":")) {
        const [routeMethod, routePath] = routeKey.split(" ");
        if (routeMethod === method && routePath.includes(":")) {
          const params = this._extractParams(routePath, path);
          if (params) {
            return {
              handler: route.handler,
              middleware: route.middleware,
              params,
            };
          }
        }
      }
    }
    return null;
  }

  /**
   * Match file-based routes with parameter extraction
   * @private
   */
  private _matchFileRoute(
    context: IContext,
    path: string
  ): {
    handler: Handler;
    params: Record<string, string>;
    middlewares: RequestHandler[];
  } | null {
    const method = context.method.toUpperCase();

    const directKey = `${method} ${path}`;
    if (this.fileRoutes.has(directKey)) {
      return {
        handler: this.fileRoutes.get(directKey)!,
        params: {},
        middlewares: this._getMiddleware(path),
      };
    }

    if (method === "GET" && this.fileRoutes.has(path)) {
      return {
        handler: this.fileRoutes.get(path)!,
        params: {},
        middlewares: this._getMiddleware(path),
      };
    }

    if (method === "GET" && path === "/" && this.fileRoutes.has("/index")) {
      return {
        handler: this.fileRoutes.get("/index")!,
        params: {},
        middlewares: this._getMiddleware("/index"),
      };
    }

    for (const [routePath, handler] of this.fileRoutes) {
      if (routePath.includes(":")) {
        const params = this._extractParams(routePath, path);
        if (params)
          return {
            handler,
            params,
            middlewares: this._getMiddleware(routePath),
          };
      }
    }

    for (const [routeKey, handler] of this.fileRoutes) {
      if (routeKey.includes(" ") && routeKey.includes(":")) {
        const [routeMethod, routePath] = routeKey.split(" ");
        if (routeMethod === method && routePath.includes(":")) {
          const params = this._extractParams(routePath, path);
          if (params)
            return {
              handler,
              params,
              middlewares: this._getMiddleware(routeKey) || [],
            };
        }
      }
    }

    return null;
  }

  /**
   * Extract parameters from parameterized route
   * @private
   */
  private _extractParams(
    routePath: string,
    requestPath: string
  ): Record<string, string> | null {
    const routeParts = routePath.split("/");
    const requestParts = requestPath.split("/");

    if (routeParts.length !== requestParts.length) {
      return null;
    }

    const params: Record<string, string> = {};

    for (let i = 0; i < routeParts.length; i++) {
      const routePart = routeParts[i];
      const requestPart = requestParts[i];

      if (routePart.startsWith(":")) {
        params[routePart.slice(1)] = decodeURIComponent(requestPart);
      } else if (routePart !== requestPart) {
        return null;
      }
    }

    return params;
  }

  /**
   * Normalize path by removing trailing slashes and ensuring leading slash
   * @private
   */
  private _normalizePath(path: string): string {
    let normalized = path.replace(/\/+$/, "");
    if (!normalized.startsWith("/")) {
      normalized = "/" + normalized;
    }
    return normalized || "/";
  }

  /**
   * Get all registered routes for debugging
   */
  getRoutes(): { static: string[]; file: string[] } {
    return {
      static: Array.from(this.staticRoutes.keys()),
      file: Array.from(this.fileRoutes.keys()),
    };
  }
}
