const path = require("node:path"),
  fs = require("node:fs");
const root = path.resolve(__dirname, "..");
process.env.UTG_TEST_APP ||= "dist/UTG-LE_Operating_Model_v3.16_RC4.html";
process.env.BASE_URL ||= "http://127.0.0.1:8773";
process.env.OUTPUT_DIR ||= path.join(root, ".test-output/roundtrip");
process.on("exit", () => {
  const file = path.join(process.env.OUTPUT_DIR, "manifest.json");
  if (fs.existsSync(file)) {
    const result = JSON.parse(fs.readFileSync(file));
    result.historicalDriverVersion = result.appVersion;
    result.targetFile = process.env.UTG_TEST_APP;
    result.appVersion = process.env.UTG_TEST_APP.includes("v3.16_")
      ? "3.16"
      : result.appVersion;
    fs.writeFileSync(file, JSON.stringify(result, null, 2) + "\n");
  }
});
require("./browser/roundtrip.cjs");
