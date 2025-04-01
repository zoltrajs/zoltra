import { config } from "config";
import { IncomingMessage } from "http";

type LogLevel = "debug" | "info" | "warn" | "error";
type LogData = Record<string, unknown> & {
  timestamp?: Date;
  level?: LogLevel;
  message?: string;
  context?: string;
  requestId?: string;
  durationMs?: number;
};

export class Logger {
  private readonly context: string;
  private request?: IncomingMessage;

  constructor(context?: string, req?: IncomingMessage) {
    this.context = context || "Application";
    this.request = req;
  }

  private log(
    level: LogLevel,
    message: string,
    data?: Record<string, unknown>
  ) {
    const logEntry: LogData = {
      timestamp: new Date(),
      level,
      message,
      context: this.context,
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

    // Format differently based on environment
    if (config.NODE_ENV === "development") {
      this.logToConsole(logEntry);
    } else {
      this.logToJson(logEntry);
    }

    // Add file logging in production
    if (config.NODE_ENV === "production") {
      this.logToFile(logEntry);
    }
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

  private logToJson(logEntry: LogData) {
    console.log(JSON.stringify(logEntry));
  }

  // TODO: Implement log to file
  private logToFile(logEntry: LogData) {
    // Implement file logging using winston or similar if needed
    // This is a placeholder for actual file logging implementation
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
    if (config.LOG_LEVEL === "debug") {
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
    this.log("error", message, {
      ...data,
      error: {
        name: error?.name,
        message: error?.message,
        stack: config.NODE_ENV === "development" ? error?.stack : undefined,
      },
    });
  }

  // Request timing utility
  public trackRequest(req: IncomingMessage) {
    const startTime = process.hrtime();
    const requestId = req.headers["x-request-id"] || this.generateRequestId();

    return {
      end: (res: { statusCode: number }) => {
        const [seconds, nanoseconds] = process.hrtime(startTime);
        const durationMs = Math.round(seconds * 1000 + nanoseconds / 1000000);

        this.info("Request completed", {
          requestId,
          statusCode: res.statusCode,
          durationMs,
        });
      },
    };
  }

  private generateRequestId(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
