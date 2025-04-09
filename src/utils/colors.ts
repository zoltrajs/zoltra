type Color =
  | "reset"
  | "red"
  | "green"
  | "yellow"
  | "cyan"
  | "white"
  | "blue"
  | "bold";

const colors: Record<Color, string> = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  blue: "\x1b[34m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
  bold: "\x1b[1m",
};

export function colorText(text: string, ...colorKeys: Color[]): string {
  const appliedColors = colorKeys.map((key) => colors[key] || "").join("");
  return `${appliedColors}${text}${colors.reset}`;
}
