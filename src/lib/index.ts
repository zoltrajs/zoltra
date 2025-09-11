export { Application } from "./core/app";
export { Context } from "./core/context";
export { cors } from "./middleware/cors";
export { Static } from "./middleware/static-middleware";
export * from "./errors";
// export { ValidationError } from "./errors";

// Plugin system export
export { BasePlugin } from "./plugins/base-plugin";
export { createPlugin, simplePlugin } from "./plugins/create-plugin";
export { LifecycleHook } from "../types/plugin";

// HTTP/2 export
export { createHTTP2Server, HTTP2Options } from "./core/http2-server";
export { compress, CompressionOptions } from "./middleware/compression";

// WebSocket export
export { WebSocketManager } from "./core/websocket-server";
export { WebSocketContext } from "./core/websocket-context";
export {
  WebSocketOptions,
  WebSocketHandler,
  WebSocketMessage,
  WebSocketEventHandlers,
} from "../types/websocket";

export { Assert } from "./testing/assert";
export { HTTPClient } from "./testing/http-client";
export { TestRunner } from "./testing/runner";
export * from "./plugins/index";
export * from "./middleware/index";
export { Logger } from "./utils/logger";
