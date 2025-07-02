import { ZoltraConfig } from "../types";

export const config: ZoltraConfig = {
  PORT: parseInt(process.env.PORT || "5000"),
  NODE_ENV: (process.env.NODE_ENV as ZoltraConfig["NODE_ENV"]) || "development",
  LOG_LEVEL: (process.env.LOG_LEVEL as ZoltraConfig["LOG_LEVEL"]) || "info",
  error: {
    showStack: true,
    displayErrObj: true,
    includeErrorMessage: false,
  },
};

export const zoltraConfig = (config: ZoltraConfig) => config;
