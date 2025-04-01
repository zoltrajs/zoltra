import { ZoltraConfig } from "zoltra/types";

export const config: ZoltraConfig = {
  PORT: parseInt(process.env.PORT || "5000"),
  NODE_ENV: (process.env.NODE_ENV as ZoltraConfig["NODE_ENV"]) || "development",
  DATABASE_URL: process.env.DATABASE_URL,
  LOG_LEVEL: (process.env.LOG_LEVEL as ZoltraConfig["LOG_LEVEL"]) || "info",
  LOG_FILE: process.env.LOG_FILE,
};

export const defineConfig = (config: ZoltraConfig) => {
  return config;
};
