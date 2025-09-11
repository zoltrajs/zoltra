import { Container } from "./container";
import { IContainer, IContext } from "../../types/core";

/**
 * RequestContext - Manages request-scoped services
 *
 * This class creates a child container for each request and manages
 * the lifecycle of request-scoped services.
 */
export class RequestContext {
  private static requestContainers = new WeakMap<IContext, IContainer>();

  /**
   * Get or create a container for the current request
   */
  static getContainer(ctx: IContext): Container {
    if (!this.requestContainers.has(ctx)) {
      // Create a child container for this request
      const childContainer = ctx.app.container.createChild();
      this.requestContainers.set(ctx, childContainer);
    }

    return this.requestContainers.get(ctx)! as Container;
  }

  /**
   * Resolve a service from the request container
   */
  static resolve<T = any>(ctx: IContext, serviceName: string): T {
    const container = this.getContainer(ctx);
    return container.resolve<T>(serviceName);
  }

  /**
   * Register a service in the request container
   */
  static register<T = any>(ctx: IContext, name: string, service: T): void {
    const container = this.getContainer(ctx);
    container.register(name, service, "request");
  }

  /**
   * Clear the request container when the request is complete
   */
  static clear(ctx: IContext): void {
    if (this.requestContainers.has(ctx)) {
      this.requestContainers.delete(ctx);
    }
  }
}
