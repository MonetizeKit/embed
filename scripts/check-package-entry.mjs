/**
 * Package-entry guard: assert the built module exposes the real embed API
 * (initializeEmbeds is a function) and that the CDN IIFE bundle was produced.
 * Run after `pnpm build`.
 */
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const dist = path.join(dir, "..", "dist");

const problems = [];

const mod = await import(path.join(dist, "index.js"));
if (typeof mod.initializeEmbeds !== "function") {
  problems.push(`initializeEmbeds: expected function, got ${typeof mod.initializeEmbeds}`);
}

if (!existsSync(path.join(dist, "embed.global.js"))) {
  problems.push("dist/embed.global.js (CDN IIFE bundle) is missing");
}

if (problems.length > 0) {
  console.error("Package entry guard failed:\n - " + problems.join("\n - "));
  process.exit(1);
}
console.log("Package entry guard passed: embed API + CDN bundle present.");
