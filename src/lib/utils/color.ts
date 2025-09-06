type Color =
  | "reset"
  | "red"
  | "yellow"
  | "cyan"
  | "gray"
  | "blue"
  | "green"
  | "bold"
  | "white";

const colors = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  blue: "\x1b[34m",
  magenta: "\x1b[35m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
  bold: "\x1b[1m",
  white: "\x1b[37m",
};

export const colorText = (text: string, ...colorKeys: Color[]) => {
  const appliedColors = colorKeys.map((key) => colors[key]).join("");
  return `${appliedColors}${text}${colors.reset}`;
};
