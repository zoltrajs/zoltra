import { Methods, ZoltraHandler } from "../types";
import { Router } from "../core/router";
import { join } from "path";
import { existsSync } from "fs";

class TRouter extends Router {
  constructor() {
    super(true);
  }

  mockRoute(path: string, method: Methods, handler: ZoltraHandler) {
    this._addRoute(path, method, handler);
  }

  public getRoutesDirectory() {
    const isTypeScript = existsSync(join(process.cwd(), "tsconfig.json"));
    let routesDir = join(process.cwd(), `test`, "routes");

    // Handle compiled JavaScript in dist directory
    if (isTypeScript) {
      routesDir = join(process.cwd(), `dist`, "test", "routes");
    }

    return { isTypeScript, routesDir };
  }
}

export default TRouter;
