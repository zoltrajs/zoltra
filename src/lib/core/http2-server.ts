import * as fs from "fs";
import * as http2 from "http2";
import { IApplication } from "../../types";

export interface HTTP2Options {
  cert?: string | Buffer;
  key?: string | Buffer;
  maxConcurrentStreams?: number;
  plain?: boolean; // allow non-TLS (h2c) for dev
  sessionTimeout?: number;
  settings?: http2.Settings;
  ciphers?: string;
  dhParamPath?: string;
  rejectUnauthorized?: boolean;
}

export function createHTTP2Server(app: IApplication, options: HTTP2Options) {
  const handler = app.handler.bind(app);

  const defaultSettings: http2.Settings = {
    enablePush: false,
    headerTableSize: 4096,
    initialWindowSize: 65535,
    maxConcurrentStreams: options.maxConcurrentStreams ?? 100,
    maxHeaderListSize: 8192,
  };

  const setupErrorHandlers = (
    server: http2.Http2Server | http2.Http2SecureServer
  ) => {
    server.on("error", (err) => {
      console.error("HTTP/2 Server Error:", err);
    });

    server.on("sessionError", (err) => {
      console.error("HTTP/2 Session Error:", err);
    });

    server.on("goaway", (errorCode, lastStreamID) => {
      console.warn(
        `HTTP/2 GOAWAY received - code: ${errorCode}, lastStreamID: ${lastStreamID}`
      );
    });
  };

  const createStreamHandler = (
    stream: http2.ServerHttp2Stream,
    headers: http2.IncomingHttpHeaders
  ) => {
    stream.on("error", (error) => {
      console.error("Stream Error:", error);
      stream.destroy();
    });

    const req = {
      headers,
      method: headers[":method"],
      url: headers[":path"],
      stream, // Expose stream for advanced use cases
    };

    const res = {
      writeHead: (status: number, responseHeaders: Record<string, string>) => {
        try {
          stream.respond(
            {
              ":status": status,
              ...responseHeaders,
            },
            {
              endStream: false,
            }
          );
        } catch (err) {
          console.error("Error writing headers:", err);
          stream.destroy();
        }
      },
      write: (chunk: string | Buffer) => {
        try {
          return stream.write(chunk);
        } catch (err) {
          console.error("Error writing data:", err);
          stream.destroy();
          return false;
        }
      },
      end: (data?: string | Buffer) => {
        try {
          stream.end(data);
        } catch (err) {
          console.error("Error ending stream:", err);
          stream.destroy();
        }
      },
    };

    handler(req, res);
  };

  if (options.plain) {
    const server = http2.createServer({
      settings: { ...defaultSettings, ...options.settings },
    });

    server.on("stream", createStreamHandler);
    setupErrorHandlers(server);
    return server;
  } else {
    if (!options.cert || !options.key) {
      throw new Error("HTTP/2 TLS mode requires certificate and key");
    }

    // Load DH params if provided
    let dhParamBuffer: Buffer | undefined;
    if (options.dhParamPath) {
      dhParamBuffer = fs.readFileSync(options.dhParamPath);
    }

    const secureOptions: http2.SecureServerOptions = {
      cert:
        typeof options.cert === "string"
          ? fs.readFileSync(options.cert)
          : options.cert,
      key:
        typeof options.key === "string"
          ? fs.readFileSync(options.key)
          : options.key,
      allowHTTP1: true,
      settings: { ...defaultSettings, ...options.settings },
      sessionTimeout: options.sessionTimeout ?? 300,
      ciphers:
        options.ciphers ??
        "TLS_AES_128_GCM_SHA256:TLS_AES_256_GCM_SHA384:ECDHE-RSA-AES128-GCM-SHA256",
      minVersion: "TLSv1.2",
      rejectUnauthorized: options.rejectUnauthorized ?? true,
      handshakeTimeout: 10000,
    };

    const server = http2.createSecureServer(secureOptions);

    server.on("stream", createStreamHandler);
    server.on("session", (session) => {
      session.setTimeout(options.sessionTimeout ?? 300 * 1000);
    });

    setupErrorHandlers(server);
    return server;
  }
}
