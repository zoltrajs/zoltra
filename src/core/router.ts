import { IncomingMessage, ServerResponse } from "http";
import { Logger } from "../utils/logger";
import path from "path";
import { existsSync, readdirSync } from "fs";
import {
  Methods,
  Route,
  ZoltraHandler,
  ZoltraNext,
  ZoltraRequest,
  ZoltraResponse,
} from "../types";
import { parse, pathToFileURL } from "url";
import RouteCache from "./cache/route-cache";

export class Router {
  private routes: Route[] = [];
  private logger = new Logger("Router");
  private cacheEnabled: boolean = false;
  private _homeRoute: Route | null = null;
  private cache: RouteCache;

  constructor() {
    this.cache = new RouteCache();
    this.initializeRouteCache();
  }

  private initializeRouteCache() {
    if (this.cacheEnabled) {
      this.cache.init(this.routes).catch((error) => {
        this.logger.debug(`Failed to initialize route cache: ${error.message}`);
      });
    }
  }

  public setCacheEnabled(_enabled: boolean) {
    this.cacheEnabled = _enabled;
  }

  public addRoute(path: string, method: Methods, handler: ZoltraHandler) {
    if (typeof handler !== "function") {
      throw new Error(`Handler for ${method} ${path} must be a function`);
    }

    this._homeRoute = { path, method, handler };
  }

  public async loadRoutes() {
    try {
      // Load route modules dynamically (file-based routing)
      const routeModules = await this.importRouteModules();

      // Flatten all routes into single array
      this.routes = routeModules.flat();

      if (this._homeRoute) {
        this.routes.unshift(this._homeRoute);
      }

      this.logger.info(`Loaded ${this.routes.length} routes`);
    } catch (error) {
      this.logger.error("Failed to load routes", error as Error);
      throw error;
    }
  }

  private async importRouteModules(): Promise<Route[][]> {
    const { isTypeScript, routesDir } = this.getRoutesDirectory();
    const filePattern = isTypeScript ? /\.(js|ts)$/ : /\.js$/;
    const excludePattern = /^(index|\.test|\.spec)\.(js|ts)$/;

    try {
      const files = readdirSync(routesDir).filter(
        (file) => filePattern.test(file) && !excludePattern.test(file)
      );

      this.logger.debug(`Found route files: ${files.join(", ")}`, {
        directory: routesDir,
      });

      if (isTypeScript) {
        return Promise.all(
          files.map(async (file) => {
            const modulePath = path.join(routesDir, file);
            const basePath = file.replace(/\.(js|ts)$/, "");
            return this.loadRouteModule(modulePath, basePath);
          })
        );
      }

      return Promise.all(
        files.map(async (file) => {
          const modulePath = path.join(routesDir, file);
          const routeURL = pathToFileURL(modulePath).href;
          const basePath = file.replace(/\.(js|ts)$/, "");
          return this.loadRouteModule(routeURL, basePath);
        })
      );
    } catch (error) {
      this.logger.error("Error reading routes directory", error as Error);
      throw new Error(`Failed to read routes directory: ${routesDir}`);
    }
  }

  private async loadRouteModule(
    modulePath: string,
    basePath: string
  ): Promise<Route[]> {
    try {
      const { isTypeScript } = this.getRoutesDirectory();

      if (isTypeScript) {
        const module = require(modulePath);
        this.logModuleError(module, modulePath);
        const routes: Route[] = module.routes || [];
        const modifiedRoutes = this.prefixRoutesWithBasePath(routes, basePath);
        return modifiedRoutes;
      }

      const module = await import(modulePath);
      this.logModuleError(module, modulePath);
      const routes: Route[] = module.routes || [];
      const modifiedRoutes = this.prefixRoutesWithBasePath(routes, basePath);
      return modifiedRoutes;
    } catch (error) {
      this.logger.error(
        `Failed to load route module: ${modulePath}`,
        error as Error
      );
      return [];
    }
  }

  private logModuleError(module: any, modulePath: string) {
    if (!module.routes) {
      this.logger.error(
        "Route module configuration error - Missing required 'routes' export",
        undefined,
        {
          problem: "Route file does not export a 'routes' array",
          solution: "Ensure your route file exports an array of routes using:",
          codeExample: "export const routes = defineRoutes([...])",
          commonMistakes: [
            "Using 'export default' instead of named export",
            "Misspelling the export (e.g., 'route' instead of 'routes')",
          ],
          modulePath: modulePath,
        }
      );
    }
  }

  private getRoutesDirectory() {
    const isTypeScript = existsSync(path.join(process.cwd(), "tsconfig.json"));
    let routesDir = path.join(process.cwd(), "routes");

    // Handle compiled JavaScript in dist directory
    if (isTypeScript) {
      routesDir = path.join(process.cwd(), "dist/routes");
    }

    return { isTypeScript, routesDir };
  }

