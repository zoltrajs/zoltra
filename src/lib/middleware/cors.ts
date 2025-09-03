import { IContext, NextFn } from "../../types";
import { CORSOptions } from "../../types/plugin";

/**
 * CORS Middleware
 * @param {Object} options
 * @param {string|string[]|Function} [options.origin="*"] - Allowed origin(s) or resolver function
 * @param {string[]} [options.methods=["GET","POST","PUT","DELETE","OPTIONS"]] - Allowed methods
 * @param {string[]} [options.allowedHeaders] - Allowed headers
 * @param {string[]} [options.exposedHeaders] - Exposed headers
 * @param {boolean} [options.credentials=false] - Allow credentials
 * @param {number} [options.maxAge] - Preflight cache duration (in seconds)
 */
export const cors = (options: CORSOptions = {}) => {
  const {
    origin = "*",
    methods = ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders,
    exposedHeaders,
    credentials = false,
    maxAge,
  } = options;

  return async function corsMiddleware(ctx: IContext, next: NextFn) {
    let resolvedOrigin = "*";

    if (typeof origin === "string") {
      resolvedOrigin = origin;
    } else if (Array.isArray(origin)) {
      if (ctx.headers.origin && origin.includes(ctx.headers.origin)) {
        resolvedOrigin = ctx.headers.origin;
      }
    } else if (typeof origin === "function") {
      const result = origin(ctx);
      if (result) resolvedOrigin = result;
    }

    ctx.res.setHeader("Access-Control-Allow-Origin", resolvedOrigin);

    if (methods && methods.length) {
      ctx.res.setHeader("Access-Control-Allow-Methods", methods.join(","));
    }

    if (allowedHeaders) {
      ctx.res.setHeader(
        "Access-Control-Allow-Headers",
        allowedHeaders.join(",")
      );
    } else if (ctx.headers["access-control-request-headers"]) {
      ctx.res.setHeader(
        "Access-Control-Allow-Headers",
        ctx.headers["access-control-request-headers"]
      );
    }

    if (exposedHeaders && exposedHeaders.length) {
      ctx.res.setHeader(
        "Access-Control-Expose-Headers",
        exposedHeaders.join(",")
      );
    }

    if (credentials) {
      ctx.res.setHeader("Access-Control-Allow-Credentials", "true");
    }

    if (maxAge) {
      ctx.res.setHeader("Access-Control-Max-Age", String(maxAge));
    }

    // Handle preflight request
    if (ctx.method === "OPTIONS") {
      ctx.status(204).send("");
      return;
    }

    await next();
  };
};
