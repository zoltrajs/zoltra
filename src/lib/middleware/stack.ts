import { IContext, Middleware } from "../../types";
import {
  IMiddlewareStack,
  MiddlewareEntry,
  MiddlewareObject,
} from "../../types/middleware";

/**
 * Middleware stack management
 */
export class MiddlewareStack implements IMiddlewareStack {
  private middlewares: MiddlewareEntry[] = [];

  /**
   * Add middleware to the stack
   */

  add(
    middleware: Middleware | MiddlewareObject,
    options: Record<string, any> = {}
  ): void {
    if (typeof middleware === "function") {
      this.middlewares.push({ handler: middleware, options });
    } else if (
      typeof middleware === "object" &&
      typeof middleware.handle === "function"
    ) {
      this.middlewares.push({
        handler: middleware.handle.bind(middleware),
        options,
      });
    } else {
      throw new Error(
        "Invalid middleware: must be a function or object with handle method"
      );
    }
  }

  /**
   * Execute all middleware in the stack
   */
  async execute(context: IContext): Promise<void> {
    let index = -1;

    const dispatch = async (i: number): Promise<void> => {
      if (i <= index) {
        throw new Error("next() called multiple times");
      }
      index = i;

      const middleware = this.middlewares[i];
      if (!middleware) return;

      await middleware.handler(context, () => dispatch(i + 1));
    };

    await dispatch(0);
  }

  /**
   * Remove middleware from the stack
   */
  remove(middleware: Middleware): void {
    this.middlewares = this.middlewares.filter((m) => m.handler !== middleware);
  }

  /**
   * Clear all middleware
   */
  clear(): void {
    this.middlewares = [];
  }

  /**
   * Get middleware count
   */
  get length(): number {
    return this.middlewares.length;
  }
}
