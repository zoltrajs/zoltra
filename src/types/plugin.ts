import { RequestError } from "zoltra/utils";
import { App } from "../core";
import { ZoltraNext, ZoltraRequest, ZoltraResponse } from "./core";

export interface Plugin {
  name: string;
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
