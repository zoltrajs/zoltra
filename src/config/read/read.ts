import { ZoltraConfig } from "../../types";
import { existsSync, readFileSync } from "fs";
import path from "path";
import { config } from "../index";

export const readConfig = () => {
  const tsConfig = path.join(process.cwd(), "/tsconfig.json");
  const extention = existsSync(tsConfig) ? ".ts" : ".js";
  const dir = path.join(process.cwd(), `/zoltra.config${extention}`);
  const impt = 'import { zoltraConfig } from "zoltra";';

  try {
    const content = readFileSync(dir, "utf-8");

    // Remove all comments
    const filteredContent = content
      .replace(
        /(['"`])(\\.|[^\x01\\])*?\1|\/\/.*|\/\*[\s\S]*?\*\//gm,
        (match, quote) => (quote ? match : "")
      )
      .replace(impt, "")
      .replace(/\s+/g, "");

    const match = filteredContent.match(/\{.*\}/)?.[0];
    if (match) {
      const configObj: ZoltraConfig = new Function(`return ${match}`)();
      return { ...configObj };
    } else {
      console.log("Invalid config file");
      return config;
    }
  } catch (error) {
    console.error("error reading config:", error);
    return config;
  }
};
