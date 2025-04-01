import { IncomingMessage, ServerResponse } from "http";
import ApiError from "../utils/error";
import { Logger } from "../utils/logger";

export function errorHandler(
  error: unknown,
  req: IncomingMessage,
  res: ServerResponse
) {
  const logger = new Logger();

  if (error instanceof ApiError) {
    res.statusCode = error.statusCode as number;
    res.end(
      JSON.stringify({
        error: error.message,
        details: error.stack,
      })
    );
  } else {
    logger.error("Unhandled error:", error as ApiError);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: "Internal Server Error" }));
  }
}
