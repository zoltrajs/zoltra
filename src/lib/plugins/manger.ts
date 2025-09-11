import { IApplication } from "../../types";
import type {
  Plugin,
  HookFn,
  IPluginManager,
  PluginContext,
} from "../../types/plugin";

const lifecycleMap: Record<string, string> = {
  // Application lifecycle
  BEFORE_INIT: "beforeInit",
  AFTER_INIT: "afterInit",
  BEFORE_START: "beforeStart",
  AFTER_START: "afterStart",
  BEFORE_SHUTDOWN: "beforeShutdown",
  AFTER_SHUTDOWN: "afterShutdown",

  // Request lifecycle
  BEFORE_REQUEST: "beforeRequest",
  AFTER_REQUEST: "afterRequest",
  BEFORE_ROUTE: "beforeRoute",
  AFTER_ROUTE: "afterRoute",
  BEFORE_RESPONSE: "beforeResponse",
  AFTER_RESPONSE: "afterResponse",
  ON_ERROR: "onError",
};

/**
 * Enhanced plugin manager for extending framework functionality with lifecycle hooks
 */
export class PluginManager implements IPluginManager {
  private plugins: Map<string, Plugin> = new Map();
  private hooks: Map<string, HookFn[]> = new Map();
  private logger: any;
  private app: IApplication | null = null;

  /**
   * Register a plugin with the manager
   */
  register(plugin: Plugin): void {
    if (!plugin.name) {
      throw new Error("Plugin must have a name");
    }

    // Check if plugin is already registered
    if (this.plugins.has(plugin.name)) {
      throw new Error(`Plugin '${plugin.name}' is already registered`);
    }

    // Store the plugin
    this.plugins.set(plugin.name, plugin);

    // Register hooks
    if (plugin.hooks) {
      Object.entries(plugin.hooks).forEach(([hookName, hookFn]) => {
        this.addHook(hookName, hookFn);
      });
    }

    // Log registration if logger is available
    if (this.logger) {
      this.logger.info(`Plugin '${plugin.name}' registered`, {
        version: plugin.version,
        description: plugin.description,
        dependencies: plugin.dependencies,
      });
    }
  }

  /**
   * Add a hook function to a specific hook point
   */
  addHook(name: string, fn: HookFn): void {
    if (!this.hooks.has(name)) {
      this.hooks.set(name, []);
    }
    const hooks = this.hooks.get(name);
    if (hooks) {
      hooks.push(fn);
    }
  }

  /**
   * Execute all hook functions for a specific hook point
   */
  async executeHook(name: string, ...args: any[]): Promise<void> {
    const hooks = this.hooks.get(name) || [];

    // Create plugin context if not provided
    let context: PluginContext | undefined;
    if (args.length > 0 && args[0] && typeof args[0] === "object") {
      if (!("app" in args[0]) && this.app) {
        context = args[0] as PluginContext;
        context.app = this.app;
      }
    } else if (this.app) {
      context = { app: this.app, config: {} };
      args.unshift(context);
    }

    // Execute hooks in sequence
    for (const hook of hooks) {
      try {
        await hook(...args);
      } catch (error: any) {
        if (this.logger) {
          this.logger.error(`Plugin hook '${name}' failed:`, error);
        } else {
          console.error(`Plugin hook '${name}' failed:`, error);
        }

        // Execute error hook if this wasn't already the error hook
        if (name !== lifecycleMap.ON_ERROR) {
          await this.executeHook(lifecycleMap.ON_ERROR, {
            app: this.app,
            error,
            hookName: name,
          });
        }
      }
    }
  }

  /**
   * Initialize all registered plugins
   */
  async initialize(app: IApplication): Promise<void> {
    this.app = app;

    // Get logger if available
    if (app && "logger" in app) {
      this.logger = app.logger;
    }

    // Validate dependencies before initialization
    if (!this.validateDependencies()) {
      throw new Error("Plugin dependencies validation failed");
    }

    try {
      // Execute before init hook
      await this.executeHook(lifecycleMap.BEFORE_INIT, { app });

      // Initialize plugins in dependency order
      const initOrder = this.getInitializationOrder();

      for (const pluginName of initOrder) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin) continue;

        if (plugin.init) {
          try {
            if (this.logger) {
              this.logger.debug(`Initializing plugin '${plugin.name}'`);
            }
            await plugin.init(app);
          } catch (error: any) {
            if (this.logger) {
              this.logger.error(
                `Plugin '${plugin.name}' initialization failed:`,
                error
              );
            } else {
              console.error(
                `Plugin '${plugin.name}' initialization failed:`,
                error
              );
            }

            // Execute error hook
            await this.executeHook(lifecycleMap.ON_ERROR, {
              app,
              error,
              pluginName: plugin.name,
              phase: "initialization",
            });

            // Re-throw to prevent partial initialization
            throw error;
          }
        }
      }

