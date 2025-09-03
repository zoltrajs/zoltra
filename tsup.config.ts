import { defineConfig } from "tsup";

export default defineConfig({
  entry: ["src/index.ts", "src/cli/index.ts"], // main entry point(s)
  outDir: "dist", // output directory
  format: ["cjs", "esm"], // output both CommonJS and ESModule
  dts: true, // generate type declarations
  splitting: false, // no code splitting (simpler for libraries)
  sourcemap: false, // generate sourcemaps for debugging
  clean: true, // clean dist before build
  minify: false, // keep output readable (set to true for prod libs)
  target: "node18", // adjust based on Node version you support
  shims: true, // polyfills for process, etc. in ESM
  skipNodeModulesBundle: true, // don’t bundle dependencies (for frameworks/libs)
  //   minifySyntax: true,
});
