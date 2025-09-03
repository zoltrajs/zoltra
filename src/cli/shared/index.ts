import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const getPackageOption = () => {
  const packageDotJson = JSON.parse(
    readFileSync(path.resolve(__dirname, "../../package.json"), "utf-8")
  );

  return packageDotJson;
};

export const findEntryPoint = () => {
  const packageDotJson = JSON.parse(
    readFileSync(path.join(process.cwd(), "package.json"), "utf-8")
  );
  return packageDotJson.main || "app.js";
};
