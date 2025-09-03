import { ILogger, LoggerOptions, LogLevel } from "../../types/utils";

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
  private outputs: (
    | string
    | ((level: LogLevel, message: string, meta?: any) => void)
  )[];

  private colors: Record<string, string> = {
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

  request(context: any, responseTime = 0): void {
    const message = `${context.method} ${context.path} ${context.statusCode} ${responseTime}ms`;
    const meta = {
      method: context.method,
      path: context.path,
      status: context.statusCode,
      responseTime,
      userAgent: context.headers?.["user-agent"],
      ip: context.req?.socket?.remoteAddress,
    };

    this.info(message, meta);
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
        this._outputToConsole(level, formatted);
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

  private _outputToConsole(level: LogLevel, message: string): void {
    let color = "";
    let stream: NodeJS.WriteStream = process.stdout;

    switch (level) {
      case "error":
        color = this.colors.red;
        stream = process.stderr;
        break;
      case "warn":
        color = this.colors.yellow;
        break;
      case "info":
        color = this.colors.green;
        break;
      case "debug":
        color = this.colors.gray;
        break;
    }

    if (this.colorEnabled && color) {
      stream.write(`${color}${message}${this.colors.reset}\n`);
    } else {
      stream.write(`${message}\n`);
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
}
