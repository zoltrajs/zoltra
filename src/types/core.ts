import { IncomingMessage, ServerResponse } from "http";

export type ZoltraRequest = IncomingMessage;
export type ZoltraResponse = ServerResponse;
export type ZoltraNext = () => Promise<void>;

export type ZoltraHandler = (
  req: ZoltraRequest,
  res: ZoltraResponse
) => Promise<void>;

export interface ZoltraConfig {
  PORT: number;
  NODE_ENV: "development" | "production" | "test";
  DATABASE_URL?: string;
  LOG_LEVEL: "debug" | "info" | "warn" | "error";
  LOG_FILE?: string;
}

export type Middleware = (
  req: ZoltraRequest,
  res: ZoltraResponse,
  next: ZoltraNext
) => void;
