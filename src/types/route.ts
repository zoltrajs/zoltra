import { ZoltraHandler, ZoltraRequest } from "./core";

/**
 * HTTP methods supported by Zoltra routes.
 */
export type Methods =
  | "GET"
  | "POST"
  | "PUT"
  | "DELETE"
  | "PATCH"
  | "OPTIONS"
  | "HEAD";
export interface Route {
  method: Methods;
  path: string;
  handler: ZoltraHandler;
  middleware?: ZoltraHandler[];
  validate?: (
    req: ZoltraRequest
  ) => Promise<{ isValid: boolean; errors?: Record<string, string> }>;
}

export interface RouteOptions {
  basePath: string;
  routes: Route[];
}
