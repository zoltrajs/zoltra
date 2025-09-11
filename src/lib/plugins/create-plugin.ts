import { IApplication } from "../../types";
import { LifecycleHook, Plugin, PluginConfig, PluginContext } from "../../types/plugin";

/**
 * Plugin options interface
 */
export interface PluginOptions {
  name: string;
  version?: string;
  description?: string;
  dependencies?: string[];
  config?: PluginConfig;
  init?: (app: IApplication) => Promise<void> | void;
  destroy?: (app: IApplication) => Promise<void> | void;
  hooks?: {
    [key in LifecycleHook]?: (context: PluginContext) => Promise<void> | void;
  };
}

/**
 * Create a plugin from options
 */
export function createPlugin(options: PluginOptions): Plugin {
  const { name, version, description, dependencies, config, init, destroy, hooks } = options;

  // Validate required fields
  if (!name) {
    throw new Error('Plugin name is required');
  }

  // Create the plugin object
  const plugin: Plugin = {
    name,
    version,
    description,
    dependencies,
    config: config || {},
    init,
    destroy,
    hooks: {},
  };

  // Add hooks
  if (hooks) {
    for (const [hookName, hookFn] of Object.entries(hooks)) {
      if (typeof hookFn === 'function') {
        plugin.hooks![hookName] = hookFn;
      }
    }
  }

  return plugin;
}

/**
 * Create a simple plugin with just a name and init function
 */
export function simplePlugin(
  name: string,
  initFn: (app: IApplication) => Promise<void> | void
): Plugin {
  return createPlugin({
    name,
    init: initFn,
  });
}