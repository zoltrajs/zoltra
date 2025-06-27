import {
  ZoltraRequest,
  ZoltraResponse,
  ZoltraNext,
  StaticOptions,
} from "../types";
import fs from "fs";
import path from "path";
import { createBrotliCompress, createGzip, createDeflate } from "zlib";
import mime from "mime-types";
import etag from "etag";
import { Logger } from "../utils";

function parseRange(size: number, rangeHeader: string) {
  const bytes = rangeHeader.replace(/bytes=/, "").split("-");
  const start = parseInt(bytes[0], 10);
  const end = bytes[1] ? parseInt(bytes[1], 10) : size - 1;

  if (isNaN(start) || isNaN(end) || start > end || end >= size) {
    return null;
  }

  return { start, end };
}

function isFresh(req: ZoltraRequest, headers: Record<string, string>) {
  if (req.headers["cache-control"]?.includes("no-cache")) return false;

  const ifNoneMatch = req.headers["if-none-match"];
  if (ifNoneMatch && headers["ETag"]) {
    return ifNoneMatch.split(/\s*,\s*/).includes(headers["ETag"]);
  }

  const ifModifiedSince = req.headers["if-modified-since"];
  if (ifModifiedSince && headers["Last-Modified"]) {
    return new Date(ifModifiedSince) >= new Date(headers["Last-Modified"]);
  }

  return false;
}

function createSafeStream(
  filePath: string,
  range?: { start: number; end: number },
  res?: ZoltraResponse
) {
  const stream = fs.createReadStream(filePath, range);
  stream.on("error", (err) => {
    console.error("Stream error:", err);
    if (res && !res.headersSent) {
      res.status(500).end("Internal Server Error");
    }
  });
  return stream;
}

export function serveStatic(rootDir: string, options: StaticOptions) {
  const logger = new Logger("StaticHandler");

  if (!options?.prefix) {
    throw new Error("serveStatic missing required option 'prefix'");
  }

  const {
    prefix = "",
    extensions = [],
    etag: useEtag = true,
    lastModified = true,
    acceptRanges = true,
    cacheControl = true,
    maxAge = 0,
    immutable = false,
    fallthrough = true,
    mimeTypes = {},
    debug = false,
  } = options;

  return async (req: ZoltraRequest, res: ZoltraResponse, next?: ZoltraNext) => {
    try {
      // 1. Sanitize and resolve URL path
      let urlPath = req.url || "/";
      urlPath = urlPath.split("?")[0].split("#")[0];

      const normalizedPrefix = prefix
        ? `/${prefix.replace(/^\/|\/$/g, "")}`
        : "";

      if (normalizedPrefix && !urlPath.startsWith(normalizedPrefix)) {
        return fallthrough ? next?.() : res.status(404).end();
      }

      const relativePath = normalizedPrefix
        ? urlPath.slice(normalizedPrefix.length) || "/"
        : urlPath;

      let sanitizedPath;
      try {
        sanitizedPath = path
          .normalize(decodeURIComponent(relativePath))
          .replace(/^(\.\.[\/\\])+/, "");
      } catch {
        return res.status(400).end("Bad Request");
      }

      // 2. Resolve and validate file path
      const filePath = path.join(path.resolve(rootDir), sanitizedPath);

      if (!filePath.startsWith(path.resolve(rootDir))) {
        return res.status(403).end("Forbidden");
      }

      // 3. Check file existence
      let stats;
      try {
        stats = await fs.promises.stat(filePath);
      } catch {
        return fallthrough ? next?.() : res.status(404).end("Not Found");
      }

      let finalPath = filePath;

      // 4. Extension fallback
      if (!stats.isFile() && extensions.length && !path.extname(filePath)) {
        const files = await fs.promises.readdir(path.dirname(filePath));
        for (const ext of extensions) {
          const testFile = `${path.basename(filePath)}.${ext}`;
          if (files.includes(testFile)) {
            finalPath = path.join(path.dirname(filePath), testFile);
            stats = await fs.promises.stat(finalPath);
            break;
          }
        }
      }

      // 5. Ensure it's a file
      if (!stats.isFile()) {
        return fallthrough ? next?.() : res.status(404).end("Not Found");
      }

      // 6. Prepare response headers
      const resHeaders: Record<string, string> = {
        "Content-Type":
          mime.lookup(finalPath) ||
          mimeTypes[path.extname(finalPath)] ||
          "application/octet-stream",
        "Content-Length": stats.size.toString(),
      };

      if (useEtag) resHeaders["ETag"] = etag(stats);
      if (lastModified) resHeaders["Last-Modified"] = stats.mtime.toUTCString();
      if (acceptRanges) resHeaders["Accept-Ranges"] = "bytes";

      if (cacheControl) {
        const directives = [
          "public",
          maxAge && `max-age=${maxAge}`,
          immutable && "immutable",
        ].filter(Boolean);
        resHeaders["Cache-Control"] = directives.join(", ");
      }

      // 7. Handle HEAD requests
      if (req.method === "HEAD") {
        res.writeHead(200, resHeaders);
        return res.end();
      }

      // 8. Freshness check
      if (isFresh(req, resHeaders)) {
        return res.status(304).end();
      }

      // 9. Range requests
      if (acceptRanges && req.headers.range) {
        const range = parseRange(stats.size, req.headers.range);
        if (range) {
          res.writeHead(206, {
            ...resHeaders,
            "Content-Range": `bytes ${range.start}-${range.end}/${stats.size}`,
            "Content-Length": (range.end - range.start + 1).toString(),
          });
          return createSafeStream(finalPath, range, res).pipe(res);
        } else {
          res.writeHead(416, { "Content-Range": `bytes */${stats.size}` });
          return res.end();
        }
      }

      // 10. Compression (skip for range requests)
      const acceptEncoding = req.headers["accept-encoding"] || "";
      const stream = createSafeStream(finalPath, undefined, res);

      if (debug) {
        logger.debug(`Serving file: ${finalPath}`);
      }

      if (acceptEncoding.includes("br")) {
        res.setHeader("Content-Encoding", "br");
        stream.pipe(createBrotliCompress()).pipe(res);
      } else if (acceptEncoding.includes("gzip")) {
        res.setHeader("Content-Encoding", "gzip");
        stream.pipe(createGzip()).pipe(res);
      } else if (acceptEncoding.includes("deflate")) {
        res.setHeader("Content-Encoding", "deflate");
        stream.pipe(createDeflate()).pipe(res);
      } else {
        res.writeHead(200, resHeaders);
        stream.pipe(res);
      }
    } catch (err) {
      const error = err as Error;
      logger.error(`Static serving error: ${error.message}`);
      res.status(500).json("Internal Server Error");
    }
  };
}
