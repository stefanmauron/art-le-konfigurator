import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
const cwd = fileURLToPath(new URL("../", import.meta.url));
const output = process.env.OUTPUT_DIR || path.join(cwd, ".test-output/merge");
fs.mkdirSync(output, { recursive: true });
for (const args of [
  ["merge-tool/build.mjs"],
  ["merge-tool/tests/browser.mjs"],
  [
    "--test",
    "--test-reporter=spec",
    "--test-reporter=junit",
    "--test-reporter-destination=stdout",
    "--test-reporter-destination=" + path.join(output, "unit-tests.xml"),
    "merge-tool/tests/merge.test.mjs",
    "merge-tool/tests/extended.test.mjs",
  ],
]) {
  const r = spawnSync(process.execPath, args, { cwd, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status || 1);
}
