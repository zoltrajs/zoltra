import { IncomingMessage, ServerResponse } from "http";
import { parse as parseQuery, ParsedUrlQuery } from "querystring";
import { parse as parseUrl, UrlWithStringQuery } from "url";
import { IApplication, IContainer, IContext } from "../../types";
import { ZoltraError } from "../errors";
import * as HttpErrors from "../errors/http";

export class Context implements IContext {
  req: IncomingMessage;
  res: ServerResponse;
  app: IApplication;

  method: string;
  url: string;
  path: string;
  query: ParsedUrlQuery;
  _startTime: [number, number];

  private _statusCode: number;
  private _headers: Map<string, string> = new Map();
  public _body: any;
  private _sent: boolean;

  private _bodyParsed: boolean;
  private _rawBody: string;

  params: Record<string, string>;
  services: IContainer;

  constructor(req: IncomingMessage, res: ServerResponse, app: IApplication) {
    this.req = req;
    this.res = res;
    this.app = app;

    this.method = req.method || "GET";
    this.url = req.url || "/";
    const parsedUrl: UrlWithStringQuery = parseUrl(this.url);
    this.path = parsedUrl.pathname || "/";
    this.query = parseQuery(parsedUrl.query || "");

    this._statusCode = 200;
    this._body = null;
    this._sent = false;

    this._bodyParsed = false;
    this._rawBody = "";
    this._startTime = process.hrtime();

    this.params = {};
    this.services = app.container;
  }

  get headers(): IncomingMessage["headers"] {
    return this.req.headers;
  }

  status(code: number): this {
    this._statusCode = code;
    return this;
  }

  get(key: string): string | undefined {
    return this._headers.get(key.toLowerCase());
  }

  set(key: string, value: string) {
    this._headers.set(key.toLowerCase(), value);
    this.res.setHeader(key, value);
    return this;
  }

  send(body: any): void {
    if (this._sent) {
      throw new Error("Response already sent");
    }
    this._body = body;
    this._send();
  }

  json(data: object): void {
    this.set("Content-Type", "application/json");
    this.send(JSON.stringify(data));
  }

  jsonString(data: string) {
    this.set("content-type", "application/json");
    this.send(data);
  }

  html(html: string): void {
    this.set("Content-Type", "text/html");
    this.send(html);
  }

  text(text: string): void {
    this.set("Content-Type", "text/plain");
    this.send(text);
  }

  redirect(url: string, status: number = 302): this {
    this.status(status);
    this.set("Location", url);
    this.send("");
    return this;
  }

  throw(status: number, message?: string, details?: any): never {
    let error: ZoltraError;

    // Create the appropriate error based on status code
    switch (status) {
      case 400:
        error = new HttpErrors.BadRequestError(message, details);
        break;
      case 401:
        error = new HttpErrors.UnauthorizedError(message, details);
        break;
      case 403:
        error = new HttpErrors.ForbiddenError(message, details);
        break;
      case 404:
        error = new HttpErrors.NotFoundError(message, details);
        break;
      case 409:
        error = new HttpErrors.ConflictError(message, details);
        break;
      case 422:
        error = new HttpErrors.ValidationError(message, details);
        break;
      case 429:
        error = new HttpErrors.TooManyRequestsError(message, details);
        break;
      case 500:
        error = new HttpErrors.InternalServerError(message, details);
        break;
      case 501:
        error = new HttpErrors.NotImplementedError(message, details);
        break;
      case 503:
        error = new HttpErrors.ServiceUnavailableError(message, details);
        break;
      default:
        error = new ZoltraError(message || "Error", { status, details });
    }

    throw error;
  }

  async body(): Promise<any> {
    if (this._body !== null) return this._body;

    const chunks: Buffer[] = [];
    for await (const chunk of this.req) {
      chunks.push(chunk as Buffer);
    }
    const raw = Buffer.concat(chunks);

    const type = this.req.headers["content-type"] || "";

    if (type.includes("application/json")) {
      try {
        this._body = JSON.parse(raw.toString("utf8"));
      } catch {
        this._body = null;
      }
    } else if (type.includes("application/x-www-form-urlencoded")) {
      this._body = new URLSearchParams(raw.toString("utf8"));
    } else {
      this._body = raw; // leave as Buffer
    }

    return this._body;
  }

  get rawBody(): string {
    return this._rawBody;
  }

  service<T = any>(name: string): T {
    // Check if the service is registered in the container
    if (this.services.has(name)) {
      const registration = (this.services as any).services.get(name);

      // If it's a request-scoped service, use the RequestContext
      if (registration && registration.scope === "request") {
        // Lazy import to avoid circular dependency
        const { RequestContext } = require("../di/request-context");
        return RequestContext.resolve(this, name);
      }
    }

    // Otherwise use the regular container
    return this.services.resolve<T>(name);
  }

  private _send(): void {
    if (this._sent) return;

    if (!this.get("content-type")) {
      this.set("Content-Type", "text/plain");
    }

    this.res.writeHead(this._statusCode, ...this._headers);

    if (this._body !== null) {
      this.res.end(this._body);
    } else {
      this.res.end();
    }

    this._sent = true;
  }

  get sent(): boolean {
    return this._sent;
  }

  get statusCode(): number {
    return this._statusCode;
  }
}
