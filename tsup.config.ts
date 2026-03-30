import { defineConfig } from "tsup";

const CJS_INTEROP = [
  "",
  "// CJS interop: allow require('authjs-etoro') to return the default export directly",
  'if (typeof module !== "undefined" && module.exports && typeof module.exports.default === "function") {',
  "  Object.assign(module.exports.default, module.exports);",
  "  module.exports = module.exports.default;",
  "}",
  "",
].join("\n");

export default defineConfig({
  entry: ["src/index.ts"],
  format: ["esm", "cjs"],
  dts: true,
  clean: true,
  sourcemap: false,
  splitting: true,
  treeshake: true,
  outDir: "dist",
  async onSuccess() {
    const { readFile, writeFile } = await import("node:fs/promises");
    const cjs = await readFile("dist/index.cjs", "utf8");
    await writeFile("dist/index.cjs", cjs + CJS_INTEROP);
  },
});
