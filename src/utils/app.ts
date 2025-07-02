import { Route } from "../types";

export const defineRoutes = (routes: Route[]) => routes;

/**
 * Adds a base prefix to all route paths in the given array of routes.
 *
 * This is useful for organizing routes under a specific namespace,
 * for example grouping user-related routes under `/user`, product-related
 * routes under `/product`, etc.
 *
 * @param base - The prefix to prepend to each route path (e.g. "user" or "product").
 * @param routes - An array of Route objects to which the prefix will be applied.
 * @returns A new array of Route objects with the prefixed paths.
 *
 * @example
 * const prefixed = withPrefix("user", [
 *   { path: "/", method: "GET", handler: getUser },
 *   { path: "/profile", method: "POST", handler: updateProfile },
 * ]);
 * // Results in:
 * // [
 * //   { path: "/user/", method: "GET", handler: getUser },
 * //   { path: "/user/profile", method: "POST", handler: updateProfile }
 * // ]
 */
export function withPrefix(base: string, routes: Route[]) {
  return routes.map((route) => ({
    ...route,
    path: `/${base}${route.path.startsWith("/") ? "" : "/"}${
      route.path
    }`.replace(/\/+/g, "/"),
  }));
}
