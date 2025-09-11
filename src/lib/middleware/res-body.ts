import { Middleware } from "../../types";

export function validateBody(required: string[]): Middleware {
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

export function validateBodyDecorator(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = function (...args: any) {
    console.log(`Method ${propertyKey} called with arguments: ${args}`);
    return originalMethod.apply(this, args);
  };

  return descriptor;
}
