import fs from "node:fs";
import vm from "node:vm";
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { initialize as flow } from "../src/domain/flow.js";
import { initialize as standards } from "../src/domain/flow-standard.js";
import { initialize as criteria } from "../src/domain/flow-criteria.js";
import { initialize as design } from "../src/domain/design-criteria.js";
import { initialize as defaults } from "../src/defaults/canonical-defaults.js";
import { createAgreementService } from "../src/domain/agreements.js";
import { createInterfaceReview } from "../src/domain/interface-review.js";

const html = fs.readFileSync(
  new URL(
    "./fixtures/reference/UTG-LE_Operating_Model_v3.16_RC2.html",
    import.meta.url,
  ),
  "utf8",
);
const scripts = new Map(
  [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].map((m) => [
    m[1].match(/id="([^"]+)"/)?.[1],
    m[2],
  ]),
);
const data = new Map();
const reference = {
  window: { dispatchEvent() {}, addEventListener() {} },
  document: { querySelector: () => null },
  structuredClone,
  URL,
  console,
  CustomEvent,
  Event,
  localStorage: {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => data.set(k, v),
    removeItem: (k) => data.delete(k),
  },
};
vm.createContext(reference);
for (const id of [
  "utg-flow-definition",
  "utg-flow-standard-3152",
  "utg-storage-api",
  "utg-design-criteria-data",
  "utg-canonical-defaults",
  "utg-flow-criteria-data",
])
  vm.runInContext(scripts.get(id), reference);
const app = {
  UTGVersion: "3.16",
  UTGStorage: { rawGet: () => null, restore() {} },
};
for (const initialize of [flow, standards, design, criteria, defaults])
  initialize(app);
const clean = (x) => JSON.parse(JSON.stringify(x));
let passed = 0;
function equal(name, a, b) {
  assert.deepEqual(clean(a), clean(b), name);
  passed++;
}
equal(
  "source default data matches reference",
  app.UTGDefaults.baseline(),
  reference.window.UTGDefaults.baseline(),
);
let seed = 20261106;
const random = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
for (let n = 0; n < 128; n++) {
  const base = app.UTGDefaults.baseline().v3;
  base.extension = { seed: n, text: "äöü <Nachweis> & " + n };
  const a = structuredClone(base),
    b = structuredClone(base),
    left = app.UTGFlowCriteria,
    right = reference.window.UTGFlowCriteria;
  for (const team of ["a", "b"]) {
    left.ensureTeam(a, team);
    right.ensureTeam(b, team);
  }
  for (const stage of app.UTGFlow.states) {
    const type = ["Phase", "DoR", "DoD", "AC"][Math.floor(random() * 4)],
      team = random() < 0.5 ? "a" : "b";
    const items = clean(left.typed(a, stage, team, type));
    if (items.length) {
      items[0].description = "Individuell " + n + " " + type + " " + stage;
      items[0].owner = "Rolle «" + team + "»";
      items[0].evidence = "Nachweis " + n;
    }
    const before = JSON.stringify(a);
    const aa = left.updateTyped(a, stage, team, type, items, false),
      bb = right.updateTyped(b, stage, team, type, items, false);
    equal("typed update " + n + " " + stage, aa, bb);
    assert.equal(JSON.stringify(a), before);
    passed++;
    equal(
      "typed view " + n + " " + stage,
      left.typed(aa, stage, team, type),
      right.typed(bb, stage, team, type),
    );
  }
  const cloned = app.UTGDefaults.baseline();
  cloned.v3.activities[0].description = "Unverändert " + n;
  equal(
    "service resolution " + n,
    app.UTGModels.effective(cloned.v3, {
      service: cloned.v3.services[0].id,
      orgSource: "service",
    }),
    reference.window.UTGModels.effective(cloned.v3, {
      service: cloned.v3.services[0].id,
      orgSource: "service",
    }),
  );
}
// Agreement rules are imported without a document, browser or storage global.
const agreement = createAgreementService(() => app.UTGModels),
  base = app.UTGDefaults.baseline();
base.v2.teams = [{ id: "a", name: "A", productIds: [] }];
base.v3.configs["a::flow"] = { status: "Entwurf", entries: {} };
const confirmed = agreement.confirm(base.v3, "a", "Abgestimmt", base.v2.teams);
assert.equal(agreement.state(confirmed, "a", base.v2.teams).changed, false);
passed++;
confirmed.configs["a::flow"].entries.Bedarf = { org: "BIT", note: "Geändert" };
assert.equal(agreement.state(confirmed, "a", base.v2.teams).changed, true);
passed++;
const api = createInterfaceReview();
assert.deepEqual(
  api.evaluate(
    {
      provider: "BIT",
      embedding: "Shared Services",
      interaction: "Servicebezug",
    },
    {},
  ),
  { provider: true, embedding: true, interaction: true },
);
passed++;
assert.equal(api.valid("Noch zu klären"), false);
passed++;
const result = {
  passed,
  failed: 0,
  seed: 20261106,
  randomizedConfigurations: 128,
  sourceImports: true,
};
fs.mkdirSync(fileURLToPath(new URL("../.test-output/", import.meta.url)), {
  recursive: true,
});
fs.writeFileSync(
  new URL("../.test-output/domain-summary.json", import.meta.url),
  JSON.stringify(result, null, 2) + "\n",
);
console.log(JSON.stringify(result));
