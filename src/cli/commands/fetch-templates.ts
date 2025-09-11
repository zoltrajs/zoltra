import download from "download-git-repo";
import fs from "fs-extra";
import path from "path";
import { getPackageOption } from "../shared";
import ora from "ora";

interface Template {
  name: string;
  description: string;
}

function fetchTemplates() {
  const tag = getPackageOption().publishConfig.tag;
  const tmpDir = path.join(process.cwd(), "__tmp_example__");

  return new Promise((resolve, reject) => {
    const spinner = ora(`Fetching templates...`).start();

    download(`zoltrajs/templates#${tag}`, tmpDir, {}, (err) => {
      if (err) {
        spinner.fail(`Failed to fetch templates: ${err.message}`);
        return reject(err);
      }

      const templates_array = fs.readdirSync(tmpDir);
      const templates: Template[] = templates_array
        .filter((tm) => !tm.startsWith(".") && !tm.includes("."))
        .map((templateDir) => {
          const packageJsonPath = path.join(
            tmpDir,
            templateDir,
            "package.json"
          );
          const packageJson = fs.readJsonSync(packageJsonPath);
          return {
            name: packageJson.name,
            description: packageJson.description,
          };
        });

      spinner.succeed("Templates fetched successfully");
      fs.removeSync(tmpDir);

      resolve(templates);
    });
  });
}

export const getTemplates = async () => {
  const templates: any = await fetchTemplates();

  for (const temp of templates) {
    console.log(`
        ${temp.name.replace("-template", "")} ${"-".repeat(
      Math.max(0, 50 - temp.name.length)
    )}
        Description: ${temp.description}
        ${"-".repeat(60)}
            `);
  }
};
