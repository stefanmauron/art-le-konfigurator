// Shared v3.16 test paths. No dependency on removed application archives.
const fs = require("node:fs"),
  path = require("node:path");
const appRoot = path.resolve(__dirname, "../..");
const repoRoot = appRoot;
function appFile() {
  const selected = path.resolve(
    appRoot,
    process.env.UTG_TEST_APP || "dist/UTG-LE_Operating_Model_v3.16_RC4.html",
  );
  if (
    !selected.startsWith(appRoot + path.sep) ||
    !selected.endsWith(".html") ||
    !fs.existsSync(selected)
  )
    throw Error("Invalid UTG_TEST_APP target: " + selected);
  return selected;
}
process.chdir(repoRoot);
module.exports = { repoRoot, appRoot, appFile };
