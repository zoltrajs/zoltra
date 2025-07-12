import { colorText, Logger } from "zoltra";
import { execSync } from "child_process";
import path from "path";

import {
  createFiles,
  createFolders,
  createRootDir,
} from "../utils/fileUtils.js";
import { fetchFiles } from "../utils/fetch-files.js";
import { handlePackage } from "../utils/pkg-handler.js";
import { installPkg } from "../utils/deps.js";

export const createApp = async (appName, options) => {
  const { git, typescript, javascript } = options;
  const logger = new Logger("CLI/Zoltra-Create", undefined, false, true);

  if (typescript === undefined && javascript === undefined) {
    console.log(
      colorText(
        "No language option (--typescript or --javascript) was passed. TypeScript will be used by default.",
        "blue"
      )
    );
  }

  const dirSuccess = await createRootDir(appName);

  const isTs = !javascript;

  if (!dirSuccess) {
    return;
  }

  const starterFiles = await fetchFiles();

  if (typeof starterFiles === "undefined") {
    return;
  }

  await createFolders(appName);

  await createFiles(appName, isTs, starterFiles);

  if (isTs) {
    await handlePackage(appName, starterFiles.typescript.package);
  } else {
    await handlePackage(appName, starterFiles.javascript.package);
  }

  await installPkg(appName);

  if (git) {
    try {
      if (appName !== "./") {
        execSync(`cd ${path.resolve(appName)} && git init`, {
          stdio: "ignore",
        });
      } else {
        execSync(`git init`, { stdio: "ignore" });
      }
    } catch (error) {
      logger.error("Error initializing Git repository:", {
        message: error.message,
        stack: error.stack,
        name: "Git Initialization Error",
      });
      return;
    }
  }

  logSuccess(appName);
};

const logSuccess = (projectName) => {
  console.log(
    colorText(
      `✅ Project "${projectName}" created successfully 🎉`,
      "bold",
      "green"
    )
  );

  const name = projectName !== "./" ? projectName : "";
  console.log(`${colorText(" Done. Now run", "bold", "white")}

  ${colorText(name && `\cd ${projectName} && `, "bold", "green")}npm run dev
      `);
};
