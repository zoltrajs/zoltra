import compression from "compression";
import { IContext, NextFunction } from "../../types";

/**
 * Compression options interface
 */
export interface CompressionOptions {
  /**
   * Filter function to determine which responses should be compressed
   */
  filter?: (req: any, res: any) => boolean;

  /**
   * Compression level (0-9, where 0 is no compression and 9 is maximum compression)
   */
  level?: number;

  /**
   * Minimum response size in bytes to compress
   */
  threshold?: number;

  /**
   * Compression strategy
   */
  strategy?: number;

  /**
   * Byte length at which to use synchronous deflate
   */
  chunkSize?: number;

  /**
   * Compress responses with this content-type
   */
  contentType?: string | string[];
}

/**
 * Default compression filter function
 * Compresses all responses except those with Content-Type: image/*
 */
const defaultFilter = (req: any, res: any) => {
  const contentType = res.getHeader("Content-Type") || "";
  return !contentType.startsWith("image/");
};

/**
 * Creates a middleware that compresses response bodies
 * @param options Compression options
 * @returns Middleware function
 */
export function compress(options: CompressionOptions = {}) {
  // Set default filter if not provided
  const opts = {
    filter: defaultFilter,
    level: 6, // Default compression level
    threshold: 1024, // Default minimum size to compress (1KB)
    ...options,
  };

  // Create compression middleware
  const compressionMiddleware = compression(opts);

  // Return Zoltra middleware wrapper
  return async (ctx: IContext, next: NextFunction) => {
    return new Promise<void>((resolve, reject) => {
      compressionMiddleware(ctx.req as any, ctx.res as any, (err) => {
        if (err) return reject(err);
        next().then(resolve).catch(reject);
      });
    });
  };
}
