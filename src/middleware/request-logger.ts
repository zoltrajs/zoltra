import { IncomingMessage, ServerResponse } from "http";
import { Logger } from "../utils/logger";

export function requestLogger() {
  const logger = new Logger("RequestLogger");

  return async (
    req: IncomingMessage,
    res: ServerResponse,
    next: () => Promise<void>
  ) => {
    const tracker = logger.trackRequest(req);

    // Override `res.end` to track completion
    const originalEnd = res.end;
    // @ts-ignore
    res.end = function (chunk: any, encoding: any, callback?: any) {
      tracker.end({ statusCode: res.statusCode });
      return originalEnd.call(this, chunk, encoding, callback);
    };

    await next();
  };
}
