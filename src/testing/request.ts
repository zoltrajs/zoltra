import { Methods } from "../types";
import { MockRequest, MockResponse } from "./mock";
import Server from "./server";

/**
 * Represents a mock request object for testing purpose.
 *
 * This class provides a simple way to create mock request that can be used
 * in unit tests or integration tests with testing frameworks like jest.
 *
 * @class Request
 */
class Request {
  private server: Server;

  /**
   * Creates a new Request instance.
   */
  constructor() {
    this.server = new Server();
  }

  /** Loads routes from `routes` folder. */
  public async load() {
    await this.server.start();
  }

  /** Terminate the current request instance */
  public close() {
    this.server.stop();
  }

  public routes() {
    return this.server.router.routes;
  }

  // private requestHandler() {
  //   return async (req: any, res: any) => {
  //     const next = async (error?: Error | unknown) => {
  //       if (error) console.log("next error:", (error as Error).message);
  //     };
  //     try {
  //       console.log("[DEBUG] About to handle route:", req.method, req.url);
  //       await this.router.handle(req, res, next);
  //       console.log("[DEBUG] Finished handling route");
  //     } catch (error) {
  //       const err = error as Error;
  //       this.logger.error("[DEBUG] ERROR in route handler", { ...err });
  //       console.log("[DEBUG] ERROR in route handler:", error);
  //     }
  //   };
  // }

  private assign(method: Methods, path: string, body: any = {}) {
    const req = new MockRequest(method, path, body);
    const res = new MockResponse();

    return { req, res };
  }

  private enchanceRequest(req: any, path: string) {
    req.query = this.extractQuery(path);
    console.log("queries:", req.query);
  }

  private extractQuery(path: string) {
    if (!path.includes("?")) {
      return {};
    }
    // Get index of query start '?'
    const qIndex = path.indexOf("?");

    // Slice url string from query start index + 1
    const slicedString = path.slice(qIndex + 1, path.length);

    // Slipt the sliced string with '&'
    const extractedQuery = slicedString.split("&");

    // Extract result into an object
    let result: Record<string, string> = {};

    for (const query of extractedQuery) {
      const [name, value] = query.split("=");
      result[name] = value;
    }

    return result;
  }

  private request = {
    get: async (path: string) => {
      const { req, res } = this.assign("GET", path, {});
      this.enchanceRequest(req, path);
      const handler = this.server.handler();
      await handler(req, res);
      return res;
    },
    post: async (path: string, body = {}) => {
      const { req, res } = this.assign("POST", path, body);
      this.enchanceRequest(req, path);
      const handler = this.server.handler();
      await handler(req, res);
      return res;
    },
    patch: async (path: string, body = {}) => {
      const { req, res } = this.assign("PATCH", path, body);
      this.enchanceRequest(req, path);
      const handler = this.server.handler();
      await handler(req, res);
      return res;
    },
    put: async (path: string, body = {}) => {
      const { req, res } = this.assign("PUT", path, body);
      this.enchanceRequest(req, path);
      const handler = this.server.handler();
      await handler(req, res);
      return res;
    },
    delete: async (path: string) => {
      const { req, res } = this.assign("DELETE", path, {});
      this.enchanceRequest(req, path);
      const handler = this.server.handler();
      await handler(req, res);
      return res;
    },
  };

  /**
   * Simulates a GET request.
   *
   * @param path - The url of the request.
   * @returns {Promise<MockResponse>} A promise resolving to MockResponse
   */
  public get(path: string) {
    return this.request.get(path);
  }

  /**
   * Simulates a DELETE request.
   *
   * @param path - The url of the request.
   * @returns {Promise<MockResponse>} A promise resolving to MockResponse
   */
  public delete(path: string) {
    return this.request.delete(path);
  }

  /**
   * Simulates a POST request.
   *
   * @param path - The url of the request.
   * @param body - The data to be sent with the request.
   * @returns {Promise<MockResponse>} A promise resolving to MockResponse
   */
  public post(path: string, body: any = {}) {
    return this.request.post(path, body);
  }

  /**
   * Simulates a PATCH request.
   *
   * @param path - The url of the request.
   * @param body - The data to be sent with the request.
   * @returns {Promise<MockResponse>} A promise resolving to MockResponse
   */
  public patch(path: string, body: any = {}) {
    return this.request.patch(path, body);
  }

  /**
   * Simulates a PUT request.
   *
   * @param path - The url of the request.
   * @param body - The data to be sent with the request.
   * @returns {Promise<MockResponse>} A promise resolving to MockResponse
   */
  public put(path: string, body: any = {}) {
    return this.request.put(path, body);
  }
}

export default Request;
