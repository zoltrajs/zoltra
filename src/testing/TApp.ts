import { Zoltra } from "../core";
import TRouter from "./TRouter";
import {
  Methods,
  ZoltraHandler,
  ZoltraRequest,
  ZoltraResponse,
} from "../types";
import { Logger } from "../utils";

export class TApp extends Zoltra {
  private router = new TRouter();
  public TLogger: Logger;
  constructor(logger: Logger) {
    super(true);
    this.TLogger = logger;
  }

  public THandler() {
    return async (req: ZoltraRequest, res: ZoltraResponse) => {
      const next = async (error?: Error | unknown) => {
        if (error) console.log("next error:", (error as Error).message);
      };
      try {
        await this.router.handle(req, res, next);
      } catch (error) {
        console.log("error handling request", (error as Error).message);
      }
    };
  }

  async inject(method: Methods, path: string, handler: ZoltraHandler) {
    this.router.mockRoute(path, method, handler);
  }

  public async loadRoutes() {
    await this.router.loadRoutes();
  }
}
