import { IncomingMessage } from "http";
import { WebSocket } from "ws";
import { IApplication, IContainer } from "../../types/core";
import { parse as parseUrl } from "url";

export class WebSocketContext {
  public readonly ws: WebSocket;
  public readonly req: IncomingMessage;
  public readonly app: IApplication;
  public readonly container: IContainer;
  public readonly id: string;
  public readonly url: string;
  public readonly path: string;
  public readonly query: Record<string, any>;
  public readonly params: Record<string, any>;
  public readonly headers: Record<string, any>;
  public readonly ip: string | undefined;
  public error: Error | undefined;

  private _message: any;
  private _data: Map<string, any> = new Map();

  constructor(ws: WebSocket, req: IncomingMessage, app: IApplication) {
    this.ws = ws;
    this.req = req;
    this.app = app;
    this.container = app.container;

    // Generate a unique ID for this connection
    this.id = this._generateId();

    // Parse URL and query parameters
    this.url = req.url || "/";
    const parsedUrl = parseUrl(this.url, true);
    this.path = parsedUrl.pathname || "/";
    this.query = parsedUrl.query || {};

    // Headers and IP
    this.headers = req.headers;
    this.ip = req.socket.remoteAddress;

    // Initialize empty params
    this.params = {};
  }

  /**
   * Set the current message
   */
  setMessage(message: any): void {
    this._message = message;
  }

  /**
   * Get the current message
   */
  get message(): any {
    return this._message;
  }

  /**
   * Send a message to the client
   */
  send(data: any): void {
    if (this.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    const message = typeof data === "string" ? data : JSON.stringify(data);
    this.ws.send(message);
  }

  /**
   * Send an event to the client
   */
  emit(event: string, data: any): void {
    this.send({
      event,
      data,
    });
  }

  /**
   * Close the connection
   */
  close(code?: number, reason?: string): void {
    this.ws.close(code, reason);
  }

  /**
   * Store data in the context
   */
  set(key: string, value: any): void {
    this._data.set(key, value);
  }

  /**
   * Get data from the context
   */
  get(key: string): any {
    return this._data.get(key);
  }

  /**
   * Check if the connection is still open
   */
  get isOpen(): boolean {
    return this.ws.readyState === WebSocket.OPEN;
  }

  /**
   * Generate a unique ID for this connection
   */
  private _generateId(): string {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  }
}
