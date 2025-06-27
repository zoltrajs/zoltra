class MockRequest {
  method: string;
  url: string;
  body: any;
  headers: Record<string, string> = {};
  query: Record<string, string> = {};

  constructor(method: string, url: string, body: any) {
    this.method = method;
    this.url = url;
    this.body = body;
  }

  on() {} // no-op for now
}

class MockResponse {
  statusCode: number = 200;
  body: any = null;
  headers: Record<string, string> = {};

  json(data: any) {
    this.setHeader("Content-Type", "application/json");
    this.body = JSON.stringify(data);
    this.end();
  }

  status(code: number) {
    this.statusCode = code;
    return this;
  }

  send(data: any) {
    if (typeof data === "object") {
      this.setHeader("Content-Type", "application/json");
      this.body = JSON.stringify(data);
    } else {
      this.setHeader("Content-Type", "text/html");
      this.body = String(data);
    }
    this.end();
  }

  end() {
    // nothing to do, just marks response complete
  }

  setHeader(key: string, value: string) {
    this.headers[key.toLowerCase()] = value;
  }
}

export { MockRequest, MockResponse };
