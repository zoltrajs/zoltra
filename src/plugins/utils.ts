import { AppInterface } from "../types";
import { ErrorPluginOptions, Plugin } from "../types/plugin";

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
 *
 * @deprecated This function would be removed in stable release, use the `plugins` option inside `zoltra.config` instead
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
 *
 * @deprecated This function would be removed in stable release, use the `plugins` option inside `zoltra.config` instead
 */
export function createErrorPlugin(options: ErrorPluginOptions) {
  return {
    ...options,
    install: (app: AppInterface) => {
      app.registerErrorHandler(options.handler);
      options.install?.(app);
    },
  };
}
