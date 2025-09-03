import { IApplication, IContext } from "./core";

export type HookFn = (...args: any[]) => Promise<void> | void;

export interface Plugin {
  name: string;
  init?(app: IApplication): Promise<void> | void;
  hooks?: Record<string, HookFn>;
}

export interface IPluginManager {
  register(plugin: Plugin): void;
  addHook(name: string, fn: HookFn): void;
  executeHook(name: string, ...args: any[]): Promise<void>;
  initialize(app: IApplication): Promise<void>;
  getPlugins(): string[];
  hasPlugin(name: string): boolean;
  unregister(name: string): void;
}

export interface CORSOptions {
  origin?: string | string[] | ((ctx: IContext) => string | null);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
}
