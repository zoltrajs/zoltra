import { Config } from "types/core";

export const config: Config = {
  PORT: parseInt(process.env.PORT || "5000"),
  NODE_ENV: (process.env.NODE_ENV as Config["NODE_ENV"]) || "development",
  DATABASE_URL: process.env.DATABASE_URL,
  LOG_LEVEL: (process.env.LOG_LEVEL as Config["LOG_LEVEL"]) || "info",
  LOG_FILE: process.env.LOG_FILE,
};

export const defineConfig = (config: Config) => {
  return config;
};
