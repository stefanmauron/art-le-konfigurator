// Historical behavioural assertions use the current generated modules. Lexical
// normalization is shared with the base suite; no production logic is substituted.
const fs = require("node:fs"),
  path = require("node:path"),
  Module = require("node:module"),
  { view } = require("./legacy-view.cjs");
const files = {
  flow: "flow.cjs",
  edges: "edges.cjs",
  contract: "rule-contract.cjs",
  method: "known-findings.cjs",
};
const family = process.argv[2];
if (!files[family]) throw Error("Unknown unit family");
const root = path.resolve(__dirname, ".."),
  target =
    process.env.UTG_TEST_APP || "dist/UTG-LE_Operating_Model_v3.16_RC3.html";
process.env.OUTPUT_DIR ||= path.join(root, ".test-output", family);
const filename = path.join(root, "tests/unit", files[family]);
const facade = new Proxy(fs, {
  get(object, key) {
    if (key !== "readFileSync") return object[key];
    return (file, ...args) => {
      let actual = file;
      if (String(file).endsWith(".html")) {
        actual = String(file).endsWith("UTG-LE_Operating_Model_v3.16_RC3.html")
          ? path.join(root, target)
          : fs.existsSync(file)
            ? file
            : file;
      }
      const result = fs.readFileSync(actual, ...args);
      return typeof result === "string" && String(actual).endsWith(".html")
        ? view(result)
        : result;
    };
  },
});
const test = new Module(filename, module);
test.filename = filename;
test.paths = Module._nodeModulePaths(path.dirname(filename));
const native = test.require.bind(test);
test.require = (name) =>
  name === "node:fs" || name === "fs" ? facade : native(name);
test._compile(
  fs
    .readFileSync(filename, "utf8")
    .replace(".update(html)", ".update(fs.readFileSync(file))"),
  filename,
);
