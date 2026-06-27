/**
 * Published-package install smoke: pack the real tarball, install it into a
 * clean project, and import the public entry to confirm it resolves and
 * exposes a real API for external consumers.
 */
import { execSync } from "node:child_process";
import { mkdtempSync, writeFileSync, readdirSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { fileURLToPath } from "node:url";
import path from "node:path";

const repo = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const work = mkdtempSync(path.join(tmpdir(), "mk-embed-smoke-"));

function run(cmd, cwd) {
  execSync(cmd, { cwd, stdio: "inherit" });
}

try {
  run("pnpm build", repo);
  run(`npm pack --pack-destination "${work}"`, repo);
  const tarball = readdirSync(work).find((f) => f.endsWith(".tgz"));
  if (!tarball) throw new Error("npm pack produced no tarball");

  writeFileSync(path.join(work, "package.json"), JSON.stringify({ name: "smoke", private: true, type: "module" }, null, 2));
  writeFileSync(
    path.join(work, "consumer.mjs"),
    `import { initializeEmbeds } from "@monetizekit/embed";\n` +
      `if (typeof initializeEmbeds !== "function") { console.error("initializeEmbeds is not a function"); process.exit(1); }\n` +
      `console.log("embed entry resolved: initializeEmbeds is a function");\n`,
  );

  run(`npm install --no-save "${path.join(work, tarball)}"`, work);
  run("node consumer.mjs", work);
  console.log("Install smoke passed: @monetizekit/embed imports + exposes API in a clean project.");
} finally {
  rmSync(work, { recursive: true, force: true });
}
