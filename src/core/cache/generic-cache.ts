export abstract class GenericCache<T> {
  abstract get(key: string): T | undefined;
  abstract set(key: string, value: T): void;
  abstract delete(key: string): void;
  abstract clear(): void;

  // Universal cache metrics
  public hits = 0;
  public misses = 0;

  protected constructor(public readonly cacheName: string) {}
}
