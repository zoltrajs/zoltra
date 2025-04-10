import { colorText, Logger } from "zoltra";
import path from "path";
import { existsSync } from "fs";
import { writeFile, mkdir } from "fs/promises";

export const folders = ["controllers", "routes", "plugins"];

const logger = new Logger("CLI/FileUtils");
const cwd = process.cwd();

export const getNameInput = (projectName) => {
  if (projectName === "./") {
    const currentDirName = path.basename(cwd);
    return currentDirName;
  } else {
    return projectName;
  }
};

export const createRootDir = async (projectName, logOp) => {
  try {
    const currentDirName = getNameInput(projectName);
    const rootDir = path.join(cwd, currentDirName);
    if (existsSync(rootDir)) {
      logger.warn(colorText(`⚠️  ${rootDir} Already exits`, "yellow"));
      return false;
    }

    await mkdir(rootDir, { recursive: true }, (err, path) => {
      if (err) {
        logger.error("❌ Directory creation failed", {
          stack: err.stack,
          name: "DirectoryCreationError",
          message: err.message,
        });
      }
    });

    return true;
  } catch (error) {
    logger.error("❌ Operation failed", {
      stack: error.stack,
      name: "DirectoryCreationError",
      message: error.message,
    });

    return false;
  }
};

export const createDirectory = async (_dir, folder) => {
  const dir = path.join(cwd, _dir, folder);
  try {
    if (!existsSync(dir)) {
      await mkdir(dir, { recursive: true }, (err) => {
        if (err) {
          logger.error("❌ Directory creation failed", {
            stack: err.stack,
            name: "DirectoryCreationError",
            message: err.message,
          });
        }
      });
    }
  } catch (error) {
    logger.error("❌ Operation failed", {
      stack: error.stack,
      name: "DirectoryCreationError",
      message: error.message,
    });
    return;
  }
};

export const createFile = async (_path, content) => {
  const dir = path.join(cwd, _path);
  try {
    await writeFile(dir, content, "utf-8", (err) => {
      if (err) {
        logger.error("❌ File creation failed", {
          stack: err.stack,
          name: "DirectoryCreationError",
          message: err.message,
        });
      }
    });
  } catch (error) {
    logger.error("❌ Operation failed", {
      stack: error.stack,
      name: "FileCreationError",
      message: error.message,
    });
    return;
  }
};

export const createFolders = async (projectName) => {
  try {
    for (const dir of folders) {
      await createDirectory(projectName, dir);
    }

    console.log(colorText("\nfolders:\n", "bold", "white"));

    for (const dir of folders) {
      console.log(colorText(`/${dir}`, "blue"));
    }
  } catch (error) {
    logger.error("❌ Failed to create folder", error);
    return;
  }
};

const handlePkg = (pkg, attr) => {
  const Parsed = JSON.parse(pkg);
  const pk = Object.keys(Parsed[attr]).map((dep) => dep.split(":")[0]);
  return pk;
};

export const createPkgFile = async (appName, content) => {
  const logDeps = (deps) => {
    for (const dep of deps) {
      console.log(colorText(`- ${dep}`, "blue"));
    }
  };
  try {
    await createFile(`${appName}/package.json`, content);
    const deps = handlePkg(content, "dependencies");
    const Devdeps = handlePkg(content, "devDependencies");
    console.log(colorText("\ndependencies:\n", "bold", "white"));
    logDeps(deps);
    console.log(colorText("\ndevDependencies:\n", "bold", "white"));
    logDeps(Devdeps);
  } catch (error) {
    logger.error("❌ Failed to write package.json", error);
    return;
  }
};

export const createFiles = async (projectName, isTs, starterFiles) => {
  const ext = isTs ? ".ts" : ".js";
  const { typescript, common, javascript } = starterFiles;

  const contents = {
    ".ts": { files: typescript },
    ".js": { files: javascript },
  };
  try {
    const files = [
      "README.md",
      ".gitignore",
      `zoltra.config${ext}`,
      "package.json",
      `server${ext}`,
      `controllers/hello${ext}`,
      `routes/hello${ext}`,
    ];

    await createFile(`${projectName}/routes/hello${ext}`, common.helloRoute);
    await createFile(
      `${projectName}/controllers/hello${ext}`,
      contents[ext].files.helloController
    );

    await createFile(`${projectName}/.gitignore`, common.gitignore);
    await createFile(`${projectName}/README.md`, common.readme);
    await createFile(`${projectName}/zoltra.config${ext}`, common.config);
    await createFile(`${projectName}/server${ext}`, common.server);

    if (isTs) {
      await createFile(`${projectName}/tsconfig.json`, typescript.tsconfig);
      files.push("tsconfig.json");
    }

    console.log(colorText("\nfiles:\n", "bold", "white"));

    files.forEach((file) => {
      console.log(colorText(file, "blue"));
    });
  } catch (error) {
    logger.error("❌ Failed to create file", {
      message: error.message,
      stack: error.stack,
      name: error.name,
    });
    return;
  }
};