      // Execute after init hook
      await this.executeHook(lifecycleMap.AFTER_INIT, { app });
    } catch (error) {
      // Clean up on initialization failure
      await this.shutdown();
      throw error;
    }
  }

  /**
   * Shutdown all plugins
   */
  async shutdown(): Promise<void> {
    if (!this.app) return;

    try {
      // Execute before shutdown hook
      await this.executeHook(lifecycleMap.BEFORE_SHUTDOWN, { app: this.app });

      // Shutdown plugins in reverse initialization order
      const shutdownOrder = this.getInitializationOrder().reverse();

      for (const pluginName of shutdownOrder) {
        const plugin = this.plugins.get(pluginName);
        if (!plugin || !plugin.destroy) continue;

        try {
          if (this.logger) {
            this.logger.debug(`Shutting down plugin '${plugin.name}'`);
          }
          await plugin.destroy(this.app);
        } catch (error: any) {
          if (this.logger) {
            this.logger.error(
              `Plugin '${plugin.name}' shutdown failed:`,
              error
            );
          } else {
            console.error(`Plugin '${plugin.name}' shutdown failed:`, error);
          }
          // Continue shutdown process despite errors
        }
      }

      // Execute after shutdown hook
      await this.executeHook(lifecycleMap.AFTER_SHUTDOWN, { app: this.app });
    } finally {
      // Clear internal state
      this.app = null;
      this.plugins.clear();
      this.hooks.clear();
    }
  }

  /**
   * Get all registered plugin names
   */
  getPlugins(): string[] {
    return Array.from(this.plugins.keys());
  }

  /**
   * Get a specific plugin by name
   */
  getPlugin(name: string): Plugin | undefined {
    return this.plugins.get(name);
  }

  /**
   * Check if a plugin is registered
   */
  hasPlugin(name: string): boolean {
    return this.plugins.has(name);
  }

  /**
   * Unregister a plugin
   */
  unregister(name: string): void {
    const plugin = this.plugins.get(name);
    if (!plugin) return;

    // Remove plugin
    this.plugins.delete(name);

    // Remove hooks
    if (plugin.hooks) {
      Object.entries(plugin.hooks).forEach(([hookName, hookFn]) => {
        const hookList = this.hooks.get(hookName);
        if (hookList) {
          const hookIndex = hookList.indexOf(hookFn);
          if (hookIndex !== -1) {
            hookList.splice(hookIndex, 1);
          }
          if (hookList.length === 0) {
            this.hooks.delete(hookName);
          }
        }
      });
    }

    if (this.logger) {
      this.logger.info(`Plugin '${name}' unregistered`);
    }
  }

  /**
   * Get the dependency graph of all plugins
   */
  getDependencyGraph(): Map<string, string[]> {
    const graph = new Map<string, string[]>();

    for (const [name, plugin] of this.plugins.entries()) {
      graph.set(name, plugin.dependencies || []);
    }

    return graph;
  }

  /**
   * Validate plugin dependencies
   */
  validateDependencies(): boolean {
    const graph = this.getDependencyGraph();

    // Check for missing dependencies
    for (const [pluginName, dependencies] of graph.entries()) {
      for (const dependency of dependencies) {
        if (!this.plugins.has(dependency)) {
          if (this.logger) {
            this.logger.error(
              `Plugin '${pluginName}' depends on '${dependency}', but it is not registered`
            );
          } else {
            console.error(
              `Plugin '${pluginName}' depends on '${dependency}', but it is not registered`
            );
          }
          return false;
        }
      }
    }

    // Check for circular dependencies
    const visited = new Set<string>();
    const recStack = new Set<string>();

    const checkCircular = (node: string): boolean => {
      if (!visited.has(node)) {
        visited.add(node);
        recStack.add(node);

        const dependencies = graph.get(node) || [];
        for (const dependency of dependencies) {
          if (!visited.has(dependency) && checkCircular(dependency)) {
            return true;
          } else if (recStack.has(dependency)) {
            if (this.logger) {
              this.logger.error(
                `Circular dependency detected: ${node} -> ${dependency}`
              );
            } else {
              console.error(
                `Circular dependency detected: ${node} -> ${dependency}`
              );
            }
            return true;
          }
        }
      }

      recStack.delete(node);
      return false;
    };

    for (const node of graph.keys()) {
      if (checkCircular(node)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get the initialization order based on dependencies
   */
  private getInitializationOrder(): string[] {
    const graph = this.getDependencyGraph();
    const visited = new Set<string>();
    const order: string[] = [];

    const visit = (node: string) => {
      if (visited.has(node)) return;

      visited.add(node);

      const dependencies = graph.get(node) || [];
      for (const dependency of dependencies) {
        visit(dependency);
      }

      order.push(node);
    };

    for (const node of graph.keys()) {
      visit(node);
    }

    return order;
  }
}
