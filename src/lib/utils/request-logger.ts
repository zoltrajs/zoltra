import { IContext } from "../../types";
import {
  ILogger,
  IRequestLogger,
  RequestLoggerOptions,
} from "../../types/utils";
import { Logger } from "./logger";

export class RequestLogger implements IRequestLogger {
  private logger: ILogger;
  private options: RequestLoggerOptions;

  constructor(logger?: ILogger, options: RequestLoggerOptions = {}) {
    this.logger = logger || new Logger();
    this.options = {
      logRequestBody: false,
      logResponseBody: false,
      ...options,
    };
  }

  async handle(context: IContext, next: () => Promise<void>): Promise<void> {
    this.logger.trackRequest(context);

    await next();
  }
}
