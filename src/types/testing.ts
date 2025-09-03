export interface TestCase {
  name: string;
  fn: () => void | Promise<void>;
}

export interface TestResults {
  passed: number;
  failed: number;
  total: number;
}
