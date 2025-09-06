import { IContext } from "src/types";
import { ILogger, LoggerOptions, LogLevel } from "../../types/utils";
import { colorText } from "./color";

export class Logger implements ILogger {
  private levels: Record<LogLevel, number> = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3,
  };

  private level: LogLevel;
  private format: "combined" | "json";
  private timestamp: boolean;
  private colorEnabled: boolean;
  private context?: string;
  private outputs: (
    | string
    | ((level: LogLevel, message: string, meta?: any) => void)
  )[];

  private colors = {
    reset: "\x1b[0m",
    red: "\x1b[31m",
    yellow: "\x1b[33m",
    green: "\x1b[32m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    gray: "\x1b[90m",
  };

  constructor(options: LoggerOptions = {}) {
    this.level = options.level || "info";
    this.format = options.format || "combined";
    this.timestamp = options.timestamp !== false;
    this.colorEnabled = options.colors !== false;
    this.outputs = options.outputs || ["console"];
    this.context = options.context;
  }

  error(message: string, meta: Record<string, any> = {}): void {
    this._log("error", message, meta);
  }

  warn(message: string, meta: Record<string, any> = {}): void {
    this._log("warn", message, meta);
  }

  info(message: string, meta: Record<string, any> = {}): void {
    this._log("info", message, meta);
  }

  debug(message: string, meta: Record<string, any> = {}): void {
    this._log("debug", message, meta);
  }

  public trackRequest(context: IContext) {
    const startTime = process.hrtime();

    context.res.on("finish", () => {
      const endTime = process.hrtime(startTime);
      const durationMs = endTime[0] * 1000 + endTime[1] / 1e6;

      this.info(
        `${context.req.method} ${context.req.url} ${this.colorStatus(
          context.res.statusCode
        )} ${this.getDuration(durationMs)}`
      );
    });
  }

  private _log(
    level: LogLevel,
    message: string,
    meta: Record<string, any> = {}
  ): void {
    if (this.levels[level] > this.levels[this.level]) return;

    const timestamp = this.timestamp ? new Date().toISOString() : undefined;
    const formatted = this._formatMessage(level, message, meta, timestamp);

    this.outputs.forEach((output) => {
      if (output === "console") {
        this._logToConsole(level, message, meta, timestamp);
      } else if (typeof output === "function") {
        output(level, formatted, meta);
      }
    });
  }

  private _formatMessage(
    level: LogLevel,
    message: string,
    meta: Record<string, any>,
    timestamp?: string
  ): string {
    if (this.format === "json") {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...meta,
      });
    }

    let formatted = "";
    if (timestamp) formatted += `${timestamp} `;
    formatted += `[${level.toUpperCase()}] ${message}`;

    if (Object.keys(meta).length > 0) {
      const metaStr = Object.entries(meta)
        .map(([key, value]) =>
          typeof value === "object" && value !== null
            ? `${key}=${JSON.stringify(value)}`
            : `${key}=${String(value)}`
        )
        .join(" ");
      formatted += ` ${metaStr}`;
    }

    return formatted;
  }

  private _logToConsole(
    level: LogLevel,
    message: string,
    meta: Record<string, any>,
    timestamp?: string
  ) {
    const color = this._getLevelColor(level);

    console.log(
      `${color}[${timestamp}] [${level.toUpperCase()}] ${
        this.context && `[${this.context}]`
      } ${this.colors.reset}${message}`,
      Object.keys(meta).length ? meta : ""
    );
  }

  private _getLevelColor(level: LogLevel) {
    switch (level) {
      case "info":
        return this.colors.blue;
      case "error":
        return this.colors.red;
      case "warn":
        return this.colors.yellow;
      case "debug":
        return this.colors.cyan;
      default:
        return this.colors.reset;
    }
  }

  setLevel(level: LogLevel): void {
    if (this.levels.hasOwnProperty(level)) {
      this.level = level;
    }
  }

  addOutput(
    output: string | ((level: LogLevel, message: string, meta?: any) => void)
  ): void {
    if (!this.outputs.includes(output)) {
      this.outputs.push(output);
    }
  }

  removeOutput(
    output: string | ((level: LogLevel, message: string, meta?: any) => void)
  ): void {
    this.outputs = this.outputs.filter((o) => o !== output);
  }

  child(context: Record<string, any> = {}): ILogger {
    const childLogger = new Logger({
      level: this.level,
      format: this.format,
      timestamp: this.timestamp,
      colors: this.colorEnabled,
      outputs: [...this.outputs],
    });

    const originalLog = (childLogger as any)._log.bind(childLogger);
    (childLogger as any)._log = (
      level: LogLevel,
      message: string,
      meta: any = {}
    ) => {
      originalLog(level, message, { ...context, ...meta });
    };

    return childLogger;
  }

  private getDuration(durationInMs: number) {
    if (durationInMs >= 1000) {
      return `${(durationInMs / 1000).toFixed(1)}s`;
    } else {
      return `${durationInMs.toFixed(0)}ms`;
    }
  }

  private colorStatus(statusCode: number) {
    if (statusCode >= 500) return colorText(statusCode.toString(), "red");
    if (statusCode >= 400) return colorText(statusCode.toString(), "yellow");
    if (statusCode >= 300) return colorText(statusCode.toString(), "cyan");
    if (statusCode >= 200) return colorText(statusCode.toString(), "green");

    return colorText(statusCode.toString(), "white");
  }
}
