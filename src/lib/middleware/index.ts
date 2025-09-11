import { MiddlewareObject } from "../../types";

export function defineMiddlewares(middlewares: MiddlewareObject[]) {
  return middlewares.map((m) => m.handle);
}

export * from "./res-body";
export * from "./compression";
export * from "./cors";
export * from "./stack";
