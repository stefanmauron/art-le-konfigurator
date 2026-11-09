import fs from "node:fs/promises";
import path from "node:path";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { initialize } from "../src/application/bootstrap.js";
const root = fileURLToPath(new URL("../", import.meta.url));
const digest = (text) => crypto.createHash("sha256").update(text).digest("hex");
const read = (file) => fs.readFile(path.join(root, file));
let passed = 0;
function check(fn) {
  fn();
  passed++;
}
const reference = JSON.parse(
  await read("tests/fixtures/reference/manifest.json"),
);
const referenceBytes = await read(
  "tests/fixtures/reference/UTG-LE_Operating_Model_v3.16_RC2.html",
);
check(() => assert.equal(digest(referenceBytes), reference.sha256));
const filename = "dist/UTG-LE_Operating_Model_v3.16_RC3.html",
  before = await read(filename);
execFileSync(process.execPath, [path.join(root, "scripts/build.mjs")], {
  stdio: "pipe",
});
const after = await read(filename);
check(() => assert.equal(digest(after), digest(before)));
check(() =>
  assert(
    !/<script\b[^>]*\bsrc=|<link\b[^>]*rel=["']stylesheet/.test(
      after.toString(),
    ),
  ),
);
check(() => assert(!after.toString().includes("<!-- bundle:")));
for (const filename of await fs.readdir(path.join(root, "src/domain"))) {
  const source = (await read("src/domain/" + filename)).toString();
  check(() =>
    assert(
      !/\b(document|localStorage|sessionStorage)\b/.test(source),
      filename + " must be browser-independent",
    ),
  );
}
const makeStorage = () => {
  const data = new Map();
  return {
    data,
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  };
};
const storage = makeStorage(),
  session = makeStorage(),
  listeners = new Map();
const browser = {
  localStorage: storage,
  sessionStorage: session,
  addEventListener(type, fn) {
    const list = listeners.get(type) || [];
    list.push(fn);
    listeners.set(type, list);
  },
  StorageEvent: class {
    constructor(type, values) {
      Object.assign(this, values);
      this.type = type;
    }
  },
};
const app = initialize(browser, "test:");
app.localStorage.setItem("gever-art-v3-config", "candidate");
check(() =>
  assert.equal(storage.getItem("test:gever-art-v3-config"), "candidate"),
);
check(() => assert.equal(storage.getItem("gever-art-v3-config"), null));
app.sessionStorage.setItem("utg-active-register", "2");
check(() => assert.equal(session.getItem("test:utg-active-register"), "2"));
check(() => assert.equal(session.getItem("utg-active-register"), null));
let received = [];
app.addEventListener("storage", (event) => received.push(event.key));
for (const callback of listeners.get("storage")) {
  callback({ key: "gever-art-v3-config" });
  callback({ key: "test:gever-art-v3-config" });
  callback({ key: null });
}
check(() => assert.deepEqual(received, ["gever-art-v3-config", null]));
app.localStorage.removeItem("gever-art-v3-config");
check(() => assert.equal(storage.getItem("test:gever-art-v3-config"), null));
browser.UTGVersion = "3.16";
check(() => assert.equal(app.UTGVersion, "3.16"));
const inaccessible = {
  addEventListener() {},
  get localStorage() {
    throw Error("blocked");
  },
};
const restricted = initialize(inaccessible, "restricted:");
check(() =>
  assert.throws(() => restricted.localStorage.getItem("x"), /blocked/),
);
const result = {
  passed,
  failed: 0,
  referenceSha256: reference.sha256,
  bundleSha256: digest(after),
  reproducible: true,
};
await fs.mkdir(path.join(root, ".test-output"), { recursive: true });
await fs.writeFile(
  path.join(root, ".test-output/build-summary.json"),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result));
