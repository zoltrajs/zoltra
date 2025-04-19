import { RequestError } from "zoltra/utils";
import { App } from "../core";
import { ZoltraNext, ZoltraRequest, ZoltraResponse } from "./core";
import { Methods } from "./route";

export interface Plugin {
  name: string;
  version?: string;
  install: (app: App) => Promise<void> | void;
}

export interface PluginError {
  plugin: string;
  code: string;
  suggestion?: string;
}

export type ErrorHandler = (
  error: unknown | Error | RequestError,
  req: ZoltraRequest,
  res: ZoltraResponse,
  next: ZoltraNext
) => Promise<void>;

export interface ErrorPluginOptions {
  name: string;
  install?: (app: App) => void;
  handler: ErrorHandler;
}

export interface CorsOptions {
  origins?: string[] | "*";
  methods?: Methods[];
  headers?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  preflightStatus?: number; // Status code for preflight response
  optionsSuccessStatus?: number; // Status for OPTIONS success
}
