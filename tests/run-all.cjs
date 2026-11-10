// Run every maintained test family against the release artifact. No personal browser profile.
const fs = require("node:fs");
const path = require("node:path");
const { spawn } = require("node:child_process");
const http = require("node:http");
const crypto = require("node:crypto");
const root = path.resolve(__dirname, "..");
const repo = root;
const release = JSON.parse(fs.readFileSync(path.join(root, "release.json")));
const out = path.join(root, ".test-output/all-rc4");
fs.mkdirSync(out, { recursive: true });
const defaultSuites = [
  "verify",
  "test",
  "test:activities",
  "test:flow-basic",
  "test:flow",
  "test:edges",
  "test:assessments",
  "test:browser",
  "test:compare-versions",
  "test:performance",
  "test:merge",
  "test:roundtrip",
  "test:release",
];
const suites = process.argv.length > 2 ? process.argv.slice(2) : defaultSuites;
if (suites.some((s) => !defaultSuites.includes(s)))
  throw Error("Unknown test suite");
const results = [];
const artifact = path.join(
  root,
  `dist/UTG-LE_Operating_Model_v${release.version}_${release.stage}.html`,
);
const report = {
  release,
  artifact: path.relative(root, artifact),
  artifactSha256: crypto
    .createHash("sha256")
    .update(fs.readFileSync(artifact))
    .digest("hex"),
  started: new Date().toISOString(),
  suites: results,
};
function save() {
  fs.writeFileSync(
    path.join(out, "summary.json"),
    JSON.stringify(report, null, 2) + "\n",
  );
}
function available() {
  return new Promise((resolve) => {
    http
      .get("http://127.0.0.1:8773/", (r) => {
        r.resume();
        resolve(r.statusCode === 200);
      })
      .on("error", () => resolve(false));
  });
}
async function run(script) {
  const name = script.replaceAll(":", "-");
  const logfile = path.join(out, name + ".log");
  const fd = fs.openSync(logfile, "w");
  const started = Date.now();
  const output = path.join(out, name);
  // Every child gets its own output directory; no family overwrites another family's evidence.
  const child = spawn("npm", ["run", script], {
    cwd: root,
    env: {
      ...process.env,
      UTG_TEST_APP: `dist/UTG-LE_Operating_Model_v${release.version}_${release.stage}.html`,
      OUTPUT_DIR: output,
    },
    stdio: ["ignore", fd, fd],
  });
  const code = await new Promise((resolve, reject) => {
    child.on("error", reject);
    child.on("close", resolve);
  });
  fs.closeSync(fd);
  results.push({
    script,
    exitCode: code,
    durationMs: Date.now() - started,
    log: path.relative(root, logfile),
    output: path.relative(root, output),
  });
  save();
  console.log(
    `${script}: ${code === 0 ? "PASS" : "FAIL"} (${Math.round((Date.now() - started) / 1000)}s)`,
  );
}
(async () => {
  let server;
  try {
    if (!(await available())) {
      server = spawn(
        "python3",
        ["-m", "http.server", "8773", "--bind", "127.0.0.1"],
        { cwd: repo, stdio: "ignore" },
      );
      for (let attempt = 0; attempt < 50 && !(await available()); attempt++)
        await new Promise((r) => setTimeout(r, 100));
      if (!(await available())) throw Error("Local test server unavailable");
    }
    for (const suite of suites) await run(suite);
    report.finished = new Date().toISOString();
    report.failed = results.filter((r) => r.exitCode !== 0).length;
    save();
    process.exitCode = report.failed ? 1 : 0;
  } finally {
    server?.kill();
  }
})().catch((e) => {
  report.failure = e.message;
  save();
  console.error(e);
  process.exitCode = 1;
});
