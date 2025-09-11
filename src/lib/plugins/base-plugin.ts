import { IApplication } from "../../types";
import {
  HookFn,
  LifecycleHook,
  Plugin,
  PluginConfig,
} from "../../types/plugin";

/**
 * Base plugin class that provides a foundation for creating plugins
 * with lifecycle hooks.
 */
export abstract class BasePlugin implements Plugin {
  public readonly name: string;
  public readonly version?: string;
  public readonly description?: string;
  public readonly dependencies?: string[];
  public readonly config: PluginConfig;
  public readonly hooks: Record<string, HookFn>;

  /**
   * Create a new plugin
   */
  constructor(options: {
    name: string;
    version?: string;
    description?: string;
    dependencies?: string[];
    config?: PluginConfig;
  }) {
    this.name = options.name;
    this.version = options.version;
    this.description = options.description;
    this.dependencies = options.dependencies;
    this.config = options.config || {};
    this.hooks = {};

    // Register lifecycle methods as hooks if they exist
    this.registerLifecycleMethods();
  }

  /**
   * Initialize the plugin
   */
  public async init(app: IApplication): Promise<void> {
    // Override in subclass
  }

  /**
   * Clean up resources when the plugin is destroyed
   */
  public async destroy(app: IApplication): Promise<void> {
    // Override in subclass
  }

  /**
   * Register a hook
   */
  protected registerHook(name: string, fn: Function): void {
    this.hooks[name] = fn.bind(this);
  }

  /**
   * Called before the application is initialized
   */
  protected async beforeInit?(context: any): Promise<void>;

  /**
   * Called after the application is initialized
   */
  protected async afterInit?(context: any): Promise<void>;

  /**
   * Called before the server starts
   */
  protected async beforeStart?(context: any): Promise<void>;

  /**
   * Called after the server starts
   */
  protected async afterStart?(context: any): Promise<void>;

  /**
   * Called before the server shuts down
   */
  protected async beforeShutdown?(context: any): Promise<void>;

  /**
   * Called after the server shuts down
   */
  protected async afterShutdown?(context: any): Promise<void>;

  /**
   * Called before a request is processed
   */
  protected async beforeRequest?(context: any): Promise<void>;

  /**
   * Called after a request is processed
   */
  protected async afterRequest?(context: any): Promise<void>;

  /**
   * Called before a route is handled
   */
  protected async beforeRoute?(context: any): Promise<void>;

  /**
   * Called after a route is handled
   */
  protected async afterRoute?(context: any): Promise<void>;

  /**
   * Called before a response is sent
   */
  protected async beforeResponse?(context: any): Promise<void>;

  /**
   * Called after a response is sent
   */
  protected async afterResponse?(context: any): Promise<void>;

  /**
   * Called when an error occurs
   */
  protected async onError?(context: any): Promise<void>;

  /**
   * Register lifecycle methods as hooks
   */
  private registerLifecycleMethods(): void {
    // Map lifecycle methods to hooks
    const lifecycleMap: Record<string, LifecycleHook> = {
      beforeInit: LifecycleHook.BEFORE_INIT,
      afterInit: LifecycleHook.AFTER_INIT,
      beforeStart: LifecycleHook.BEFORE_START,
      afterStart: LifecycleHook.AFTER_START,
      beforeShutdown: LifecycleHook.BEFORE_SHUTDOWN,
      afterShutdown: LifecycleHook.AFTER_SHUTDOWN,
      beforeRequest: LifecycleHook.BEFORE_REQUEST,
      afterRequest: LifecycleHook.AFTER_REQUEST,
      beforeRoute: LifecycleHook.BEFORE_ROUTE,
      afterRoute: LifecycleHook.AFTER_ROUTE,
      beforeResponse: LifecycleHook.BEFORE_RESPONSE,
      afterResponse: LifecycleHook.AFTER_RESPONSE,
      onError: LifecycleHook.ON_ERROR,
    };

    // Register each lifecycle method as a hook if it exists
    for (const [methodName, hookName] of Object.entries(lifecycleMap)) {
      if (typeof (this as any)[methodName] === "function") {
        this.registerHook(hookName, (this as any)[methodName]);
      }
    }
  }
}
