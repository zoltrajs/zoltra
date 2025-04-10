import { colorText } from "zoltra";

export const logJsImp = (check, logger) => {
  if (check) {
    logger.info(
      colorText("Starter for JavaScript will be available soon.", "blue")
    );

    return true;
  }

  return false;
};
