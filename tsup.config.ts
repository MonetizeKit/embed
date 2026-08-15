import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["esm", "cjs"],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: true,
  },
  {
    // Self-initializing CDN bundle: app.monetizekit.app/v1/embed.js
    entry: { embed: "src/embed.ts" },
    format: ["iife"],
    globalName: "MonetizeKitEmbed",
    minify: true,
    sourcemap: true,
    clean: false,
    treeshake: true,
    banner: {
      js: "/*! @monetizekit/embed | (c) 2026 Coordinated App LLC, d/b/a MonetizeKit | MIT License */",
    },
  },
]);
