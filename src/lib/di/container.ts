import { IContainer, ServiceRegistration, ServiceScope } from "../../types";
import { NotFoundError } from "../errors";

export class Container implements IContainer {
  private services: Map<string, ServiceRegistration> = new Map();
  private instances: Map<string, any> = new Map();
  private resolvingServices: Set<string> = new Set();
  private parent: Container | null = null;

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
    // Check if the service is registered in this container
    const registration = this.services.get(name);

    if (registration) {
      if (registration.scope === "singleton") {
        if (!registration.instance) {
          registration.instance = this._createInstance<T>(
            registration.service,
            name
          );
        }
        return registration.instance as T;
      } else if (registration.scope === "transient") {
        return this._createInstance<T>(registration.service, name);
      } else if (registration.scope === "request") {
        // Request scope will be handled by a request context
        // For now, treat it as transient
        return this._createInstance<T>(registration.service, name);
      } else {
        return this._createInstance<T>(registration.service, name);
      }
    }

    // If not found in this container, check the parent container
    if (this.parent) {
      return this.parent.resolve<T>(name);
    }

    // If not found in this container or any parent container, throw an error
    throw new NotFoundError(`Service '${name}' not found in container`, {});
  }

  private _createInstance<T = any>(
    service: T | (new (...args: any[]) => T) | (() => T),
    serviceName?: string
  ): T {
    if (typeof service === "function") {
      let instance: T;

      // Check if it's a class constructor with constructor injections
      if (typeof service === "function" && (service as any).__injections) {
        const injections = (service as any).__injections || [];
        const args = injections.map((dependencyName: string, index: number) => {
          // Check for circular dependencies
          if (serviceName && this.resolvingServices.has(dependencyName)) {
            console.warn(
              `Circular dependency detected: ${serviceName} -> ${dependencyName}`
            );
            // Return a proxy or placeholder for circular dependencies
            return {};
          }

          if (serviceName) this.resolvingServices.add(serviceName);
          const resolved = this.resolve(dependencyName);
          if (serviceName) this.resolvingServices.delete(serviceName);
          return resolved;
        });

        instance = new (service as new (...args: any[]) => T)(...args);
      } else {
        // Regular class or factory function
        instance = new (service as new (...args: any[]) => T)();
      }

      // Apply property injections if any
      this._applyPropertyInjections(instance, service);

      return instance;
    } else {
      // Direct instance
      return service as T;
    }
  }

  private _applyPropertyInjections<T>(instance: T, constructor: any): void {
    if (!constructor.prototype.__propertyInjections) return;

    const propertyInjections = constructor.prototype.__propertyInjections;
    if (propertyInjections instanceof Map) {
      propertyInjections.forEach(
        (serviceName: string, propertyKey: string | symbol) => {
          (instance as any)[propertyKey] = this.resolve(serviceName);
        }
      );
    }
  }

  has(name: string): boolean {
    return this.services.has(name) || (this.parent?.has(name) ?? false);
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
    child.parent = this;
    return child;
  }
}

/**
 * Service decorator - marks a class as a service with a name and scope
 */
export function Service(name: string, scope: ServiceScope = "singleton") {
  return function <T extends { new (...args: any[]): {} }>(target: T) {
    (target as any).__serviceName = name;
    (target as any).__serviceScope = scope;
    return target;
  };
}

/**
 * Singleton decorator - marks a class as a singleton service
 */
export function Singleton(name?: string) {
  return function <T extends { new (...args: any[]): {} }>(target: T) {
    const serviceName = name || target.name;
    (target as any).__serviceName = serviceName;
    (target as any).__serviceScope = "singleton";
    return target;
  };
}

/**
 * RequestScoped decorator - marks a class as a request-scoped service
 */
export function RequestScoped(name?: string) {
  return function <T extends { new (...args: any[]): {} }>(target: T) {
    const serviceName = name || target.name;
    (target as any).__serviceName = serviceName;
    (target as any).__serviceScope = "request";
    return target;
  };
}

/**
 * Inject decorator for constructor parameters and properties
 */
export function Inject(serviceName: string) {
  return function (
    target: any,
    propertyKey?: string | symbol,
    parameterIndex?: number
  ) {
    if (propertyKey !== undefined && parameterIndex === undefined) {
      // Property injection
      if (!target.__propertyInjections) {
        target.__propertyInjections = new Map();
      }
      target.__propertyInjections.set(propertyKey, serviceName);
    } else if (parameterIndex !== undefined) {
      // Constructor parameter injection
      if (!target.__injections) {
        target.__injections = [];
      }
      target.__injections[parameterIndex] = serviceName;
    }
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
