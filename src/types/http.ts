import { ConfigManager } from "zoltra/config";
import { Logger } from "../utils/logger";

declare module "http" {
  interface IncomingMessage {
    body: Record<string, any>;
    params: Record<string, string>;
    query: Record<string, string | string[] | undefined>;
    configManger: ConfigManager;
  }

  interface ServerResponse {
    json: (data: any) => void;
    send: (data: any) => void;
    status: (code: number) => ServerResponse;
    logger: Logger;
  }
}
