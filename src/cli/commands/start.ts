import { execSync } from "child_process";
import { findEntryPoint } from "../shared/index";

export const start = () => {
  try {
    const entryPoint = findEntryPoint();
    execSync(`node ${entryPoint}`, {
      stdio: "inherit",
      cwd: process.cwd(),
    });
  } catch (error) {
    process.exit(1);
  }
};
