import { IncomingMessage, ServerResponse } from "http";
import { Logger } from "../utils/logger";

const logger = new Logger("BodyParser");

export function bodyParser() {
  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => Promise<void>
  ) => {
    try {
      // Skip GET/HEAD requests
      if (req.method === "GET" || req.method === "HEAD") {
        return next();
      }

      const buffers = [];
      for await (const chunk of req) {
        buffers.push(chunk);
      }

      const rawBody = Buffer.concat(buffers).toString();
      const contentType = req.headers["content-type"];

      // Attach parsed body to request
      req.body = rawBody ? parseContent(contentType, rawBody) : {};

      await next();
    } catch (error) {
      logger.error("Body parsing failed", error as Error);
      res.statusCode = 400;
      res.end(
        JSON.stringify({
          error: "Invalid request body",
          details: error instanceof Error ? error.message : undefined,
        })
      );
    }
  };
}

function parseContent(contentType = "", rawBody: string) {
  if (contentType.includes("application/json")) {
    return JSON.parse(rawBody);
  }
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return Object.fromEntries(new URLSearchParams(rawBody).entries());
  }
  return rawBody; // Fallback to raw text
}
