class ApiError extends Error {
  statusCode?: number;
  code?: number | string;
  errors?: any;

  constructor(
    message: string,
    name?: string,
    statusCode?: number,
    code?: number | string,
    errors?: any
  ) {
    super(message);
    this.name = name || "RequestError";
    this.statusCode = statusCode;
    this.code = code;
    this.errors = errors;

    Object.setPrototypeOf(this, ApiError.prototype);
  }
}

export default ApiError;
