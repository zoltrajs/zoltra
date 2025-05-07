import { TestFunction } from "types";
import { TestRunner } from "./runner";

export * from "./run";
export * from "./utils";

export function test(runner: TestFunction<TestRunner>) {
  return runner;
}
