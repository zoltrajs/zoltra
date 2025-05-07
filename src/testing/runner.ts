import { IncomingMessage, ServerResponse } from "http";
import {
  Methods,
  TestFunction,
  ZoltraHandler,
  ZoltraRequest,
  ZoltraResponse,
} from "../types";
import { TApp } from "./TApp";
import { Logger } from "../utils/logger";
import { bodyParser } from "middleware/body-parser";
import { delay } from "@zoltra-toolkit/node";
import { colorText } from "utils";

export class TestRunner {
  private tests: { name: string; fn: TestFunction<TestRunner> }[] = [];
  private passed = 0;
  private failed = 0;
  private tapp: TApp;
  public logger: Logger;

  constructor() {
    this.logger = new Logger("TestRunner");
    this.tapp = new TApp(this.logger);
  }

  public async runTests(testModule: Record<string, TestFunction<TestRunner>>) {
    Object.keys(testModule).forEach((testName) => {
      if (testName.startsWith("test")) {
        this.tests.push({ name: testName, fn: testModule[testName] });
      }
    });

    for (const test of this.tests) {
      try {
        await test.fn(this);
        console.log(`✅ ${test.name}`);
        this.passed++;
      } catch (error: any) {
        console.error(`❌ ${test.name}: ${error.message}`);
        this.failed++;
      }
    }

    return {
      passed: this.passed,
      failed: this.failed,
      totoal: this.tests.length,
    };
  }

  public assertEquals<A, E>(actual: A, expected: E, message?: string) {
    if (JSON.stringify(actual) !== JSON.stringify(expected)) {
      throw new Error(
        message ||
          `${colorText("Assertion Failed:", "red", "bold")}
  - Expected:
${colorText(JSON.stringify(expected, null, 2), "green")}

  - Received:
${colorText(JSON.stringify(actual, null, 2), "red")}`
      );
    }
  }

  public assertContains<A, E>(actual: A, expected: E, message?: string) {
    if (!JSON.stringify(actual).includes(JSON.stringify(expected))) {
      throw new Error(message || `Expected ${actual} to contain ${expected}`);
    }
  }

  public assertResponse(
    response: ZoltraResponse,
    expectedStatus: number,
    message?: string
  ) {
    if (response.statusCode !== expectedStatus) {
      throw new Error(
        message ||
          `Expected status ${this.colorStatus(
            expectedStatus
          )}, but got ${this.colorStatus(response.statusCode)}`
      );
    }
  }

  public async simulateRequest(
    method: Methods,
    path: string,
    body?: any
  ): Promise<ZoltraResponse> {
    const req: ZoltraRequest = Object.assign(new IncomingMessage({} as any), {
      method,
      url: path,
      body: body || {},
      params: {},
      query: {},
    });
    const res: ZoltraResponse = Object.assign(new ServerResponse(req), {
      statusCode: 200,
    });
    const handler = this.tapp.THandler();
    this.enhanceResponse(res);
    await this.applyMiddleware(req, res);
    await handler(req, res);
    return res;
  }

  private enhanceResponse(res: ServerResponse) {
    res.json = function (data: unknown) {
      this.setHeader("Content-Type", "application/json");
      this.end(JSON.stringify(data));
    };

    res.status = function (code: number) {
      this.statusCode = code;
      return this;
    };

    res.send = function (data: unknown) {
      if (typeof data === "object") {
        this.setHeader("Content-Type", "application/json");
        this.end(JSON.stringify(data));
      } else {
        this.setHeader("Content-Type", "text/html");
        this.end(data);
      }
    };
  }

  private async applyMiddleware(req: IncomingMessage, res: ServerResponse) {
    await bodyParser()(req, res, async () => {});
  }

  public async inject(method: Methods, path: string, handler: ZoltraHandler) {
    await this.tapp.inject(method, path, handler);
  }

  public async loadRoutes() {
    await this.tapp.loadRoutes();
  }

  public async printResults() {
    await delay(100);
    console.log("\nTest Summary:");
    console.log(`${colorText(`✅ Passed: ${this.passed}`, "green", "bold")}`);
    console.log(`${colorText(`❌ Failed: ${this.failed}`, "red", "bold")}`);
    console.log(
      `${colorText(`🧪 Total: ${this.tests.length}`, "white", "bold")}`
    );
    process.exit(this.failed > 0 ? 1 : 0);
  }

  private colorStatus(statusCode: number): string {
    if (statusCode >= 500) return colorText(statusCode.toString(), "red");
    if (statusCode >= 400) return colorText(statusCode.toString(), "yellow");
    if (statusCode >= 300) return colorText(statusCode.toString(), "cyan");
    if (statusCode >= 200) return colorText(statusCode.toString(), "green");
    return colorText(statusCode.toString(), "white");
  }
}
