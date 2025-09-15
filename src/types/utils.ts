import { IContext } from "./core";

export interface IEnvironmentManager {
  load(dir?: string): Promise<void>;
  get<T = any>(key: string, defaultValue?: T): T | undefined;
  getInt(key: string, defaultValue?: number): number;
  getFloat(key: string, defaultValue?: number): number;
  getBool(key: string, defaultValue?: boolean): boolean;
  getArray(key: string, separator?: string, defaultValue?: string[]): string[];
  has(key: string): boolean;
  set(key: string, value: any): void;
  all(): Record<string, string>;
  validate(required: string[]): void;
  isProduction(): boolean;
  isDevelopment(): boolean;
  isTest(): boolean;
}

export type LogLevel = "error" | "warn" | "info" | "debug";

export interface LoggerOptions {
  level?: LogLevel;
  format?: "combined" | "json";
  timestamp?: boolean;
  colors?: boolean;
  outputs?: (
    | string
    | ((level: LogLevel, message: string, meta?: any) => void)
  )[];
  context?: string;
}

export interface ILogger {
  error(message: string, meta?: Record<string, any>): void;
  warn(message: string, meta?: Record<string, any>): void;
  info(message: string, meta?: Record<string, any>): void;
  debug(message: string, meta?: Record<string, any>): void;

  trackRequest(context: IContext): void;

  setLevel(level: LogLevel): void;
  addOutput(
    output: string | ((level: LogLevel, message: string, meta?: any) => void)
  ): void;
  removeOutput(
    output: string | ((level: LogLevel, message: string, meta?: any) => void)
  ): void;
  child(context?: Record<string, any>): ILogger;
}

export interface RequestLoggerOptions {
  logRequestBody?: boolean;
  logResponseBody?: boolean;
}

export interface IRequestLogger {
  handle(context: IContext, next: () => Promise<void>): Promise<void>;
}

export interface IErrorLogger {
  handle(context: IContext, next: () => Promise<void>): Promise<void>;
}

export interface FileServerOptions {
  index?: string;
  maxAge?: number;
  etag?: boolean;
  lastModified?: boolean;
  directoryListing?: boolean;
}

export interface DirectoryItem {
  name: string;
  type: "file" | "directory";
  size: number;
  modified: string | null;
}
