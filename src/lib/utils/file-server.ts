import {
  readFileSync,
  statSync,
  existsSync,
  readdirSync,
  createReadStream,
  Stats,
} from "fs";
import { join, extname, resolve } from "path";
import { DirectoryItem, FileServerOptions } from "../../types/utils";
import { IContext } from "../../types";
import mime from "mime-types";

/**
 * File server utility for serving static files
 */
export class FileServer {
  private root: string;
  private options: Required<FileServerOptions>;
  private mimeTypes: Record<string, string>;

  constructor(root: string = "./public", options: FileServerOptions = {}) {
    this.root = resolve(root);
    this.options = {
      index: "index.html",
      maxAge: 0,
      etag: true,
      lastModified: true,
      directoryListing: false,
      ...options,
    };

    // MIME types mapping
    this.mimeTypes = {
      ".html": "text/html",
      ".css": "text/css",
      ".js": "application/javascript",
      ".json": "application/json",
      ".png": "image/png",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".gif": "image/gif",
      ".svg": "image/svg+xml",
      ".ico": "image/x-icon",
      ".txt": "text/plain",
      ".xml": "application/xml",
      ".pdf": "application/pdf",
      ".zip": "application/zip",
      ".mp4": "video/mp4",
      ".mp3": "audio/mpeg",
      ".woff": "font/woff",
      ".woff2": "font/woff2",
    };
  }

  /**
   * Serve a file
   */
  async serveFile(context: IContext, filePath: string): Promise<void> {
    try {
      const fullPath = join(this.root, filePath);

      // Security check - prevent directory traversal
      if (!this._isPathSafe(fullPath)) {
        context.status(403).json({ error: "Access denied" });
        return;
      }

      // Check if file exists
      if (!existsSync(fullPath)) {
        context.status(404).json({ error: "File not found" });
        return;
      }

      const stats = statSync(fullPath);

      // Handle directories
      if (stats.isDirectory()) {
        this._serveDirectory(context, fullPath, filePath);
        return;
      }

      // Handle files
      this._serveFile(context, fullPath, stats);
    } catch (error) {
      console.error("File server error:", error);
      context.status(500).json({ error: "Internal server error" });
    }
  }

  /**
   * Serve a directory (with optional index file or directory listing)
   */
  private _serveDirectory(
    context: IContext,
    fullPath: string,
    requestPath: string
  ): void {
    const indexPath = join(fullPath, this.options.index);

    if (existsSync(indexPath)) {
      const stats = statSync(indexPath);
      this._serveFile(context, indexPath, stats);
      return;
    }

    if (this.options.directoryListing) {
      this._serveDirectoryListing(context, fullPath, requestPath);
      return;
    }

    // For root path, don't send 404 - let it fall through to routes
    if (requestPath === "/" || requestPath === "") {
      return;
    }

    context.status(404).json({ error: "File not found" });
  }

  /**
   * Serve a file
   */
  private _serveFile(context: IContext, fullPath: string, stats: Stats): void {
    const ext = extname(fullPath).toLowerCase();
    const mimeType =
      mime.lookup(fullPath) ||
      this.mimeTypes[ext] ||
      "application/octet-stream";

    context.set("Content-Type", mimeType);

    if (this.options.maxAge > 0) {
      context.set("Cache-Control", `public, max-age=${this.options.maxAge}`);
    }

    if (this.options.lastModified) {
      context.set("Last-Modified", stats.mtime.toUTCString());
    }

    context.set("Content-Length", stats.size.toString());

    if (stats.size > 1024 * 1024) {
      this._serveLargeFile(context, fullPath, stats);
      return;
    }

    const content = readFileSync(fullPath);
    context.send(content);
  }

  /**
   * Serve large files using streams
   */
  private _serveLargeFile(
    context: IContext,
    fullPath: string,
    stats: Stats
  ): void {
    const stream = createReadStream(fullPath);

    context.set("Accept-Ranges", "bytes");
    context.set("Content-Length", stats.size.toString());

    stream.on("error", (error) => {
      console.error("Stream error:", error);
      if (!context.sent) {
        context.status(500).json({ error: "Stream error" });
      }
    });

    const res = context.res;
    res.writeHead(
      context.statusCode,
      Object.fromEntries(
        Object.entries(context.headers).map(([k, v]) => [k.toLowerCase(), v])
      )
    );

    stream.pipe(res);
    context.sent = true;
  }

  /**
   * Serve directory listing
   */
  private _serveDirectoryListing(
    context: IContext,
    fullPath: string,
    requestPath: string
  ): void {
    try {
      const items = readdirSync(fullPath, { withFileTypes: true });

      const listing: DirectoryItem[] = items.map((item) => ({
        name: item.name,
        type: item.isDirectory() ? "directory" : "file",
        size: item.isFile() ? statSync(join(fullPath, item.name)).size : 0,
        modified: item.isFile()
          ? statSync(join(fullPath, item.name)).mtime.toISOString()
          : null,
      }));

      const html = this._generateDirectoryHTML(requestPath, listing);
      context.set("Content-Type", "text/html");
      context.html(html);
    } catch (error) {
      console.error("Directory listing error:", error);
      context.status(500).json({ error: "Directory listing failed" });
    }
  }

  /**
   * Generate HTML for directory listing
   */
  private _generateDirectoryHTML(
    requestPath: string,
    items: DirectoryItem[]
  ): string {
    const title = `Directory: ${requestPath}`;
    const rows = items
      .map(
        (item) => `
        <tr>
          <td>${item.type === "directory" ? "📁" : "📄"}</td>
          <td><a href="${join(requestPath, item.name)}">${item.name}</a></td>
          <td>${item.size ? this._formatBytes(item.size) : ""}</td>
          <td>${item.modified || ""}</td>
        </tr>
      `
      )
      .join("");

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>${title}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 20px; }
          table { border-collapse: collapse; width: 100%; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f2f2f2; }
          a { color: #0066cc; text-decoration: none; }
          a:hover { text-decoration: underline; }
        </style>
      </head>
      <body>
        <h1>${title}</h1>
        <table>
          <thead>
            <tr>
              <th>Type</th>
              <th>Name</th>
              <th>Size</th>
              <th>Modified</th>
            </tr>
          </thead>
          <tbody>
            ${rows}
          </tbody>
        </table>
      </body>
      </html>
    `;
  }

  /**
   * Format bytes to human readable format
   */
  private _formatBytes(bytes: number): string {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
  }

  /**
   * Check if path is safe (prevent directory traversal)
   */
  private _isPathSafe(requestPath: string): boolean {
    const resolvedPath = resolve(this.root, requestPath);
    return resolvedPath.startsWith(this.root);
  }

  /**
   * Get MIME type for file extension
   */
  getMimeType(ext: string): string {
    return (
      mime.lookup(ext) ||
      this.mimeTypes[ext.toLowerCase()] ||
      "application/octet-stream"
    );
  }
}
