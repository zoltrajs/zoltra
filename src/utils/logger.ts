import { IncomingMessage } from "http";
import { LoggerInterface, ZoltraConfig } from "../types";
import { colorText } from "./colors";
import { readConfig } from "../config/read/read";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogData = Record<string, unknown> & {
  timestamp?: Date;
  level?: LogLevel;
  message?: string;
  context?: string;
  requestId?: string;
  durationMs?: number;
};

export class Logger implements LoggerInterface {
  private readonly context: string;
  private request?: IncomingMessage;
  private config: ZoltraConfig;
  private blockLog?: boolean;

  constructor(context?: string, req?: IncomingMessage, blockLog?: boolean) {
    this.context = context || "Application";
    this.request = req;
    this.config = readConfig();
    this.blockLog = blockLog;
  }

  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>
  ) {
    if (this.blockLog) return;

    const logEntry: LogData = {
      timestamp: new Date(),
      level,
      message,
      // context: this.context,
      ...data,
    };

    // Add request context if available
    if (this.request) {
      logEntry.requestId = this.request.headers["x-request-id"] as string;
      logEntry.path = this.request.url;
      logEntry.method = this.request.method;
      logEntry.ip =
        this.request.headers["x-forwarded-for"] ||
        this.request.socket.remoteAddress;
    }

    this.logToConsole(logEntry);
  }

  private logToConsole(logEntry: LogData) {
    const { timestamp, level, message, ...rest } = logEntry;
    const color = this.getColorForLevel(level!);

    console.log(
      `\x1b[${color}m[${timestamp?.toISOString()}] [${level?.toUpperCase()}] [${
        this.context
      }]\x1b[0m: ${message}`,
      Object.keys(rest).length ? rest : ""
    );
  }

  private getColorForLevel(level: LogLevel): string {
    switch (level) {
      case "debug":
        return "36"; // Cyan
      case "info":
        return "32"; // Green
      case "warn":
        return "33"; // Yellow
      case "error":
        return "31"; // Red
      default:
        return "0"; // Reset
    }
  }

  // Public API
  public debug(message: string, data?: Record<string, unknown>) {
    if (this.config.LOG_LEVEL === "debug") {
      this.log("debug", message, data);
    }
  }

  public info(message: string, data?: Record<string, unknown>) {
    this.log("info", message, data);
  }

  public warn(message: string, data?: Record<string, unknown>) {
    this.log("warn", message, data);
  }

  public error(message: string, error?: Error, data?: Record<string, unknown>) {
    const displayErrObj = this.config.error.displayErrObj;
    const showStack = this.config.error.showStack;
    const includeErrorMessage = this.config.error.includeErrorMessage;

    let msg = message;

    const logData = { ...data };

    if (error) {
      msg =
        includeErrorMessage && error.message
          ? `${message} - ${colorText(error.message, "bold", "red")}`
          : message;

      if (displayErrObj) {
        logData.error = {
          name: error.name,
          message: includeErrorMessage ? error.message : undefined,
          ...(showStack && { stack: error.stack }), // Conditionally add stack
        };
      }
    }

    this.log("error", msg, {
      ...logData,
    });
  }

  // Request timing utility
  public trackRequest(req: IncomingMessage) {
    const startTime = process.hrtime();

    return {
      end: (res: { statusCode: number }) => {
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const durationMs = Math.round(seconds * 1000 + nanoseconds / 1000000);

        this.info(
          `${req.method} ${req.url} ${this.colorStatus(
            res.statusCode
          )} in ${this.getDuration(durationMs)}`
        );
      },
    };
  }

  private getDuration(durationInMs: number): string {
    if (durationInMs >= 1000) {
      return `${(durationInMs / 1000).toFixed(1)}s`;
    } else {
      return `${durationInMs.toFixed(0)}ms`;
    }
  }

  private colorStatus(statusCode: number): string {
    if (statusCode >= 500) return colorText(statusCode.toString(), "red");
    if (statusCode >= 400) return colorText(statusCode.toString(), "yellow");
    if (statusCode >= 300) return colorText(statusCode.toString(), "cyan");
    if (statusCode >= 200) return colorText(statusCode.toString(), "green");
    return colorText(statusCode.toString(), "white");
  }
}
