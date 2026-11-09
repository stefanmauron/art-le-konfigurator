// Independent edge assertions against unchanged production modules. Failures remain visible.
const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../.."),
  html = fs.readFileSync(
    path.join(root, "dist/UTG-LE_Operating_Model_v3.16_RC3.html"),
    "utf8",
  ),
  out = process.env.OUTPUT_DIR || path.join(root, ".test-output/unit-edges");
fs.mkdirSync(out, { recursive: true });
const script = (id) =>
  html.match(new RegExp('<script id="' + id + '">([\\s\\S]*?)<\\/script>'))[1];
const ctx = {
  window: {
    UTGFlow: {
      states: [
        "Funnel",
        "Analyzing",
        "Backlog",
        "Implementing",
        "Validating",
        "Deploying & Releasing",
        "Done",
      ],
    },
  },
  structuredClone,
  URL,
  console,
  document: { querySelector: () => null },
};
vm.createContext(ctx);
for (const id of [
  "utg-flow-standard-3152",
  "utg-flow-criteria-data",
  "utg-flow-standard-ui-3152",
  "utg-design-criteria-data",
  "utg-storage-api",
])
  vm.runInContext(script(id), ctx);
const api = ctx.window.UTGFlowCriteria,
  std = ctx.window.UTGFlowStandard,
  adopt = ctx.window.UTGFlowStandardAdoption;
