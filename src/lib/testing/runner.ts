import { TestCase, TestResults } from "../../types/testing";

export class TestRunner {
  private tests: TestCase[];
  private results: TestResults;

  constructor() {
    this.tests = [];
    this.results = {
      passed: 0,
      failed: 0,
      total: 0,
    };
  }

  /**
   * Add a test case
   */
  test(name: string, fn: () => void | Promise<void>): void {
    this.tests.push({ name, fn });
  }

  /**
   * Run all tests
   */
  async run(): Promise<TestResults> {
    console.log("🧪 Running tests...\n");

    for (const test of this.tests) {
      this.results.total++;
      try {
        await test.fn();
        console.log(`✅ ${test.name}`);
        this.results.passed++;
      } catch (error: any) {
        console.log(`❌ ${test.name}: ${error?.message ?? "Unknown error"}`);
        this.results.failed++;
      }
    }

    console.log(
      `\n📊 Results: ${this.results.passed}/${this.results.total} passed`
    );
    return this.results;
  }

  /**
   * Create a test group/describe block
   */
  describe(name: string, fn: () => void): void {
    console.log(`\n📁 ${name}`);
    fn();
  }
}
