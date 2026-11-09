const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { spawnSync } = require("node:child_process");
const root = path.resolve(__dirname, ".."),
  out = path.join(root, ".test-output/method-parity");
const runs = {
  reference: "tests/fixtures/reference/UTG-LE_Operating_Model_v3.16_RC2.html",
  candidate: "dist/UTG-LE_Operating_Model_v3.16_RC3.html",
};
const checks = {};
for (const [name, target] of Object.entries(runs)) {
  const dir = path.join(out, name);
  fs.mkdirSync(dir, { recursive: true });
  const result = spawnSync(
    process.execPath,
    [path.join(__dirname, "run-unit-family.cjs"), "method"],
    {
      env: { ...process.env, UTG_TEST_APP: target, OUTPUT_DIR: dir },
      encoding: "utf8",
    },
  );
  fs.writeFileSync(path.join(dir, "run.log"), result.stdout + result.stderr);
  assert.equal(result.status, 1, "Known failing checks must remain red");
  checks[name] = JSON.parse(fs.readFileSync(path.join(dir, "checks.json")));
}
assert.deepEqual(checks.candidate, checks.reference);
const summary = {
  cases: checks.reference.length,
  referenceFailures: checks.reference.filter((x) => !x.ok).length,
  candidateFailures: checks.candidate.filter((x) => !x.ok).length,
  identical: true,
  productFindingsRemainOpen: true,
};
fs.writeFileSync(
  path.join(out, "summary.json"),
  JSON.stringify(summary, null, 2) + "\n",
);
console.log(JSON.stringify(summary));
