import { execSync } from "child_process";
import path from "path";
import { colorText, Logger } from "zoltra";

/**
 * Installs dependencies and runs the update-deps CLI command to update them
 * @param {string} appName - The name or path of the app
 */

const logger = new Logger("InstallCommand");

export const installPkg = async (appName) => {
  console.log(
    colorText(
      "\nInstalling dependencies using npm install....\n",
      "bold",
      "white"
    )
  );

  const dir = path.resolve(appName);
  // const dir = appName;

  try {
    const installCommand =
      appName !== "/" ? `cd ${dir} && npm install` : "npm install";

    execSync(installCommand, { stdio: "inherit" });
    console.log(colorText("Dependencies installed successfully.", "green"));
    console.clear();
  } catch (error) {
    logger.error(`Error during npm install:`, {
      name: "InstalltionError",
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }

  console.log(colorText("\nUpdating dependencies....\n", "bold", "white"));

  try {
    const updateCommand =
      appName !== "/"
        ? `cd ${dir} && npx zoltra update --deps`
        : "npx zoltra update --deps";

    execSync(updateCommand, { stdio: "inherit" });
  } catch (error) {
    logger.error(`Error during update dependencies`, {
      name: "UpdateError",
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
};
