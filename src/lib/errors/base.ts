/**
 * Base error class for Zoltra applications
 */
export class ZoltraError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: any;
  public readonly isOperational: boolean;

  constructor(
    message: string,
    options: {
      status?: number;
      code?: string;
      details?: any;
      isOperational?: boolean;
    } = {}
  ) {
    super(message);

    this.name = this.constructor.name;
    this.status = options.status || 500;
    this.code = options.code || "INTERNAL_ERROR";
    this.details = options.details || null;
    this.isOperational =
      options.isOperational !== undefined ? options.isOperational : true;

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Convert error to a JSON object for response
   */
  toJSON() {
    return {
      status: "error",
      code: this.code,
      message: this.message,
      details: this.details,
    };
  }

  /**
   * Convert error to a plain object
   */
  toObject() {
    return {
      name: this.name,
      message: this.message,
      status: this.status,
      code: this.code,
      details: this.details,
      isOperational: this.isOperational,
      stack: this.stack,
    };
  }
}
