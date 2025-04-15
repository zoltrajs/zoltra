import {
  ZoltraHandler,
  ZoltraNext,
  ZoltraRequest,
  ZoltraResponse,
} from "./core";

export interface Route {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";
  path: string;
  handler: ZoltraHandler;
  middleware?: ((
    req: ZoltraRequest,
    res: ZoltraResponse,
    next: ZoltraNext
  ) => Promise<void>)[];
  validate?: (
    req: ZoltraRequest
  ) => Promise<{ isValid: boolean; errors?: Record<string, string> }>;
}
