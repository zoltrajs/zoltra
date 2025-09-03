import { IncomingMessage, ServerResponse } from "http";
import { parse as parseQuery, ParsedUrlQuery } from "querystring";
import { parse as parseUrl, UrlWithStringQuery } from "url";
import { IApplication, IContainer, IContext } from "../../types";

export interface ContextOptions {
  req: IncomingMessage;
  res: ServerResponse;
  app: IApplication;
}

export class Context implements IContext {
  req: IncomingMessage;
  res: ServerResponse;
  app: IApplication;

  method: string;
  url: string;
  path: string;
  query: ParsedUrlQuery;

  private _statusCode: number;
  private _headers: Record<string, string>;
  private _body: any;
  private _sent: boolean;

  private _bodyParsed: boolean;
  public _parsedBody?: any;
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
    this._headers = {};
    this._body = null;
    this._sent = false;

    this._bodyParsed = false;
    this._rawBody = "";

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

  set(name: string, value: string): this {
    this._headers[name.toLowerCase()] = value;
    return this;
  }

  get(name: string): string | undefined {
    return this._headers[name.toLowerCase()];
  }

  setHeaders(headers: Record<string, string>): this {
    Object.entries(headers).forEach(([name, value]) => {
      this.set(name, value);
    });
    return this;
  }

  send(body: any): this {
    if (this._sent) {
      throw new Error("Response already sent");
    }
    this._body = body;
    this._send();
    return this;
  }

  json(data: object): this {
    this.set("Content-Type", "application/json");
    return this.send(JSON.stringify(data));
  }

  html(html: string): this {
    this.set("Content-Type", "text/html");
    return this.send(html);
  }

  text(text: string): this {
    this.set("Content-Type", "text/plain");
    return this.send(text);
  }

  redirect(url: string, status: number = 302): this {
    this.status(status);
    this.set("Location", url);
    this.send("");
    return this;
  }

  async body<T = any>(): Promise<T> {
    if (this._bodyParsed) {
      return this._parsedBody as T;
    }

    return new Promise<T>((resolve, reject) => {
      let body = "";

      this.req.on("data", (chunk) => {
        body += chunk.toString();
      });

      this.req.on("end", () => {
        this._rawBody = body;
        this._bodyParsed = true;

        try {
          const contentType = this.headers["content-type"] || "";

          if (contentType.includes("application/json")) {
            this._parsedBody = JSON.parse(body || "{}");
          } else if (
            contentType.includes("application/x-www-form-urlencoded")
          ) {
            this._parsedBody = parseQuery(body);
          } else {
            this._parsedBody = body;
          }

          resolve(this._parsedBody as T);
        } catch (error) {
          reject(error);
        }
      });

      this.req.on("error", reject);
    });
  }

  get rawBody(): string {
    return this._rawBody;
  }

  service<T = any>(name: string): T {
    return this.services.resolve<T>(name);
  }

  private _send(): void {
    if (this._sent) return;

    if (!this.get("content-type")) {
      this.set("Content-Type", "text/plain");
    }

    this.res.writeHead(this._statusCode, this._headers);

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
