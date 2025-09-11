import { WebSocketContext } from "../lib/core/websocket-context";

/**
 * WebSocket options
 */
export interface WebSocketOptions {
  /**
   * WebSocket server path
   * @default '/ws'
   */
  path?: string;

  /**
   * Maximum allowed message size in bytes
   */
  maxPayload?: number;

  /**
   * Enable/disable per-message deflate
   */
  perMessageDeflate?: boolean | object;

  /**
   * Ping interval in milliseconds
   * @default 30000
   */
  pingInterval?: number;

  /**
   * Ping timeout in milliseconds
   * @default 5000
   */
  pingTimeout?: number;
}

/**
 * WebSocket handler function
 */
export type WebSocketHandler = (
  context: WebSocketContext
) => void | Promise<void>;

/**
 * WebSocket event handler map
 */
export interface WebSocketEventHandlers {
  connection?: WebSocketHandler;
  message?: WebSocketHandler;
  close?: WebSocketHandler;
  error?: WebSocketHandler;
  [key: string]: WebSocketHandler | undefined;
}

/**
 * WebSocket message
 */
export interface WebSocketMessage {
  event?: string;
  data?: any;
  [key: string]: any;
}

/**
 * WebSocket client information
 */
export interface WebSocketClientInfo {
  id: string;
  ip?: string;
  userAgent?: string;
  url?: string;
  protocol?: string;
  connectedAt: Date;
}
