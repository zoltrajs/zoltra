import path from "path";

export const CACHE_DIR = path.join(process.cwd(), ".zoltra/cache");

export const checkEnv = () => {
  const DEPLOYMENT_ENV = process.env.DEPLOYMENT_ENV;
  const NODE_ENV = process.env.NODE_ENV;
  const IS_SERVERLESS =
    DEPLOYMENT_ENV === "VERCEL" || process.env.IS_SERVERLESS === "true";
  const IS_PROD = NODE_ENV === "production";
  const IS_DEV = NODE_ENV === "development";

  return { IS_SERVERLESS, NODE_ENV, IS_DEV, IS_PROD };
};
