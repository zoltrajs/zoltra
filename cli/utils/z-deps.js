import { execSync } from "child_process";
import { colorText } from "zoltra";
import ora from "ora";

export const updateZdeps = (tag, logger) => {
  const projectDir = process.cwd();
  const spinner = ora();

  try {
    const dep = "zoltra";

    spinner.start(colorText(`Updating ${dep} to ${tag}...`, "blue"));

    try {
      execSync(`npm install zoltra@alpha`, {
        stdio: "ignore",
        cwd: projectDir,
      });
      spinner.succeed(colorText(`${dep} updated to ${tag}.`, "green"));
    } catch (error) {
      spinner.fail(
        colorText(`Failed to update ${dep}: ${error.message}`, "red")
      );
    }
  } catch (error) {
    logger.error("Failed to update dependencie:", error);
  }
};
