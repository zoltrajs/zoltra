import { Logger } from "../utils/logger";

declare module "http" {
  interface IncomingMessage {
    body: Record<string, any>;
    params: Record<string, string>;
    query: Record<string, string | string[] | undefined>;
  }

  interface ServerResponse {
    json: (data: any) => void;
    send: (data: any) => void;
    status: (code: number) => ServerResponse;
    logger: Logger;
    body: any;
    outputData: { data: string; encoding: string; callback: Function }[];
  }
}
