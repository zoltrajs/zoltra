import { IncomingMessage, ServerResponse } from "http";

export interface Route {
  method: "GET" | "POST" | "PUT" | "DELETE" | "PATCH" | "OPTIONS" | "HEAD";
  path: string;
  handler: (req: IncomingMessage, res: ServerResponse) => Promise<void>;
  middleware?: ((
    req: IncomingMessage,
    res: ServerResponse,
    next: () => Promise<void>
  ) => Promise<void>)[];
  validate?: (
    req: IncomingMessage
  ) => Promise<{ isValid: boolean; errors?: Record<string, string> }>;
}
