import { ZoltraResponse } from "types";

export function extractJsonFromResponse(response: ZoltraResponse) {
  const data = response.outputData[0].data;

  let result: string = "";
  let isString = false;

  const jsonStartIndex = data.indexOf("{");

  const stringStartIndex = data.indexOf('"');

  if (jsonStartIndex === -1 && stringStartIndex !== -1) {
    const stringResponse = data.slice(stringStartIndex).trim();
    result = stringResponse;
    isString = true;
    return stringResponse;
  }

  const jsonString = data.slice(jsonStartIndex).trim();

  try {
    if (isString) {
      return result;
    }

    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error("Failed to parse JSON: " + (error as Error).message);
  }
}