const fresh = () => {
  const b = JSON.parse(
    html.match(/const snapshot=(\{"v2"[\s\S]*?);function baseline/)[1],
  );
  api.initialize(b.v3);
  return b;
};
const clone = (x) => JSON.parse(JSON.stringify(x));
const results = [];
function test(id, name, fn) {
  try {
    fn();
    results.push({ id, name, ok: true });
    console.log("PASS " + id + " " + name);
  } catch (e) {
    results.push({ id, name, ok: false, error: e.message });
    console.log("FAIL " + id + " " + name + " " + e.message);
  }
}
for (const stage of ctx.window.UTGFlow.states)
  test("phase:" + stage, "entry and exit have roles and evidence", () => {
    const b = fresh(),
      g = b.v3.flowCriteria.phaseGates[stage];
    assert.equal(g.length, 2);
    for (const c of g) assert(c.owner.trim() && c.evidence.trim());
    assert.equal(g[1].type, stage === "Done" ? "Abschluss" : "Übergang");
  });
for (const revision of [2, 3, 4])
  test(
    "revision:" + revision,
    "supported revision survives initialization",
    () => {
      const b = fresh();
      b.v3.flowCriteria.standardRevision = revision;
      const before = JSON.stringify(b);
      api.initialize(b.v3);
      assert.equal(JSON.stringify(b), before);
    },
  );
for (const invalid of ["", " ", null, 42])
  test(
    "description:" + String(invalid),
    "invalid description rejected without source mutation",
    () => {
      const b = fresh(),
        before = JSON.stringify(b),
        items = clone(api.typed(b.v3, "Backlog", "", "DoR"));
      items[0].description = invalid;
      assert.throws(() => api.updateTyped(b.v3, "Backlog", "", "DoR", items));
      assert.equal(JSON.stringify(b), before);
    },
  );
for (const field of ["owner", "contributors", "evidence"])
  test("criterion-field:" + field, "invalid field rejected", () => {
    const b = fresh();
    b.v3.flowCriteria.commonDoD[0][field] = { malformed: true };
    assert.throws(() => api.validate(b.v3.flowCriteria));
  });
test("duplicate-id", "duplicate IDs rejected", () => {
  const b = fresh(),
    items = api.typed(b.v3, "Done", "", "DoD");
  items.push(clone(items[0]));
  assert.throws(() => api.updateTyped(b.v3, "Done", "", "DoD", items));
});
test(
  "shared-scope",
  "edit through any phase affects same catalogue only",
  () => {
    let d = fresh().v3;
    api.ensureTeam(d, "a");
    api.ensureTeam(d, "b");
    const before = JSON.stringify(d.flowCriteria.profiles.b),
      items = api.typed(d, "Funnel", "a", "DoD");
    items[0].description = "Eigene Regel";
    d = api.updateTyped(d, "Funnel", "a", "DoD", items);
    for (const stage of ctx.window.UTGFlow.states)
      assert.equal(
        api.typed(d, stage, "a", "DoD")[0].description,
        "Eigene Regel",
      );
    assert.equal(JSON.stringify(d.flowCriteria.profiles.b), before);
  },
);
test(
  "fresh-standard-comparison",
  "fresh current standard must not report any adoption differences",
  () => {
    assert.equal(adopt.plan(fresh().v3).length, 0);
  },
);
test(
  "json-order",
  "identical data with reordered object keys must not produce differences",
  () => {
    const b = fresh();
    const before = adopt.plan(b.v3).map((r) => r.id);
    function reorder(x) {
      if (Array.isArray(x)) return x.map(reorder);
      if (x && typeof x === "object")
        return Object.fromEntries(
          Object.entries(x)
            .reverse()
            .map(([k, v]) => [k, reorder(v)]),
        );
      return x;
    }
    assert.deepEqual(
      adopt.plan(reorder(b.v3)).map((r) => r.id),
      before,
    );
  },
);
test(
  "criteria-kind-roundtrip",
  "entry changed to execution and back must restore original gate",
  () => {
    let d = fresh().v3;
    let items = api.typed(d, "Implementing", "", "Phase");
    items.find((c) => c.id === "entry-3").type = "Flow-Steuerung";
    d = api.updateTyped(d, "Implementing", "", "Phase", items);
    items = api.typed(d, "Implementing", "", "Phase");
    items.find((c) => c.id === "entry-3").type = "Eintritt";
    d = api.updateTyped(d, "Implementing", "", "Phase", items);
    assert(
      d.flowCriteria.phaseGates.Implementing.some((c) => c.id === "entry-3"),
    );
    assert(
      !d.flowCriteria.rules.Implementing.criteria.some(
        (c) => c.id === "entry-3",
      ),
    );
  },
);
test(
  "whitespace-governance",
  "whitespace fields cannot count as an agreement",
  () => {
    const g = std.governance();
    for (const [k] of std.fields) g[k] = " ";
    g.status = "Vereinbart";
    assert.throws(() => std.validateGovernance(g));
  },
);
test("unsupported-revision", "unknown revision rejected", () => {
  const b = fresh();
  b.v3.flowCriteria.standardRevision = 99;
  assert.throws(() => api.validate(b.v3.flowCriteria));
});
test(
  "stale-selection",
  "already adopted comparison IDs cannot silently apply again",
  () => {
    const b = fresh();
    b.v3.flowCriteria.commonDoD[0].description = "Old";
    const next = adopt.apply(b.v3, "", ["DoD"]);
    assert.throws(() => adopt.apply(next, "", ["DoD"]));
  },
);
test(
  "all-policies-atomic",
  "unknown adoption ID cannot partially change policy",
  () => {
    const b = fresh();
    b.v3.policies[0].exit = "Old";
    const before = JSON.stringify(b);
    assert.throws(() => adopt.apply(b.v3, "", ["policy:Funnel", "unknown"]));
    assert.equal(JSON.stringify(b), before);
  },
);
for (const value of [{ bad: 1 }, [], true, -1, "-3"])
  test(
    "wip:" + JSON.stringify(value),
    "malformed WIP rejected by actual import validation",
    () => {
      const b = fresh();
      b.v3.policies[0].wip = value;
      assert.throws(() => ctx.window.UTGStorage.validateBundle(b));
    },
  );
test("valid-wip", "valid positive WIP string accepted", () => {
  const b = fresh();
  b.v3.policies[0].wip = "2";
  ctx.window.UTGStorage.validateBundle(b);
});

test(
  "meaningful-changes",
  "real text and array-order changes remain visible without writes",
  () => {
    const b = fresh(),
      before = JSON.stringify(b);
    b.v3.flowCriteria.commonDoD[0].description += " Anders";
    assert(adopt.plan(b.v3).some((row) => row.id === "DoD"));
    b.v3.flowCriteria.commonDoD.reverse();
    assert(adopt.plan(b.v3).some((row) => row.id === "DoD"));
    const custom = JSON.stringify(b);
    adopt.plan(b.v3);
    assert.equal(JSON.stringify(b), custom);
    assert.notEqual(custom, before);
  },
);
test(
  "empty-optionals",
  "missing and empty optional fields compare equally, nonempty ones survive",
  () => {
    const b = fresh();
    for (const policy of b.v3.policies) policy.interface = "";
    for (const c of b.v3.flowCriteria.commonDoD) c.contributors = "";
    assert.equal(adopt.plan(b.v3).length, 0);
    b.v3.policies[0].interface = "Meine Übergabe";
    assert.equal(adopt.plan(b.v3).length, 0);
    assert.equal(b.v3.policies[0].interface, "Meine Übergabe");
  },
);
for (const stage of ctx.window.UTGFlow.states)
  test(
    "provenance:" + stage,
    "unchanged historical rule gates retain their original source",
    () => {
      let d = fresh().v3;
      const type = stage === "Done" ? "Abschluss" : "Eintritt",
        legacy = {
          id: "legacy-gate",
          type,
          description: "Individuelle Altregel",
          owner: "PO",
          evidence: "Nachweis",
        };
      d.flowCriteria.rules[stage].criteria.push(legacy);
      const before = JSON.stringify(d.flowCriteria.rules[stage]);
      d = api.updateTyped(
        d,
        stage,
        "",
        "Phase",
        api.typed(d, stage, "", "Phase"),
      );
      assert.equal(JSON.stringify(d.flowCriteria.rules[stage]), before);
      assert(!JSON.stringify(d).includes("_source"));
    },
  );
for (const valid of [undefined, "", " ", 1, 20, "2", "02", "2.0", "1e2"])
  test(
    "valid-wip:" + String(valid),
    "valid or empty legacy WIP validates without mutation",
    () => {
      const b = fresh();
      if (valid !== undefined) b.v3.policies[0].wip = valid;
      else delete b.v3.policies[0].wip;
      const before = JSON.stringify(b);
      ctx.window.UTGStorage.validateBundle(b);
      assert.equal(JSON.stringify(b), before);
    },
  );
for (const invalid of [
  null,
  0,
  "0",
  1.5,
  "1.5",
  "NaN",
  "Infinity",
  "0x10",
  Number.MAX_SAFE_INTEGER + 1,
])
  test(
    "invalid-wip:" + String(invalid),
    "invalid WIP fails before storage changes",
    () => {
      const b = fresh();
      b.v3.policies[0].wip = invalid;
      let writes = 0;
      ctx.localStorage = {
        getItem: () => null,
        setItem: () => writes++,
        removeItem: () => writes++,
      };
      assert.throws(() => ctx.window.UTGStorage.restore(b), /WIP/);
      assert.equal(writes, 0);
    },
  );
const previous = JSON.parse(
  fs.readFileSync(
    path.join(root, "tests/fixtures/migration-criteria.json"),
    "utf8",
  ),
).previousConfiguration;
test(
  "previous-version-unchanged",
  "loading customized previous-version criteria never migrates them to new lists",
  () => {
    const b = structuredClone(previous);
    b.v3.flowCriteria.commonDoD = [];
    b.v3.flowCriteria.rules.Implementing.criteria.push({
      id: "legacy-entry",
      type: "Eintritt",
      description: "Historisch",
      owner: "PO",
      evidence: "Ticket",
    });
    const before = JSON.stringify(b);
    api.initialize(b.v3);
    assert.equal(JSON.stringify(b), before);
  },
);
for (const stage of ctx.window.UTGFlow.states)
  test(
    "gate-roundtrip:" + stage,
    "entry to execution and back restores its gate and original rule list",
    () => {
      let d = fresh().v3;
      const ruleBefore = JSON.stringify(d.flowCriteria.rules[stage]),
        entry = d.flowCriteria.phaseGates[stage][0];
      let items = api.typed(d, stage, "", "Phase");
      items.find((c) => c.id === entry.id).type = "Flow-Steuerung";
      d = api.updateTyped(d, stage, "", "Phase", items);
      items = api.typed(d, stage, "", "Phase");
      items.find((c) => c.id === entry.id).type = "Eintritt";
      d = api.updateTyped(d, stage, "", "Phase", items);
      assert(
        d.flowCriteria.phaseGates[stage].some(
          (c) => c.id === entry.id && c.type === "Eintritt",
        ),
      );
      assert.equal(JSON.stringify(d.flowCriteria.rules[stage]), ruleBefore);
      assert(!JSON.stringify(d).includes("_source"));
    },
  );
// Restored from the original regression catalogue; preserves meaningful array ordering.
test(
  "criteria-order",
  "array order alone remains a meaningful difference",
  () => {
    const b = fresh();
    assert.equal(adopt.plan(b.v3).length, 0);
    b.v3.flowCriteria.commonDoD.reverse();
    assert(adopt.plan(b.v3).some((row) => row.id === "DoD"));
  },
);
fs.writeFileSync(
  path.join(out, "checks.json"),
  JSON.stringify(results, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    checks: results.length,
    passed: results.filter((x) => x.ok).length,
    failed: results.filter((x) => !x.ok).length,
  }),
);
if (results.some((x) => !x.ok)) process.exitCode = 1;
