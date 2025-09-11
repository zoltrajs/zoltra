import { IContext } from "../../types";
import { IErrorLogger, ILogger } from "../../types/utils";
import { Logger } from "./logger";

export class ErrorLogger implements IErrorLogger {
  private logger: ILogger;

  constructor(logger?: ILogger) {
    this.logger = logger || new Logger();
  }

  async handle(context: IContext, next: () => Promise<void>): Promise<void> {
    try {
      await next();
    } catch (error: any) {
      this.logger.error("Unhandled error in request", {
        method: context.method,
        path: context.path,
        error: error.message,
        stack: error.stack,
        status: context.statusCode,
        headers: context.headers,
        params: context.params,
        query: context.query,
      });

      throw error; // re-throw so higher-level error handlers can still act
    }
  }
}
