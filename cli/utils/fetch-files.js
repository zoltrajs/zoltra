import { readFileSync } from "fs";
import ora from "ora";
import path from "path";
import { fileURLToPath } from "url";
import { colorText, Logger } from "zoltra";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const config = JSON.parse(
  readFileSync(path.resolve(__dirname, "../json/__starter.json"), "utf-8")
);

const Spinner = ora();

const logger = new Logger("FileFetcher");

export const fetchFiles = async () => {
  const fetchRecursive = async (obj) => {
    const entries = await Promise.all(
      Object.entries(obj).map(async ([key, value]) => {
        if (typeof value === "object") {
          return [key, await fetchRecursive(value)];
        } else {
          const response = await fetch(value);
          if (!response.ok) {
            throw new Error(`Failed to fetch ${value}`);
          }
          const content = await response.text();
          return [key, content];
        }
      })
    );
    return Object.fromEntries(entries);
  };

  try {
    Spinner.start(colorText("Downloading boilerplate....", "blue"));
    const downloadedFiles = await fetchRecursive(config);
    Spinner.succeed(
      colorText("Boilerplate downloaded successfully!", "bold", "green")
    );
    return downloadedFiles;
  } catch (error) {
    Spinner.stop(colorText("❌ Failed to download", "red"));
    logger.error("Error fetching files", undefined);
    return;
  }
};
