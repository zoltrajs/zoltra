import { ZoltraConfig } from "zoltra/types";
import path, { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";

export class ConfigManager {
  // private static config: ZoltraConfig;
  private dir: string;
  public jsonConfig: string = "";

  constructor() {
    this.dir = this.loadDir();
  }

  public loadDir() {
    const cwd = process.cwd();
    return join(cwd, ".zoltra");
  }

  public createDir() {
    if (!existsSync(this.dir)) {
      mkdirSync(this.dir, { recursive: true });
    }
  }

  public configToJSON(config: ZoltraConfig) {
    const jsonConfig = JSON.stringify(config);
    writeFileSync(join(this.dir, "config.json"), jsonConfig, "utf-8");
    this.jsonConfig = jsonConfig;
  }

  public readConfig() {
    const config = readFileSync(path.join(this.dir, "config.json"));
    return JSON.parse(config);
  }
}
