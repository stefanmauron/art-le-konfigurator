// Run the same browser contract against either artifact; only release filenames differ.
const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module");
const [family, version] = process.argv.slice(2),
  names = {
    flow: "flow.cjs",
    control: "flow-control.cjs",
    edges: "flow-edges.cjs",
  };
if (!names[family] || !["RC2", "RC3"].includes(version))
  throw Error("Expected family and RC2/RC3");
const root = path.resolve(__dirname, ".."),
  file = path.join(__dirname, "browser", names[family]),
  reference = "tests/fixtures/reference/UTG-LE_Operating_Model_v3.16_RC2.html",
  candidate = "dist/UTG-LE_Operating_Model_v3.16_RC3.html";
process.env.OUTPUT_DIR ||= path.join(
  "/tmp/utg-rc2-rc3-contracts",
  version,
  family,
);
process.env.BASE_URL ||= "http://127.0.0.1:8773";
let source = fs
  .readFileSync(file, "utf8")
  .replaceAll(candidate, version === "RC2" ? reference : candidate);
if (version === "RC2")
  source = source.replaceAll(
    "UTG-LE_Konfiguration_v3.16_RC3.json",
    "UTG-LE_Konfiguration_v3.16_RC2.json",
  );
const test = new Module(file, module);
test.filename = file;
test.paths = Module._nodeModulePaths(path.dirname(file));
test._compile(source, file);
