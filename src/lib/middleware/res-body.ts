import { RequestHandler } from "../../types";

export function validateBody(required: string[]): RequestHandler {
  return async (ctx, next) => {
    const body = await ctx.body();
    const missing: string[] = [];

    for (const field of required) {
      if (!(field in body)) {
        missing.push(field);
      }
    }

    if (missing.length > 0) {
      return ctx.status(400).json({
        error: "Bad Request",
        message: `Missing required fields: ${missing.join(", ")}`,
      });
    }

    // ✅ attach parsed body so handler doesn’t need to re-parse
    (ctx as any).validatedBody = body;

    await next();
  };
}
