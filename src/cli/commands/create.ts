import download from "download-git-repo";
import fs from "fs-extra";
import path from "path";
import { exec } from "child_process";
import ora from "ora";
import { getPackageOption } from "../shared";
import { readdirSync } from "fs";

function downloadExample(template: string, projectName: string) {
  const tag = getPackageOption().publishConfig.tag;
  const tmpDir = path.join(process.cwd(), "__tmp_example__");
  const projectRoot = path.resolve(process.cwd(), projectName);

  console.log("\nroot:",readdirSync(projectRoot))
  console.log("\nroot-ln:",readdirSync(projectRoot).length)

  if (fs.existsSync(projectRoot) && projectName != "./") {
    throw new Error(`Project "${projectName}" already exists.`);
  } else if (projectName === "./" && readdirSync(projectRoot).length > 0) {
    throw new Error(
      `Cannot create new project in the current root ${projectRoot}.`
    );
  }

  return new Promise((resolve, reject) => {
    const spinner = ora(`Downloading template "${template}"...`).start();

    download(`zoltrajs/templates#${tag}`, tmpDir, {}, (err) => {
      if (err) {
        spinner.fail(`Failed to download repo: ${err.message}`);
        return reject(err);
      }

      const examplePath = path.join(tmpDir, template);
      if (!fs.existsSync(examplePath)) {
        spinner.fail(`Template "${template}" not found.`);
        return reject(new Error(`Template "${template}" not found.`));
      }

      fs.copySync(examplePath, projectRoot);
      fs.removeSync(tmpDir);

      const pkgPath = path.join(projectRoot, "package.json");
      if (fs.existsSync(pkgPath)) {
        const pkg = fs.readJsonSync(pkgPath);
        pkg.name = projectName;
        fs.writeJsonSync(pkgPath, pkg, { spaces: 2 });
      }

      spinner.succeed(`Template "${template}" downloaded successfully!`);
      resolve(projectRoot);
    });
  });
}

async function installDependencies(projectRoot: string) {
  return new Promise((resolve, reject) => {
    const spinner = ora("Installing dependencies...\n").start();

    const child = exec("npm install", {
      cwd: projectRoot,
      maxBuffer: 1024 * 1024 * 10,
      env: { ...process.env },
    });

    // Pipe output but keep spinner alive
    child?.stdout?.on("data", (data) => {
      const msg = data.toString();
      if (msg.includes("added")) spinner.text = `📦 ${msg.trim()}`;
      if (msg.includes("audited")) spinner.text = `🔍 ${msg.trim()}`;
    });

    child.stderr?.on("data", (data) => {
      spinner.text = `⚠️ ${data.toString().trim()}`;
    });

    child.on("error", (err) => {
      reject(err);
    });

    child.on("close", (code) => {
      if (code === 0) {
        spinner.succeed("Dependencies installed!\n");
        resolve(projectRoot);
      } else {
        spinner.fail("Dependency installation failed.\n");
        reject(new Error("npm install failed"));
      }
    });

    process.on("SIGINT", () => {
      child.kill("SIGINT");
      process.exit();
    });
  });
}

export const createApp = async (
  name: string,
  example: string,
  skipGit: boolean
) => {
  try {
    const projectRoot = await downloadExample(example, name);
    await installDependencies(projectRoot as string);

    if (projectRoot == "./") {
      console.log(`\n🎉 Done! start hacking!\n`);
    } else console.log(`\n🎉 Done! cd ${name} and start hacking!\n`);

    if (skipGit) return;

    exec("git init", { cwd: projectRoot as string }, (err: any) => {
      if (err) {
        console.error(
          "❌ Failed to initialize Git repository:",
          err.message,
          "\n"
        );
      } else {
        console.log("✅ Git repository initialized successfully!");
      }
    });
  } catch (err: any) {
    console.error("❌ Failed:", err.message, "\n");
  }
};
