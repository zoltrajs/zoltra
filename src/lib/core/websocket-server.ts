import { Server as WebSocketServer } from "ws";
import { Server as HttpServer } from "http";
import { IApplication } from "../../types/core";
import { ILogger } from "../../types/utils";
import { WebSocketContext } from "./websocket-context";
import { WebSocketOptions } from "../../types/websocket";

export class WebSocketManager {
  private wss: WebSocketServer | null = null;
  private handlers: Map<string, Function[]> = new Map();
  private logger: ILogger;
  private app: IApplication;
  private options: WebSocketOptions;

  constructor(app: IApplication, options: WebSocketOptions = {}) {
    this.app = app;
    this.logger = app.logger;
    this.options = {
      path: "/ws",
      ...options,
    };
  }

  /**
   * Initialize the WebSocket server
   * @param server HTTP server instance
   */
  initialize(server: HttpServer): void {
    if (this.wss) {
      this.logger.warn("WebSocket server already initialized");
      return;
    }

    const wsOptions: any = {
      server,
      path: this.options.path,
      clientTracking: true,
    };

    // Add any additional options
    if (this.options.maxPayload) wsOptions.maxPayload = this.options.maxPayload;
    if (this.options.perMessageDeflate !== undefined) {
      wsOptions.perMessageDeflate = this.options.perMessageDeflate;
    }

    this.wss = new WebSocketServer(wsOptions);

    this.wss.on("connection", (ws, req) => {
      const context = new WebSocketContext(ws, req, this.app);

      // Execute connection handlers
      this._executeHandlers("connection", context);

      ws.on("message", (message) => {
        try {
          const parsedMessage = this._parseMessage(message);
          context.setMessage(parsedMessage);

          // If event is specified, trigger event handlers
          if (parsedMessage.event) {
            this._executeHandlers(parsedMessage.event, context);
          }

          // Execute message handlers
          this._executeHandlers("message", context);
        } catch (err: any) {
          this.logger.error("Error processing WebSocket message", {
            error: err.message,
            stack: err.stack,
          });

          // Execute error handlers
          this._executeHandlers("error", { ...context, error: err });
        }
      });

      ws.on("close", (code, reason) => {
        // Execute close handlers
        this._executeHandlers("close", { ...context, code, reason });
      });

      ws.on("error", (err) => {
        this.logger.error("WebSocket error", {
          error: err.message,
        });

        context.error = err;

        // Execute error handlers
        this._executeHandlers("error", { ...context, error: err });
      });
    });

    this.logger.info(
      `WebSocket server initialized on path: ${this.options.path}`
    );
  }

  /**
   * Register an event handler
   * @param event Event name
   * @param handler Handler function
   */
  on(event: string, handler: Function): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  /**
   * Broadcast a message to all connected clients
   * @param data Message data
   * @param filter Optional filter function
   */
  broadcast(data: any, filter?: (client: any) => boolean): void {
    if (!this.wss) {
      this.logger.warn("Cannot broadcast: WebSocket server not initialized");
      return;
    }

    const message = typeof data === "string" ? data : JSON.stringify(data);

    this.wss.clients.forEach((client) => {
      if (filter && !filter(client)) return;
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }

  /**
   * Get the number of connected clients
   */
  get clientCount(): number {
    return this.wss ? this.wss.clients.size : 0;
  }

  /**
   * Close the WebSocket server
   */
  close(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.wss) {
        resolve();
        return;
      }

      this.wss.close((err) => {
        if (err) {
          this.logger.error("Error closing WebSocket server", {
            error: err.message,
          });
          reject(err);
        } else {
          this.logger.info("WebSocket server closed");
          this.wss = null;
          resolve();
        }
      });
    });
  }

  /**
   * Parse incoming WebSocket message
   * @param message Raw message
   */
  private _parseMessage(message: any): any {
    if (typeof message === "string") {
      try {
        return JSON.parse(message);
      } catch (e) {
        // If not valid JSON, return as plain text
        return { data: message };
      }
    } else if (message instanceof Buffer) {
      try {
        return JSON.parse(message.toString());
      } catch (e) {
        // If not valid JSON, return as buffer
        return { data: message };
      }
    }

    // Default fallback
    return { data: message };
  }

  /**
   * Execute handlers for a specific event
   * @param event Event name
   * @param context WebSocket context
   */
  private _executeHandlers(event: string, context: any): void {
    const handlers = this.handlers.get(event) || [];

    for (const handler of handlers) {
      try {
        handler(context);
      } catch (err: any) {
        this.logger.error(`Error in WebSocket '${event}' handler`, {
          error: err.message,
          stack: err.stack,
        });
      }
    }
  }
}
