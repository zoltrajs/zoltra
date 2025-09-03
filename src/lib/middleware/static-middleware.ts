import { extname } from "path";
import { Context } from "../core/context";
import { FileServer } from "../utils/file-server";
import { StaticMiddlewareOptions } from "../../types";

/**
 * Static file serving middleware
 */
export class Static {
  private fileServer: FileServer;

  constructor(root: string, options: StaticMiddlewareOptions = {}) {
    this.fileServer = new FileServer(root, options);
  }

  async handle(context: Context, next: () => Promise<void>): Promise<void> {
    // Only handle GET and HEAD requests
    if (!["GET", "HEAD"].includes(context.method)) {
      await next();
      return;
    }

    // Only try to serve static files, not API routes
    if (this._shouldServeStaticFile(context.path)) {
      console.log("context.path:", context.path);
      // Try to serve the file
      await this.fileServer.serveFile(context, context.path);

      // If file was served, don't call next()
      if (context.sent) {
        return;
      }
    }

    // Continue to next middleware/route
    await next();
  }

  /**
   * Check if the request path should be served as a static file
   */
  private _shouldServeStaticFile(path: string): boolean {
    // Don't serve API routes
    if (path.startsWith("/api/") || path.includes("/api")) {
      return false;
    }

    // Serve files with extensions
    if (this._hasFileExtension(path)) {
      return true;
    }

    // Serve root path (for index.html)
    if (path === "/" || path === "") {
      return true;
    }

    // Don't serve other paths without extensions (likely API routes)
    return false;
  }

  /**
   * Check if path has a file extension
   */
  private _hasFileExtension(path: string): boolean {
    const ext = extname(path);
    return !!(ext && ext.length > 1);
  }
}
