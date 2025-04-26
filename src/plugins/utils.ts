import { Zoltra } from "zoltra/core";
import { ErrorPluginOptions, Plugin } from "../types";

/**
 * Creates a Zoltra plugin from a plugin configuration.
 * Acts as a factory to ensure type safety or simplify plugin creation.
 * @param plugin - The plugin configuration to create.
 * @returns The plugin object, ready to be registered with Zoltra.
 * @example
 * const myPlugin = createPlugin({
 *   name: "my-plugin",
 *   install: (app) => {
 *     app.addMiddleware((req, res, next) => {
 *       res.setHeader("X-Plugin", "MyPlugin");
 *       next();
 *     });
 *   },
 * });
 * // Usage in app
 * app.register(myPlugin);
 */
export function createPlugin(plugin: Plugin) {
  return plugin;
}

/**
 * Creates an error-handling plugin from the provided options.
 * Automatically registers the error handler and calls the optional install function.
 * @param options - The error plugin configuration, including name and handler.
 * @returns A Plugin object that can be registered with Zoltra.
 * @example
 * const errorPlugin = createErrorPlugin({
 *   name: "custom-error-handler",
 *   handler: async (error, req, res, next) => {
 *     res.status(error instanceof RequestError ? error.statusCode : 500).send({ error: error.message });
 *   },
 * });
 * // Usage in app
 * app.register(errorPlugin);
 */
export function createErrorPlugin(options: ErrorPluginOptions) {
  return {
    ...options,
    install: (app: Zoltra) => {
      app.registerErrorHandler(options.handler);
      options.install?.(app);
    },
  };
}
