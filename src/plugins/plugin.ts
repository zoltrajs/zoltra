import { AppInterface } from "../types";

export abstract class Plugin {
  name: string;
  version: string;

  constructor(name: string, version: string) {
    this.name = name;
    this.version = version;
  }

  /**
   *  This function runs once the plugin has been loaded
   * @param app - Zoltra app instance
   */
  abstract init(app: AppInterface): void;
}
