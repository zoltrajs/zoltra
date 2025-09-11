import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli/index.ts"],
  outDir: "dist",
  format: ["cjs", "esm"],
  dts: true,
  treeshake: true,
  splitting: false,
  sourcemap: false,
  clean: true,
  minify: false,
  target: "node18",
  shims: false,
  skipNodeModulesBundle: true,
});
