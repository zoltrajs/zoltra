import { existsSync } from "fs";
import { Plugin } from "./plugin";
import { join } from "path";
import { AppInterface, ZoltraConfig } from "../types";
import { pathToFileURL } from "url";

export const loadPluginsAsync = async (
  app: AppInterface,
  config: ZoltraConfig
) => {
  const _plugins = config.plugins;

  if (!_plugins || typeof _plugins === "undefined") return {};

  let plugins: Record<string, Plugin> = {};

  for (const _plugin of _plugins) {
    // Check if '_plugin' is an instance of 'Plugin' or import string
    if (typeof _plugin === "string") {
      const isCustomPlugin = _plugin.startsWith("./");
      const isTypeScript = existsSync(join(process.cwd(), "tsconfig.json"));
      let importPath;

      if (isCustomPlugin) {
        importPath = buildImportPath(isTypeScript, _plugin);
        let file;

        if (isTypeScript) {
          file = require(importPath);
        } else {
          file = await import(importPath);
        }

        const extractedPlugin: any = Object.values(file)[0];

        if (typeof extractedPlugin === "undefined") return {};
        const pluginInstance = new extractedPlugin();

        if (pluginInstance instanceof Plugin === false) {
          throw new Error(`${pluginInstance} is not a valid Plugin`);
        }

        plugins[pluginInstance.name] = pluginInstance;
        pluginInstance.init(app);
      } else {
        // TODO: Implement library loading
      }
    } else {
      const pluginInstance = _plugin;
      if (typeof pluginInstance === "undefined") return {};

      if (pluginInstance instanceof Plugin === false) {
        throw new Error(`${pluginInstance} is not a valid Plugin`);
      }

      plugins[pluginInstance.name] = pluginInstance;
      pluginInstance.init(app);
    }
  }

  return plugins;
};

const buildImportPath = (isTypeScript: boolean, pluginPath: string) => {
  const strippedPath = pluginPath.replace(/./, "").replace(".ts", ".js");
  if (isTypeScript) {
    const basePath = join(process.cwd(), "dist", strippedPath);
    return basePath;
  }

  const basePath = join(process.cwd(), strippedPath);
  const pathUrl = pathToFileURL(basePath);

  return pathUrl.href;
};
