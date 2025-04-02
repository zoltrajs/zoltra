import { ZoltraRequest, ZoltraResponse } from "./core";

export interface Route {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";
  path: string;
  handler: (req: ZoltraRequest, res: ZoltraResponse) => Promise<void>;
  middleware?: ((
    req: ZoltraRequest,
    res: ZoltraResponse,
    next: () => Promise<void>
  ) => Promise<void>)[];
  validate?: (
    req: ZoltraRequest
  ) => Promise<{ isValid: boolean; errors?: Record<string, string> }>;
}
