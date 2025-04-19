import * as fs from "fs";
import * as path from "path";
import { Route, ZoltraHandler } from "../../types";
import { CACHE_DIR } from "core/constants";

// Function to generate unique identifiers for functions
const generateFunctionId = (() => {
  let counter = 0;
  return (fn: ZoltraHandler) => {
    const name = fn.name || `anonymous_${counter++}`;
    return name;
  };
})();

class RouteCache {
  private cacheFile: string;
  private routeMap: Map<string, Route>; // Map of method:path to Route
  private cacheDir: string;
  private functionRegistry: { [key: string]: ZoltraHandler };

  constructor(
    cacheDir: string = CACHE_DIR,
    cacheFileName: string = "routes-cache.json",
    functionRegistry: ZoltraHandler[] = []
  ) {
    this.cacheDir = cacheDir;
    this.cacheFile = path.join(cacheDir, cacheFileName);
    this.routeMap = new Map();
    this.functionRegistry = {};

    // Populate function registry with provided functions
    functionRegistry.forEach((fn) => {
      const id = generateFunctionId(fn);
      this.functionRegistry[id] = fn;
    });

    // Ensure cache directory exists
    if (!fs.existsSync(this.cacheDir)) {
      fs.mkdirSync(this.cacheDir, { recursive: true });
    }
  }

  // Initialize cache: load from file or build fresh
  async init(routes: Route[]): Promise<void> {
    // Update function registry with any new handlers/middleware from routes
    this.updateFunctionRegistry(routes);

    if (fs.existsSync(this.cacheFile)) {
      await this.loadFromCache();
    } else {
      routes.forEach((route) => {
        this.routeMap.set(`${route.method}:${route.path}`, route);
      });
      await this.saveToCache();
    }
  }

  // Update function registry with handlers and middleware from routes
  private updateFunctionRegistry(routes: Route[]): void {
    routes.forEach((route) => {
      if (typeof route.handler === "function") {
        const id = generateFunctionId(route.handler);
        this.functionRegistry[id] = route.handler;
      }
      if (route.middleware) {
        route.middleware.forEach((mw) => {
          if (typeof mw === "function") {
            const id = generateFunctionId(mw);
            this.functionRegistry[id] = mw;
          }
        });
      }
    });
  }

  // Save routes to cache file
  private async saveToCache(): Promise<void> {
    try {
      // Serialize routes from routeMap
      const serializedRoutes = Array.from(this.routeMap.values()).map(
        (route) => ({
          ...route,
          handler:
            typeof route.handler === "function"
              ? generateFunctionId(route.handler)
              : route.handler,
          middleware: route.middleware?.map((mw) =>
            typeof mw === "function" ? generateFunctionId(mw) : mw
          ),
        })
      );

      await fs.promises.writeFile(
        this.cacheFile,
        JSON.stringify(serializedRoutes, null, 2)
      );
    } catch (error) {
      console.error("Error saving routes to cache:", error);
    }
  }

  // Load routes from cache file
  private async loadFromCache(): Promise<void> {
    try {
      const data = await fs.promises.readFile(this.cacheFile, "utf-8");
      const cachedRoutes: Route[] = JSON.parse(data);

      // Clear existing map and populate with cached routes
      this.routeMap.clear();
      cachedRoutes.forEach((route) => {
        const deserializedRoute = {
          ...route,
          handler: this.functionRegistry[route.handler as any] || route.handler,
          middleware: route.middleware?.map(
            (mw) => this.functionRegistry[mw as any] || mw
          ),
        };
        this.routeMap.set(
          `${deserializedRoute.method}:${deserializedRoute.path}`,
          deserializedRoute
        );
      });
    } catch (error) {
      console.error("Error loading routes from cache:", error);
      this.routeMap.clear();
    }
  }

  // Get route by path and method for exact matches, fallback for dynamic routes)
  getRoute(
    path: string,
    method: string,
    pathMatches?: (routePath: string, requestPath: string) => boolean
  ): Route | undefined {
    // Try exact match first
    const exactRoute = this.routeMap.get(`${method}:${path}`);
    if (exactRoute) {
      return exactRoute;
    }

    // Fallback to dynamic matching if pathMatches is provided
    if (pathMatches) {
      for (const route of this.routeMap.values()) {
        if (route.method === method && pathMatches(route.path, path)) {
          return route;
        }
      }
    }

    return undefined;
  }

  // Get all cached routes
  getRoutes(): Route[] {
    return Array.from(this.routeMap.values());
  }

  // Update routes and refresh cache
  async updateRoutes(newRoutes: Route[]): Promise<void> {
    this.routeMap.clear();
    newRoutes.forEach((route) => {
      this.routeMap.set(`${route.method}:${route.path}`, route);
    });
    this.updateFunctionRegistry(newRoutes);
    await this.saveToCache();
  }
}

export default RouteCache;
