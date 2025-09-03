import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { IEnvironmentManager } from "../../types/utils";

/**
 * Environment variable manager
 */
export class EnvironmentManager implements IEnvironmentManager {
  private env: Record<string, string> = {};
  private loaded = false;

  async load(dir: string = process.cwd()): Promise<void> {
    if (this.loaded) return;

    this._loadEnvFile(join(dir, ".env"));

    const nodeEnv = process.env.NODE_ENV || "development";
    this._loadEnvFile(join(dir, `.env.${nodeEnv}`));

    this.env = { ...(process.env as Record<string, string>), ...this.env };
    this.loaded = true;
  }

  private _loadEnvFile(filePath: string): void {
    if (!existsSync(filePath)) return;

    try {
      const content = readFileSync(filePath, "utf8");
      const lines = content.split("\n");

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith("#")) continue;

        const [key, ...valueParts] = trimmed.split("=");
        if (key && valueParts.length > 0) {
          const value = valueParts.join("=").trim();
          const cleanValue = value.replace(/^["']|["']$/g, "");

          this.env[key.trim()] = cleanValue;
          process.env[key.trim()] = cleanValue;
        }
      }
    } catch (error: any) {
      console.warn(`Warning: Could not load ${filePath}:`, error.message);
    }
  }

  get<T = any>(key: string, defaultValue?: T): T | undefined {
    return (this.env[key] as T) ?? defaultValue;
  }

  getInt(key: string, defaultValue = 0): number {
    const value = this.get<string>(key);
    return value ? parseInt(value, 10) : defaultValue;
  }

  getFloat(key: string, defaultValue = 0.0): number {
    const value = this.get<string>(key);
    return value ? parseFloat(value) : defaultValue;
  }

  getBool(key: string, defaultValue = false): boolean {
    const value = this.get<string>(key);
    if (!value) return defaultValue;

    return ["true", "1", "yes", "on"].includes(value.toLowerCase());
  }

  getArray(
    key: string,
    separator = ",",
    defaultValue: string[] = []
  ): string[] {
    const value = this.get<string>(key);
    return value
      ? value.split(separator).map((item) => item.trim())
      : defaultValue;
  }

  has(key: string): boolean {
    return key in this.env;
  }

  set(key: string, value: any): void {
    this.env[key] = String(value);
    process.env[key] = String(value);
  }

  all(): Record<string, string> {
    return { ...this.env };
  }

  validate(required: string[]): void {
    const missing = required.filter((key) => !this.has(key));
    if (missing.length > 0) {
      throw new Error(
        `Missing required environment variables: ${missing.join(", ")}`
      );
    }
  }

  isProduction(): boolean {
    return this.get("NODE_ENV") === "production";
  }

  isDevelopment(): boolean {
    return this.get("NODE_ENV", "development") === "development";
  }

  isTest(): boolean {
    return this.get("NODE_ENV") === "test";
  }
}
