import { IApplication, IContext } from "./core";
import { Server } from "http";

export type HookFn = (...args: any[]) => Promise<void> | void;

/**
 * Standard lifecycle hooks available in the framework
 */
export enum LifecycleHook {
  // Application lifecycle
  BEFORE_INIT = "beforeInit",
  AFTER_INIT = "afterInit",
  BEFORE_START = "beforeStart",
  AFTER_START = "afterStart",
  BEFORE_SHUTDOWN = "beforeShutdown",
  AFTER_SHUTDOWN = "afterShutdown",

  // Request lifecycle
  BEFORE_REQUEST = "beforeRequest",
  AFTER_REQUEST = "afterRequest",
  BEFORE_ROUTE = "beforeRoute",
  AFTER_ROUTE = "afterRoute",
  BEFORE_RESPONSE = "beforeResponse",
  AFTER_RESPONSE = "afterResponse",
  ON_ERROR = "onError",
}

/**
 * Plugin configuration interface
 */
export interface PluginConfig {
  [key: string]: any;
}

/**
 * Enhanced plugin interface with lifecycle hooks
 */
export interface Plugin {
  name: string;
  version?: string;
  description?: string;
  dependencies?: string[];
  config?: PluginConfig;

  // Main initialization method
  init?(app: IApplication): Promise<void> | void;

  // Lifecycle hooks
  hooks?: Record<string, HookFn>;

  // Optional cleanup method
  destroy?(app: IApplication): Promise<void> | void;
}

/**
 * Plugin context provided to hooks
 */
export interface PluginContext {
  app: IApplication;
  config: PluginConfig;
  server?: Server;
  requestContext?: IContext;
  error?: Error;
  [key: string]: any;
}

/**
 * Plugin manager interface
 */
export interface IPluginManager {
  register(plugin: Plugin): void;
  addHook(name: string, fn: HookFn): void;
  executeHook(name: string, ...args: any[]): Promise<void>;
  initialize(app: IApplication): Promise<void>;
  getPlugins(): string[];
  hasPlugin(name: string): boolean;
  unregister(name: string): void;
  shutdown(): Promise<void>;
  getPlugin(name: string): Plugin | undefined;
  getDependencyGraph(): Map<string, string[]>;
  validateDependencies(): boolean;
}

export interface CORSOptions {
  origin?: string | string[] | ((ctx: IContext) => string | null);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}
