import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { colorText, Logger } from "zoltra";
import ora from "ora";
import { getPackageOpts } from "../common.js";
import { updateZdeps } from "../utils/z-deps.js";

const logger = new Logger("UpdateCommand");

export const updateBatch = () => {
  const projectDir = process.cwd();
  const spinner = ora();

  const { publishConfig } = getPackageOpts();

  try {
    const packageJsonPath = path.join(projectDir, "package.json");

    // Ensure package.json exists
    if (!fs.existsSync(packageJsonPath)) {
      throw new Error(`package.json not found in ${projectDir}`);
    }

    // Read package.json
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));

    // Get all dependencies and devDependencies
    const deps = Object.keys(packageJson.dependencies || {});
    const devDeps = Object.keys(packageJson.devDependencies || {});

    // Combine all dependencies
    const allDeps = [...deps, ...devDeps];
    // Install the latest version for each dependency
    allDeps.forEach((dep) => {
      spinner.start(colorText(`Updating ${dep} to latest...`, "blue"));

      try {
        execSync(`npm install ${dep}@latest`, {
          stdio: "ignore",
          cwd: projectDir,
        });
        spinner.succeed(colorText(`${dep} updated to latest.`, "green"));
      } catch (error) {
        spinner.fail(
          colorText(`Failed to update ${dep}: ${error.message}`, "red")
        );
      }
    });

    if (publishConfig.tag === "alpha") {
      console.log(colorText("\nUpdating zoltra to alpha\n", "bold", "white"));

      updateZdeps(publishConfig.tag, logger);
    }
  } catch (error) {
    logger.error("Failed to update dependencies:", error);
  }
};
