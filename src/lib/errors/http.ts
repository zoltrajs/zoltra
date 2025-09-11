import { ZoltraError } from "./base";

/**
 * HTTP 400 Bad Request Error
 */
export class BadRequestError extends ZoltraError {
  constructor(message = "Bad Request", details?: any) {
    super(message, {
      status: 400,
      code: "BAD_REQUEST",
      details,
      isOperational: true,
    });
  }
}

/**
 * HTTP 401 Unauthorized Error
 */
export class UnauthorizedError extends ZoltraError {
  constructor(message = "Unauthorized", details?: any) {
    super(message, {
      status: 401,
      code: "UNAUTHORIZED",
      details,
      isOperational: true,
    });
  }
}

/**
 * HTTP 403 Forbidden Error
 */
export class ForbiddenError extends ZoltraError {
  constructor(message = "Forbidden", details?: any) {
    super(message, {
      status: 403,
      code: "FORBIDDEN",
      details,
      isOperational: true,
    });
  }
}

/**
 * HTTP 404 Not Found Error
 */
export class NotFoundError extends ZoltraError {
  constructor(message = "Not Found", details?: any) {
    super(message, {
      status: 404,
      code: "NOT_FOUND",
      details,
      isOperational: true,
    });
  }
}

/**
 * HTTP 409 Conflict Error
 */
export class ConflictError extends ZoltraError {
  constructor(message = "Conflict", details?: any) {
    super(message, {
      status: 409,
      code: "CONFLICT",
      details,
      isOperational: true,
    });
  }
}

/**
 * HTTP 422 Unprocessable Entity Error
 */
export class ValidationError extends ZoltraError {
  constructor(message = "Validation Error", details?: any) {
    super(message, {
      status: 422,
      code: "VALIDATION_ERROR",
      details,
      isOperational: true,
    });
  }
}

/**
 * HTTP 429 Too Many Requests Error
 */
export class TooManyRequestsError extends ZoltraError {
  constructor(message = "Too Many Requests", details?: any) {
    super(message, {
      status: 429,
      code: "TOO_MANY_REQUESTS",
      details,
      isOperational: true,
    });
  }
}

/**
 * HTTP 500 Internal Server Error
 */
export class InternalServerError extends ZoltraError {
  constructor(message = "Internal Server Error", details?: any) {
    super(message, {
      status: 500,
      code: "INTERNAL_SERVER_ERROR",
      details,
      isOperational: false,
    });
  }
}

/**
 * HTTP 501 Not Implemented Error
 */
export class NotImplementedError extends ZoltraError {
  constructor(message = "Not Implemented", details?: any) {
    super(message, {
      status: 501,
      code: "NOT_IMPLEMENTED",
      details,
      isOperational: true,
    });
  }
}

/**
 * HTTP 503 Service Unavailable Error
 */
export class ServiceUnavailableError extends ZoltraError {
  constructor(message = "Service Unavailable", details?: any) {
    super(message, {
      status: 503,
      code: "SERVICE_UNAVAILABLE",
      details,
      isOperational: true,
    });
  }
}
