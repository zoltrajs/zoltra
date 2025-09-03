import { IContainer, ServiceRegistration, ServiceScope } from "../../types";

export class Container implements IContainer {
  private services: Map<string, ServiceRegistration> = new Map();
  private instances: Map<string, any> = new Map();

  register<T = any>(
    name: string,
    service: T | (new (...args: any[]) => T) | (() => T),
    scope: ServiceScope = "singleton"
  ): void {
    this.services.set(name, {
      service,
      scope,
      instance: null,
    });
  }

  resolve<T = any>(name: string): T {
    const registration = this.services.get(name);

    if (!registration) {
      throw new Error(`Service '${name}' not found in container`);
    }

    if (registration.scope === "singleton") {
      if (!registration.instance) {
        registration.instance = this._createInstance<T>(registration.service);
      }
      return registration.instance as T;
    } else {
      return this._createInstance<T>(registration.service);
    }
  }

  private _createInstance<T = any>(
    service: T | (new (...args: any[]) => T) | (() => T)
  ): T {
    if (typeof service === "function") {
      // Class or factory
      return new (service as new (...args: any[]) => T)();
    } else {
      // Direct instance
      return service as T;
    }
  }

  has(name: string): boolean {
    return this.services.has(name);
  }

  unregister(name: string): void {
    const registration = this.services.get(name);
    if (registration) {
      this.services.delete(name);
      if (registration.instance) {
        this.instances.delete(name);
      }
    }
  }

  getServiceNames(): string[] {
    return Array.from(this.services.keys());
  }

  clear(): void {
    this.services.clear();
    this.instances.clear();
  }

  createChild(): Container {
    const child = new Container();
    for (const [name, registration] of this.services) {
      child.register(name, registration.service, registration.scope);
    }
    return child;
  }
}

/**
 * Service decorator
 */
export function Service(name: string, scope: ServiceScope = "singleton") {
  return function <T extends { new (...args: any[]): {} }>(target: T) {
    (target as any).__serviceName = name;
    (target as any).__serviceScope = scope;
  };
}

/**
 * Inject decorator
 */
export function Inject(serviceName: string) {
  return function (
    target: any,
    propertyKey: string | symbol,
    parameterIndex: number
  ) {
    if (!target.__injections) {
      target.__injections = [];
    }
    target.__injections[parameterIndex] = serviceName;
  };
}

/**
 * Auto-register helper
 */
export function autoRegister(
  container: Container,
  services: Record<string, any>
): void {
  Object.entries(services).forEach(([key, service]) => {
    if (typeof service === "function" && (service as any).__serviceName) {
      container.register(
        (service as any).__serviceName,
        service,
        (service as any).__serviceScope
      );
    } else {
      container.register(key, service);
    }
  });
}
