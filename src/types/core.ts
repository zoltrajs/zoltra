import { IncomingMessage, ServerResponse } from "http";
import { CorsOptions } from "./plugin";

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
  corsOptions?: CorsOptions;
  experimetal?: {
    router?: {
      cache?: {
        enabled?: boolean;
      };
    };
  };
}
