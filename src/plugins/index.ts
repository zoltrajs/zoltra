import { App } from "zoltra/core";
import { ErrorPluginOptions, Plugin } from "../types";

export function createPlugin(plugin: Plugin) {
  return plugin;
}

export function createErrorPlugin(options: ErrorPluginOptions) {
  return {
    ...options,
    install: (app: App) => {
      app.registerErrorHandler(options.handler);
      options.install?.(app);
    },
  };
}
