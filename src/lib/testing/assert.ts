/**
 * Assertion utilities
 */
export class Assert {
  /**
   * Assert that a value is truthy
   */
  static ok(value: unknown, message = "Expected value to be truthy"): void {
    if (!value) {
      throw new Error(message);
    }
  }

  /**
   * Assert that two values are strictly equal
   */
  static equal<T>(
    actual: T,
    expected: T,
    message = `Expected ${String(expected)}, got ${String(actual)}`
  ): void {
    if (actual !== expected) {
      throw new Error(message);
    }
  }

  /**
   * Assert that two values are deeply equal (via JSON.stringify)
   */
  static deepEqual<T>(
    actual: T,
    expected: T,
    message = "Values are not deeply equal"
  ): void {
    const actualStr = JSON.stringify(actual);
    const expectedStr = JSON.stringify(expected);

    if (actualStr !== expectedStr) {
      throw new Error(`${message}. Expected ${expectedStr}, got ${actualStr}`);
    }
  }

  /**
   * Assert that a function throws an error
   */
  static throws(fn: () => unknown, expectedMessage = ""): void {
    try {
      fn();
      throw new Error("Expected function to throw an error");
    } catch (error: any) {
      if (expectedMessage && !error?.message?.includes(expectedMessage)) {
        throw new Error(
          `Expected error message to contain "${expectedMessage}", got "${error?.message}"`
        );
      }
    }
  }

  /**
   * Assert that an async function rejects with an error
   */
  static async rejects(
    fn: () => Promise<unknown>,
    expectedMessage = ""
  ): Promise<void> {
    try {
      await fn();
      throw new Error("Expected function to reject with an error");
    } catch (error: any) {
      if (expectedMessage && !error?.message?.includes(expectedMessage)) {
        throw new Error(
          `Expected rejection message to contain "${expectedMessage}", got "${error?.message}"`
        );
      }
    }
  }

  /**
   * Assert that a value is of a specific type (by typeof)
   */
  static typeOf(
    value: unknown,
    type:
      | "string"
      | "number"
      | "boolean"
      | "object"
      | "function"
      | "undefined"
      | "symbol"
      | "bigint"
  ): void {
    if (typeof value !== type) {
      throw new Error(`Expected type ${type}, got ${typeof value}`);
    }
  }
}
