import { IApplication } from "../../types";
import type { Plugin, HookFn, IPluginManager } from "../../types/plugin";

/**
 * Plugin manager for extending framework functionality
 */
export class PluginManager implements IPluginManager {
  private plugins: Plugin[] = [];
  private hooks: Map<string, HookFn[]> = new Map();

  register(plugin: Plugin): void {
    if (!plugin.name) {
      throw new Error("Plugin must have a name");
    }

    this.plugins.push(plugin);

    if (plugin.hooks) {
      Object.entries(plugin.hooks).forEach(([hookName, hookFn]) => {
        this.addHook(hookName, hookFn);
      });
    }
  }

  addHook(name: string, fn: HookFn): void {
    if (!this.hooks.has(name)) {
      this.hooks.set(name, []);
    }
    this.hooks.get(name)!.push(fn);
  }

  async executeHook(name: string, ...args: any[]): Promise<void> {
    const hooks = this.hooks.get(name) || [];

    for (const hook of hooks) {
      try {
        await hook(...args);
      } catch (error) {
        console.error(`Plugin hook '${name}' failed:`, error);
      }
    }
  }

  async initialize(app: IApplication): Promise<void> {
    for (const plugin of this.plugins) {
      if (plugin.init) {
        try {
          await plugin.init(app);
        } catch (error) {
          console.error(
            `Plugin '${plugin.name}' initialization failed:`,
            error
          );
        }
      }
    }

    await this.executeHook("init", app);
  }

  getPlugins(): string[] {
    return this.plugins.map((p) => p.name);
  }

  hasPlugin(name: string): boolean {
    return this.plugins.some((p) => p.name === name);
  }

  unregister(name: string): void {
    const index = this.plugins.findIndex((p) => p.name === name);
    if (index !== -1) {
      const plugin = this.plugins[index];
      this.plugins.splice(index, 1);

      if (plugin.hooks) {
        Object.keys(plugin.hooks).forEach((hookName) => {
          const hookList = this.hooks.get(hookName) || [];
          const hookFn = plugin.hooks![hookName];
          const hookIndex = hookList.indexOf(hookFn);
          if (hookIndex !== -1) {
            hookList.splice(hookIndex, 1);
          }
        });
      }
    }
  }
}