  public async handle(
    req: ZoltraRequest,
    res: ZoltraResponse,
    next: ZoltraNext
  ) {
    try {
      this.logger.debug("Starting request handling");

      const url = new URL(req.url || "", `http://${req.headers.host}`);
      const path = url.pathname;
      const method = req.method || "GET";

      this.logger.debug(`Processing ${method} ${path}`);

      const route = this.findMatchingRoute(path, method, req);

      if (!route) {
        this.logger.debug("No route found, sending 404");
        res.statusCode = 404;
        return res.json({ error: "Not Found", success: false });
      }

      this.logger.debug("Running middleware chain");
      await this.runMiddleware(route, req, res);

      if (res.headersSent) return;

      this.logger.debug("Executing route handler");
      await route.handler(req, res, next);

      this.logger.debug("Request completed successfully");
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Route handler error for ${req.url}`, {
        name: "RouteHandlerError",
        message: err.message,
        stack: err.stack,
      });

      res.status(500).json({
        error: `Route handler error for ${req.url}`,
        message: err.message,
        success: false,
      });
    }
  }

  private _findMatchingRoute(
    path: string,
    method: string,
    req: IncomingMessage
  ): Route | undefined {
    let toTalTime = 0;

    const start = process.hrtime.bigint();
    const route = this.routes.find((route) => {
      const methodMatches = route.method === method;
      const pathMatches = this.pathMatches(route.path, path);

      return methodMatches && pathMatches;
    });

    if (route) {
      this.extractPathParams(route.path, path, req);
      this.extractPathQuery(req);
    } else {
      this.logger.debug("No route matched");
    }

    const end = process.hrtime.bigint();
    toTalTime += Number(end - start) / 1e6;

    this.logger.debug(`Total time: ${toTalTime.toFixed(3)} ms`);

    return route;
  }

  private findMatchingRoute(
    path: string,
    method: string,
    req: IncomingMessage
  ): Route | undefined {
    if (this.cacheEnabled) {
      return this.findMatchingCachedRoute(path, method, req);
    } else return this._findMatchingRoute(path, method, req);
  }

  private findMatchingCachedRoute(
    path: string,
    method: string,
    req: IncomingMessage
  ): Route | undefined {
    let toTalTime = 0;

    const start = process.hrtime.bigint();
    // Try cache first, passing pathMatches for dynamic routes
    let route = this.cache.getRoute(path, method, this.pathMatches.bind(this));

    // If no exact match in cache, check routes with pathMatches
    if (!route) {
      route = this.routes.find((r) => {
        const methodMatches = r.method === method;
        const pathMatches = this.pathMatches(r.path, path);
        return methodMatches && pathMatches;
      });

      // Cache the result for future lookups
      if (route) {
        const currentRoutes = this.cache.getRoutes();
        if (
          !currentRoutes.some(
            (r) => r.path === route!.path && r.method === route!.method
          )
        ) {
          this.cache.updateRoutes([...currentRoutes, route]).catch((error) => {
            this.logger.debug(`Failed to update cache: ${error.message}`);
          });
        }
      }
    }

    if (route) {
      this.extractPathParams(route.path, path, req);
      this.extractPathQuery(req);
    } else {
      this.logger.debug("No route matched");
    }

    const end = process.hrtime.bigint();
    toTalTime += Number(end - start) / 1e6;

    this.logger.debug(`Total time: ${toTalTime.toFixed(3)} ms`);

    return route;
  }

  private pathMatches(routePath: string, requestPath: string): boolean {
    // Remove query parameters
    const cleanRequestPath = requestPath.split("?")[0];

    // Exact match
    if (routePath === cleanRequestPath) return true;

    // Parametric match (/users/:id)
    const routeParts = routePath.split("/");
    const requestParts = cleanRequestPath.split("/");

    if (routeParts.length !== requestParts.length) return false;

    return routeParts.every(
      (part, i) => part.startsWith(":") || part === requestParts[i]
    );
  }

  private extractPathParams(
    routePath: string,
    requestPath: string,
    req: IncomingMessage
  ) {
    const routeParts = routePath.split("/");
    const requestParts = requestPath.split("/");

    req.params = req.params || {};

    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(":")) {
        const paramName = routeParts[i].substring(1);
        req.params[paramName] = requestParts[i];
      }
    }
  }

  private extractPathQuery(req: IncomingMessage) {
    const parsedUrl = parse(req.url!, true);
    const queries = parsedUrl.query;

    req.query = queries || {};
  }

  private async runMiddleware(
    route: Route,
    req: IncomingMessage,
    res: ServerResponse
  ) {
    if (!route.middleware || route.middleware.length === 0) {
      return;
    }

    // Create middleware chain
    const middlewareChain = route.middleware.reduceRight<() => Promise<void>>(
      (next, middleware) => async () => {
        await middleware(req, res, next);
      },
      async () => {} // Final no-op function
    );

    await middlewareChain();
  }

  private prefixRoutesWithBasePath(routes: Route[], basePath: string): Route[] {
    if (!basePath) return routes; // Return original if no basePath

    // Normalize basePath - remove leading/trailing slashes
    const normalizedBasePath = basePath.replace(/^\/|\/$/g, "");

    return routes.map((route) => {
      if (!route.path) return route; // Skip if no path exists

      // Normalize route path - remove leading slashes
      const normalizedRoutePath = route.path.replace(/^\//, "");

      // Handle empty path case
      const finalPath = normalizedRoutePath
        ? `/${normalizedBasePath}/${normalizedRoutePath}`
        : `/${normalizedBasePath}`;

      // Remove any duplicate slashes that may have been created
      return {
        ...route,
        path: finalPath.replace(/\/+/g, "/"),
      };
    });
  }
}
