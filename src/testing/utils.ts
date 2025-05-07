import { ZoltraResponse } from "types";
import { TestRunner } from "./runner";

export function extractJsonFromHttpResponse(response: ZoltraResponse) {
  const data = response.outputData[0].data;

  const jsonStartIndex = data.indexOf("{");

  if (jsonStartIndex === -1) {
    throw new Error("No JSON object found in the data.");
  }

  const jsonString = data.slice(jsonStartIndex).trim();

  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error("Failed to parse JSON: " + (error as Error).message);
  }
}

export function defineTest(
  fn: (runner: TestRunner) => Promise<void>
): (runner: TestRunner) => Promise<void> {
  return fn;
}
