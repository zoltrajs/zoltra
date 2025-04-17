import { IncomingMessage, ServerResponse } from "http";
import { Logger } from "../utils/logger";
import path from "path";
import { existsSync, readdirSync } from "fs";
import { Route, ZoltraNext } from "../types";
import { parse, pathToFileURL } from "url";

export class RouteHandler {
  private routes: Route[] = [];
  private logger = new Logger("RouteHandler");

  public async loadRoutes() {
    try {
      // Load route modules dynamically (file-based routing)
      const routeModules = await this.importRouteModules();

      // Flatten all routes into single array
      this.routes = routeModules.flat();

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
            return this.loadRouteModule(modulePath);
          })
        );
      }

      return Promise.all(
        files.map(async (file) => {
          const modulePath = path.join(routesDir, file);
          const routeURL = pathToFileURL(modulePath).href;
          return this.loadRouteModule(routeURL);
        })
      );
    } catch (error) {
      this.logger.error("Error reading routes directory", error as Error);
      throw new Error(`Failed to read routes directory: ${routesDir}`);
    }
  }

  private async loadRouteModule(modulePath: string): Promise<Route[]> {
    try {
      const { isTypeScript } = this.getRoutesDirectory();

      if (isTypeScript) {
        const module = require(modulePath);
        this.logModuleError(module, modulePath);
        return module.routes || [];
      }

      const module = await import(modulePath);
      this.logModuleError(module, modulePath);
      return module.routes || [];
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
    req: IncomingMessage,
    res: ServerResponse,
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

      this.logger.debug("Executing route handler");
      await route.handler(req, res, next);

      this.logger.debug("Request completed successfully");
    } catch (error) {
      const err = error as Error;
      this.logger.error("Request handling failed", {
        name: "RequestHandlerError",
        message: err.message,
        stack: err.stack,
      });

      res.statusCode = 500;
      res.end(JSON.stringify({ error: "Internal Server Error" }));
    }
  }

  private findMatchingRoute(
    path: string,
    method: string,
    req: IncomingMessage
  ): Route | undefined {
    // Add debug logging
    this.logger.debug("Available routes:", {
      routes: this.routes.map((r) => `${r.method} ${r.path}`),
    });

    this.logger.debug(`Looking for: ${method} ${path}`);

    const route = this.routes.find((route) => {
      const methodMatches = route.method === method;
      const pathMatches = this.pathMatches(route.path, path);

      this.logger.debug(`Testing route: ${route.method} ${route.path}`, {
        methodMatches,
        pathMatches,
      });

      return methodMatches && pathMatches;
    });

    if (route) {
      this.logger.debug(`Matched route: ${route.method} ${route.path}`);
      this.extractPathParams(route.path, path, req);
      this.extractPathQuery(req);
    } else {
      this.logger.debug("No route matched");
    }

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
}
