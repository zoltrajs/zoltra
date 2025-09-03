/**
 * HTTP testing client
 */
export class HTTPClient {
  private baseURL: string;

  constructor(baseURL: string = "http://localhost:5000") {
    this.baseURL = baseURL;
  }

  /**
   * Make an HTTP request
   */
  async request<T = any>(
    method: string,
    path: string,
    options: {
      headers?: Record<string, string>;
      body?: any;
    } = {}
  ): Promise<{
    status: number;
    statusText: string;
    headers: Record<string, string>;
    body: T | string;
  }> {
    const url = this.baseURL + path;
    const requestOptions: RequestInit = {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
      },
    };

    if (options.body && typeof options.body === "object") {
      requestOptions.body = JSON.stringify(options.body);
    } else if (options.body) {
      requestOptions.body = options.body;
    }

    const response = await fetch(url, requestOptions);
    const contentType = response.headers.get("content-type");

    let body: T | string;
    if (contentType && contentType.includes("application/json")) {
      body = (await response.json()) as T;
    } else {
      body = await response.text();
    }

    return {
      status: response.status,
      statusText: response.statusText,
      headers: Object.fromEntries(response.headers.entries()),
      body,
    };
  }

  /**
   * GET request
   */
  get<T = any>(
    path: string,
    options: { headers?: Record<string, string> } = {}
  ) {
    return this.request<T>("GET", path, options);
  }

  /**
   * POST request
   */
  post<T = any>(
    path: string,
    body?: any,
    options: { headers?: Record<string, string> } = {}
  ) {
    return this.request<T>("POST", path, { ...options, body });
  }

  /**
   * PUT request
   */
  put<T = any>(
    path: string,
    body?: any,
    options: { headers?: Record<string, string> } = {}
  ) {
    return this.request<T>("PUT", path, { ...options, body });
  }

  /**
   * DELETE request
   */
  delete<T = any>(
    path: string,
    options: { headers?: Record<string, string> } = {}
  ) {
    return this.request<T>("DELETE", path, options);
  }
}
