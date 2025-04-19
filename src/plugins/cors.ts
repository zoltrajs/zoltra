import { createPlugin } from ".";
import { CorsOptions } from "../types";

export default function CorsPlugin(options: CorsOptions = {}) {
  const {
    origins = ["*"],
    methods = ["GET", "HEAD", "POST", "PUT", "DELETE", "PATCH"],
    headers = ["Content-Type", "Authorization"],
    exposedHeaders = [], // Support for custom exposed headers
    credentials = false,
    maxAge = 86400,
    preflightStatus = 204, // Customizable preflight status
    optionsSuccessStatus = 200,
  } = options;

  // Validate origins
  const allowedOrigins = Array.isArray(origins) ? origins : [origins];
  const isWildcard = allowedOrigins.includes("*");

  // Validate methods
  const validMethods = methods.filter((method) =>
    ["GET", "HEAD", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"].includes(
      method.toUpperCase()
    )
  );

  return createPlugin({
    name: "@zoltra/cors",
    version: "1.0.0",

    install(app) {
      app.addMiddleware(async (req, res, next) => {
        const origin = req.headers.origin || req.headers.host || "";
        let allowOrigin = isWildcard ? "*" : null;

        // Dynamic origin validation
        if (!isWildcard && origin) {
          allowOrigin = allowedOrigins.includes(origin) ? origin : null;
        }

        // Set CORS headers for all responses
        if (allowOrigin) {
          res.setHeader("Access-Control-Allow-Origin", allowOrigin);
          if (credentials && allowOrigin !== "*") {
            res.setHeader("Access-Control-Allow-Credentials", "true");
          }
        }

        // Handle preflight requests
        if (req.method === "OPTIONS") {
          try {
            if (!allowOrigin) {
              return res.status(403).end(); // Forbidden if origin not allowed
            }

            res.setHeader(
              "Access-Control-Allow-Methods",
              validMethods.join(", ")
            );
            res.setHeader("Access-Control-Allow-Headers", headers.join(", "));
            if (exposedHeaders.length > 0) {
              res.setHeader(
                "Access-Control-Expose-Headers",
                exposedHeaders.join(", ")
              );
            }
            res.setHeader("Access-Control-Max-Age", maxAge.toString());

            return res.status(preflightStatus).end();
          } catch (error) {
            console.error("CORS Preflight Error:", error);
            return res.status(500).end();
          }
        }

        // Vary header for caching
        res.setHeader("Vary", "Origin");

        // Continue to next middleware
        next();
      });
    },
  });
}
