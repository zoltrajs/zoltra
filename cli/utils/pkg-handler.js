import { createPkgFile, getNameInput } from "./fileUtils.js";

export const changeAppName = (name, content) => {
  const jsonFile = JSON.parse(content);
  jsonFile.name = getNameInput(name);
  return JSON.stringify(jsonFile, null, 2);
};

export const handlePackage = async (appName, content) => {
  await createPkgFile(appName, changeAppName(appName, content));
};
