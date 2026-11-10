// Retarget existing browser behaviour tests without changing their assertions.
// Bundle path, approved release metadata and native failure-injection keys are adapted.
const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module");
const files = {
  flow: "flow.cjs",
  control: "flow-control.cjs",
  edges: "flow-edges.cjs",
};
const family = process.argv[2];
if (!files[family]) throw Error("Unknown browser family");
const target =
  process.env.UTG_TEST_APP || "dist/UTG-LE_Operating_Model_v3.16_RC4.html";
process.env.OUTPUT_DIR ||= path.resolve(
  __dirname,
  "../.test-output",
  family + "-browser",
);
const filename = path.resolve(__dirname, "./browser", files[family]);
let source = fs
  .readFileSync(filename, "utf8")
  .replaceAll("dist/UTG-LE_Operating_Model_v3.16_RC3.html", target)
  .replaceAll(
    "UTG-LE_Konfiguration_v3.16_RC3.json",
    JSON.parse(fs.readFileSync(path.resolve(__dirname, "../release.json")))
      .exportFilename,
  );
const test = new Module(filename, module);
test.filename = filename;
test.paths = Module._nodeModulePaths(path.dirname(filename));
test._compile(source, filename);
