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
    const start = process.hrtime.bigint();

    this.logger.info(`→ ${context.method} ${context.path}`, {
      method: context.method,
      path: context.path,
      headers: context.headers,
      query: context.query,
      ip: context.req?.socket?.remoteAddress,
      ...(this.options.logRequestBody && { body: context.body }),
    });

    try {
      await next();

      const end = process.hrtime.bigint();
      const responseTime = Number(end - start) / 1_000_000; // ns → ms

      this.logger.info(
        `← ${context.method} ${context.path} ${
          context.statusCode
        } ${responseTime.toFixed(2)}ms`,
        {
          method: context.method,
          path: context.path,
          status: context.statusCode,
          responseTime: responseTime.toFixed(2),
          contentType: context.get("content-type"),
          ...(this.options.logResponseBody && { body: context.body }),
        }
      );
    } catch (error: any) {
      const end = process.hrtime.bigint();
      const responseTime = Number(end - start) / 1_000_000;

      this.logger.error(
        `✗ ${context.method} ${context.path} ${responseTime.toFixed(2)}ms - ${
          error.message
        }`,
        {
          method: context.method,
          path: context.path,
          error: error.message,
          stack: error.stack,
          responseTime: responseTime.toFixed(2),
        }
      );

      throw error;
    }
  }
}
