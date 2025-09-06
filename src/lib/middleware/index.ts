import { RequestHandler } from "src/types";

interface MiddlewareObj {
  handler: RequestHandler;
}

export function defineMiddlewares(middlewares: MiddlewareObj[]) {
  return middlewares.map((m) => m.handler);
}

export * from "./res-body";
