import { IncomingMessage, ServerResponse } from "http";
import { parse as parseQuery, ParsedUrlQuery } from "querystring";
import { parse as parseUrl, UrlWithStringQuery } from "url";
import { IApplication, IContainer, IContext, Registry } from "../../types";

export class Context implements IContext {
  req: IncomingMessage;
  res: ServerResponse;
  app: IApplication;

  method: string;
  url: string;
  path: string;
  query: ParsedUrlQuery;

  private _statusCode: number;
  private _headers: Map<string, string> = new Map();
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

  get(key: string): string | undefined {
    return this._headers.get(key.toLowerCase());
  }

  set(key: string, value: string) {
    this._headers.set(key.toLowerCase(), value);
    this.res.setHeader(key, value);
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

  jsonString(data: string) {
    this.set("content-type", "application/json");
    this.send(data);
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

  // async body<T = any>(): Promise<T> {
  //   if (this._bodyParsed) {
  //     return this._parsedBody as T;
  //   }

  //   return new Promise<T>((resolve, reject) => {
  //     let body = "";

  //     this.req.on("data", (chunk) => {
  //       body += chunk.toString();
  //     });

  //     this.req.on("end", () => {
  //       this._rawBody = body;
  //       this._bodyParsed = true;

  //       try {
  //         const contentType = this.headers["content-type"] || "";

  //         if (contentType.includes("application/json")) {
  //           this._parsedBody = JSON.parse(body || "{}");
  //         } else if (
  //           contentType.includes("application/x-www-form-urlencoded")
  //         ) {
  //           this._parsedBody = parseQuery(body);
  //         } else {
  //           this._parsedBody = body;
  //         }

  //         resolve(this._parsedBody as T);
  //       } catch (error) {
  //         reject(error);
  //       }
  //     });

  //     this.req.on("error", reject);
  //   });
  // }

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

  service<T = any>(name: Registry.__services["name"]): T {
    return this.services.resolve<T>(name);
  }

  private _send(): void {
    if (this._sent) return;

    if (!this.get("content-type")) {
      this.set("Content-Type", "text/plain");
    }

    this.res.writeHead(this._statusCode, ...this._headers);

    // for (const [k, v] of this._headers) {
    //   this.res.setHeader(k, v);
    // }

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
