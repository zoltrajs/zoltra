import { IncomingMessage, ServerResponse } from "http";

export type ZoltraRequest = IncomingMessage;
export type ZoltraResponse = ServerResponse;
export type ZoltraNext = (error?: Error | unknown) => Promise<void>;
export type RequestRes =
  | void
  | Promise<void>
  | ServerResponse<IncomingMessage>
  | Promise<ServerResponse>
  | Promise<void | ServerResponse>;

export type ZoltraHandler = (
  req: ZoltraRequest,
  res: ZoltraResponse,
  next: ZoltraNext
) => RequestRes;

export interface ZoltraConfig {
  PORT: number;
  NODE_ENV: "development" | "production" | "test";
  DATABASE_URL?: string;
  LOG_LEVEL: "debug" | "info" | "warn" | "error";
  LOG_FILE?: string;
  experimetal?: {
    router?: {
      cache?: {
        enabled?: boolean;
      };
    };
  };
}

export interface StaticOptions {
  prefix: string;
  extensions?: string[];
  etag?: boolean;
  lastModified?: boolean;
  acceptRanges?: boolean;
  cacheControl?: boolean;
  maxAge?: number;
  immutable?: boolean;
  fallthrough?: boolean;
  mimeTypes?: Record<string, string>;
  debug?: boolean;
}
