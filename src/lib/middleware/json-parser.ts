import { IContext, NextFn } from "../../types";

export const jsonParser = async (context: IContext, next: NextFn) => {
  if (context.headers["content-type"]?.includes("application/json")) {
    try {
      context._parsedBody = await context.body();
    } catch {
      context.status(400).json({ error: "Invalid JSON" });
      return;
    }
  }
  await next();
};
