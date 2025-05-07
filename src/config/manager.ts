import { ZoltraConfig } from "zoltra/types";
import path, { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "fs";
import { Logger } from "../utils";

export class ConfigManager {
  private dir: string;
  public jsonConfig: string = "";
  private logger = new Logger("ConfigManager");

  constructor() {
    this.dir = this.loadDir();
  }

  public loadDir() {
    const cwd = process.cwd();
    return join(cwd, ".zoltra");
  }

  public loadLoggerDir() {
    return join(this.dir, "logger");
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
    const config = readFileSync(path.join(this.dir, "config.json"), "utf-8");
    return JSON.parse(config);
  }

  public createCachePath() {
    const dir = join(this.dir, "cache");
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
  }

  public createLoggerDir() {
    const dir = join(this.dir, "logger");
    if (!existsSync(join(dir))) {
      mkdirSync(dir, { recursive: true });
    }
  }

  public createFile(fileName: string, content: string, ...dir: string[]) {
    const joinedPath = join(...dir, fileName);

    try {
      writeFileSync(joinedPath, content, "utf-8");
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to write file`, err);
    }
  }
}
