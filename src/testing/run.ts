import { join } from "path";
import { pathToFileURL } from "url";
import { TestRunner } from "./runner";
import { createServer } from "http";
import { TApp } from "./TApp";
import { colorText, Logger } from "utils";
import { readdirSync } from "fs";
import { getExtension, getLang, getTestRoot } from "../config/system-info";

const startServer = async (
  logger: Logger,
  port: number = 3000,
  basePath: string
) => {
  const app = new TApp(logger);
  const server = createServer(app.THandler());
  server.listen(port, () => {
    console.log(
      colorText(
        `\n🚀 Starting test runner...\n📂 Entry: ${join(
          basePath,
          "run" + getExtension()
        )}\n👀 Watching: ${join(process.cwd(), "test")}\n`,
        "bold",
        "white"
      )
    );
  });
};

export async function runTest(port: number = 3000) {
  const { isTypeScript } = getLang();
  const basePath = isTypeScript
    ? join(process.cwd(), "dist", "test")
    : join(process.cwd(), "test");
  const runner = new TestRunner();
  await runner.loadRoutes();
  await startServer(runner.logger, port, basePath);

  const files = readdirSync(join(basePath), { withFileTypes: true }).filter(
    (file) => {
      return file.isFile() === true;
    }
  );

  for (const file of files) {
    const fullPath = getTestRoot(file.name);
    const filePath = pathToFileURL(fullPath).href;
    const testModule = await import(filePath);
    const { failed, passed, totoal } = await runner.runTests(testModule);
    if (failed > 0) {
      break;
    }

    if (passed === totoal) {
      break;
    }
  }
  await runner.printResults();
}
