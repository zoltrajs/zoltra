type Color = "reset" | "red" | "green" | "yellow" | "cyan" | "white";

const colors: Record<Color, string> = {
  reset: "\x1b[0m",
  red: "\x1b[31m",
  green: "\x1b[32m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  white: "\x1b[37m",
};

export function colorText(text: string, color: Color): string {
  return `${colors[color] || colors.white}${text}${colors.reset}`;
}
