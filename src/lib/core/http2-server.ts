import * as fs from "fs";
import * as path from "path";
import * as spdy from "spdy";
import { Server } from "http";
import { IApplication } from "../../types";

/**
 * HTTP/2 server options
 */
export interface HTTP2Options {
  /**
   * Path to SSL certificate
   */
  cert?: string | Buffer;

  /**
   * Path to SSL key
   */
  key?: string | Buffer;

  /**
   * Maximum concurrent streams per connection
   */
  maxConcurrentStreams?: number;

  /**
   * Plain HTTP/2 without TLS (not recommended for production)
   */
  plain?: boolean;
}

/**
 * Creates an HTTP/2 server
 * @param app Application instance
 * @param options HTTP/2 options
 * @returns HTTP/2 server
 */
export function createHTTP2Server(
  app: IApplication,
  options: HTTP2Options
): Server {
  const handler = app.handler.bind(app);

  // Prepare options for spdy
  const serverOptions: spdy.ServerOptions = {
    spdy: {
      plain: options.plain === true,
      "x-forwarded-for": true,
      protocols: ["h2", "http/1.1", "spdy/3.1"],
    },
  };

  // Add TLS options if not in plain mode
  if (!options.plain) {
    // Load cert and key
    if (options.cert && options.key) {
      serverOptions.key =
        typeof options.key === "string"
          ? fs.readFileSync(options.key)
          : options.key;

      serverOptions.cert =
        typeof options.cert === "string"
          ? fs.readFileSync(options.cert)
          : options.cert;
    } else {
      throw new Error("HTTP/2 requires SSL certificate and key");
    }
  }

  // Create HTTP/2 server
  return spdy.createServer(serverOptions, handler);
}
