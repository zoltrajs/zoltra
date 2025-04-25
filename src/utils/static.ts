import { ZoltraRequest, ZoltraResponse, StaticOptions } from "../types";
import fs from "fs";
import path from "path";
import { createBrotliCompress, createGzip, createDeflate } from "zlib";
import mime from "mime-types";
import etag from "etag";
import { PassThrough } from "stream";

// Helper for range requests
function parseRange(size: number, rangeHeader: string) {
  const bytes = rangeHeader.replace(/bytes=/, "").split("-");
  const start = parseInt(bytes[0], 10);
  const end = bytes[1] ? parseInt(bytes[1], 10) : size - 1;

  if (isNaN(start) || isNaN(end) || start > end || end >= size) {
    return null;
  }

  return { start, end };
}

export function serverStatic(rootDir: string, options: StaticOptions) {
  return (req: ZoltraRequest, res: ZoltraResponse) => {
    console.log("[ZOLTRA-INTERNAL] Root dir:", rootDir);
    console.log("[ZOLTRA-INTERNAL] Requested path:", req.url);

    // const filePath = path.join(rootDir);
    const file = path.basename(req.url as string);
    const filePath = path.join(rootDir, file);
    console.log("[ZOLTRA-INTERNAL] Resolved path:", filePath);
    console.log("[ZOLTRA-INTERNAL] File exists:", fs.existsSync(filePath));

    try {
      // 1. Security & Path Resolution
      const sanitizedPath = path
        .normalize(req.url!)
        .replace(/^(\.\.[\/\\])+/, "");
      let filePath = path.join(path.resolve(rootDir), sanitizedPath);

      // Verify we're still within root directory
      if (!filePath.startsWith(path.resolve(rootDir))) {
        res.statusCode = 403;
        return res.end("Forbidden");
      }

      // 2. Extension Fallback
      if (options.extensions && !path.extname(filePath)) {
        for (const ext of options.extensions) {
          const testPath = `${filePath}.${ext}`;
          if (fs.existsSync(testPath)) {
            filePath = testPath;
            break;
          }
        }
      }

      // 3. File Stats & Caching Headers
      fs.stat(filePath, (err, stats) => {
        if (err || !stats.isFile()) {
          res.statusCode = 404;
          return res.end("Not Found");
        }

        const resHeaders: Record<string, string> = {
          "Content-Type": mime.lookup(filePath) || "application/octet-stream",
          "Content-Length": stats.size.toString(),
        };

        // 4. Freshness Check
        if (options.etag) resHeaders["ETag"] = etag(stats);
        if (options.lastModified)
          resHeaders["Last-Modified"] = stats.mtime.toUTCString();

        if (isFresh(req, resHeaders)) {
          res.writeHead(304);
          return res.end();
        }

        // 5. Range Requests
        if (options.acceptRanges && req.headers.range) {
          const range = parseRange(stats.size, req.headers.range);
          if (range) {
            res.writeHead(206, {
              ...resHeaders,
              "Content-Range": `bytes ${range.start}-${range.end}/${stats.size}`,
              "Content-Length": (range.end - range.start + 1).toString(),
            });
            const stream = fs.createReadStream(filePath, range);
            stream.on("error", handleStreamError);
            return stream.pipe(res);
          }
        }

        // 6. Compression
        const acceptEncoding = req.headers["accept-encoding"] || "";
        const stream = fs.createReadStream(filePath);

        if (acceptEncoding.includes("br")) {
          res.setHeader("Content-Encoding", "br");
          const compressor = createBrotliCompress();
          stream.pipe(compressor).pipe(res);
        } else if (acceptEncoding.includes("gzip")) {
          res.setHeader("Content-Encoding", "gzip");
          const compressor = createGzip();
          stream.pipe(compressor).pipe(res);
        } else if (acceptEncoding.includes("deflate")) {
          res.setHeader("Content-Encoding", "deflate");
          const compressor = createDeflate();
          stream.pipe(compressor).pipe(res);
        } else {
          // 7. Uncompressed response
          res.writeHead(200, resHeaders);
          stream.pipe(res);
        }

        // Error handlers
        stream.on("error", handleStreamError);
        if ("pipe" in res) {
          stream.on("error", () => res.destroy());
        }
      });
    } catch (err) {
      res.statusCode = 500;
      res.end("Internal Server Error");
    }
  };
}

function isFresh(req: ZoltraRequest, headers: Record<string, string>) {
  // 1. Check cache-control: no-cache
  const cacheControl = req.headers["cache-control"];
  if (cacheControl?.includes("no-cache")) return false;

  // 2. Check ETag match
  const ifNoneMatch = req.headers["if-none-match"];
  if (ifNoneMatch && headers["ETag"]) {
    return ifNoneMatch.split(/\s*,\s*/).includes(headers["ETag"]);
  }

  // 3. Check Last-Modified
  const ifModifiedSince = req.headers["if-modified-since"];
  if (ifModifiedSince && headers["Last-Modified"]) {
    return new Date(ifModifiedSince) >= new Date(headers["Last-Modified"]);
  }

  return false;
}

const handleStreamError = function (this: ZoltraResponse, err: Error) {
  if (!this.headersSent) {
    this.statusCode = 500;
    this.end("Internal Server Error");
  }
};
