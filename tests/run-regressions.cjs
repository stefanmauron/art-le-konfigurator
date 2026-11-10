const fs = require("node:fs"),
  path = require("node:path"),
  { spawnSync } = require("node:child_process"),
  crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const results = [];
const cases = [
  ["lint", "../node_modules/eslint/bin/eslint.js", {}, ["src"]],
  ["build", "verify-build.mjs", {}],
  ["domain", "domain-parity.mjs", {}],
  [
    "flow",
    "run-unit-family.cjs",
    { OUTPUT_DIR: path.join(root, ".test-output/flow") },
    ["flow"],
  ],
  [
    "edges",
    "run-unit-family.cjs",
    { OUTPUT_DIR: path.join(root, ".test-output/edges") },
    ["edges"],
  ],
  [
    "contract",
    "run-unit-family.cjs",
    { OUTPUT_DIR: path.join(root, ".test-output/contract") },
    ["contract"],
  ],
  ["known-findings", "compare-known-findings.cjs", {}],
  [
    "reference-base",
    "regression-base.cjs",
    {
      UTG_TEST_APP:
        "tests/fixtures/reference/UTG-LE_Operating_Model_v3.16_RC2.html",
      UTG_EXPECT_VERSION: "3.16",
      UTG_EXPECT_STAGE: "RC2",
    },
  ],
  [
    "candidate-base",
    "regression-base.cjs",
    {
      UTG_TEST_APP: "dist/UTG-LE_Operating_Model_v3.16_RC4.html",
      UTG_EXPECT_VERSION: "3.16",
      UTG_EXPECT_STAGE: "RC4",
    },
  ],
];
for (const [name, file, env, args = []] of cases) {
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, file), ...args],
    { cwd: root, env: { ...process.env, ...env }, encoding: "utf8" },
  );
  fs.mkdirSync(path.join(root, ".test-output"), { recursive: true });
  fs.writeFileSync(
    path.join(root, ".test-output", name + ".log"),
    result.stdout + result.stderr,
  );
  results.push({ name, exitCode: result.status, error: result.error?.message });
  console.log(name + ": " + (result.status === 0 ? "PASS" : "FAIL"));
}
const bundle = fs.readFileSync(
  path.join(root, "dist/UTG-LE_Operating_Model_v3.16_RC4.html"),
);
fs.writeFileSync(
  path.join(root, ".test-output/unit-summary.json"),
  JSON.stringify(
    {
      bundleSha256: crypto.createHash("sha256").update(bundle).digest("hex"),
      results,
    },
    null,
    2,
  ) + "\n",
);
if (results.some((x) => x.exitCode !== 0)) process.exitCode = 1;
