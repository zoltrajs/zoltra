import { ConfigManager } from "zoltra/config";
import { Logger } from "../utils/logger";

declare module "http" {
  interface IncomingMessage {
    body?: any;
    params?: Record<string, string>;
    query?: Record<string, string>;
    configManger: ConfigManager;
  }

  interface ServerResponse {
    json: (data: any) => void;
    status: (code: number) => ServerResponse;
    logger: Logger;
  }
}
