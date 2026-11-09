const fs = require("node:fs"),
  path = require("node:path"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../.."),
  source = fs.readFileSync(
    path.join(root, "dist/UTG-LE_Operating_Model_v3.16_RC3.html"),
    "utf8",
  );
function moduleText(s, id) {
  return s.match(
    new RegExp('<script id="' + id + '">([\\s\\S]*?)<\\/script>'),
  )[1];
}
function context(s) {
  const c = {
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
    console,
    document: { querySelector: () => null },
  };
  vm.createContext(c);
  if (s.includes('id="utg-flow-standard-3152"'))
    vm.runInContext(moduleText(s, "utg-flow-standard-3152"), c);
  vm.runInContext(moduleText(s, "utg-flow-criteria-data"), c);
  return c;
}
const c = context(source),
  api = c.window.UTGFlowCriteria,
  std = c.window.UTGFlowStandard;
vm.runInContext(moduleText(source, "utg-flow-standard-ui-3152"), c);
const adoption = c.window.UTGFlowStandardAdoption,
  stages = c.window.UTGFlow.states;
let passed = 0;
function test(name, fn) {
  fn();
  passed++;
  console.log("PASS " + name);
}
const json = (x) => JSON.parse(JSON.stringify(x));
const baseline = () => {
  const d = JSON.parse(
    source.match(/const snapshot=(\{"v2"[\s\S]*?);function baseline/)[1],
  ).v3;
  api.initialize(d);
  return d;
};
const legacyFixture = JSON.parse(
  fs.readFileSync(
    path.join(root, "tests/fixtures/migration-criteria.json"),
    "utf8",
  ),
);
const old = () => structuredClone(legacyFixture.configuration);
test("all inline scripts parse", () => {
  for (const m of source.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi))
    new vm.Script(m[1]);
});
test("seven complete phase boundaries and corrected counts", () => {
  const d = baseline();
  assert.deepEqual(
    stages.map((stage) => api.typed(d, stage, "", "Phase").length),
    [2, 3, 2, 3, 2, 4, 2],
  );
  for (const stage of stages) {
    const items = d.flowCriteria.phaseGates[stage];
    assert.equal(items.length, 2);
    assert.equal(items[0].type, "Eintritt");
    assert.equal(items[1].type, stage === "Done" ? "Abschluss" : "Übergang");
    assert.equal(
      items[1].description,
      d.policies.find((p) => p.name === stage).exit,
    );
    for (const c of items) assert(c.owner && c.contributors && c.evidence);
  }
  api.validate(d.flowCriteria);
});
test("release completion is performed rather than only prepared", () => {
  const d = baseline();
  assert.match(
    d.flowCriteria.phaseGates["Deploying & Releasing"][1].description,
    /bestätigt/,
  );
  assert.match(d.flowCriteria.phaseGates.Done[0].description, /nachgewiesen/);
  assert.match(
    d.flowCriteria.rules["Deploying & Releasing"].criteria[0].description,
    /entkoppeltem Release/,
  );
});
test("feature readiness, conditional acceptance, one measurement handover", () => {
  const d = baseline();
  assert(
    !d.flowCriteria.commonDoR.some((c) =>
      c.description.includes("für eine Iteration"),
    ),
  );
  assert.equal(
    d.flowCriteria.commonDoD[0].description,
    "Die vereinbarten AC sind nachweislich erfüllt.",
  );
  assert.match(
    d.flowCriteria.rules["Deploying & Releasing"].criteria[0].description,
    /Formale Abnahmen nur bei Erforderlichkeit/,
  );
  assert.equal(d.flowCriteria.rules.Done.criteria.length, 0);
  assert.match(
    d.flowCriteria.rules.Analyzing.criteria.find((c) => c.type === "Wirkung")
      .description,
    /Ausgangslage.*Datenquelle/,
  );
});
test("AC guidance appears only in analyzing; no validation pseudo-AC", () => {
  const d = baseline();
  assert.deepEqual(
    stages.map((stage) => api.typed(d, stage, "", "AC").length),
    [0, 4, 0, 0, 0, 0, 0],
  );
});
test("no invented WIP SLE or agreement approval", () => {
  const d = baseline();
  assert(d.policies.every((p) => !p.wip));
  assert.equal(d.flowGovernance.status, "Vorschlag");
  assert.equal(d.flowGovernance.wip, "");
  assert.equal(d.flowGovernance.sle, "");
  assert(std.issues(d).some((i) => i.message.includes("WIP")));
  std.validateGovernance(d.flowGovernance);
});
test("agreed governance requires all fields, role and evidence", () => {
  const g = std.governance();
  g.status = "Vereinbart";
  assert.throws(() => std.validateGovernance(g));
  for (const [k] of std.fields) g[k] ||= "Explizit vereinbart";
  std.validateGovernance(g);
  assert.throws(() => std.validateGovernance({ ...g, wip: 9 }));
  assert.throws(() => std.validateGovernance({ ...g, status: "Erfüllt" }));
});
test("existing standard and modified/deleted team criteria remain unchanged on initialization", () => {
  const d = old();
  d.flowCriteria.profiles.a = structuredClone(legacyFixture.teamProfile);
  d.flowCriteria.profiles.a.commonDoD = [];
  d.flowCriteria.profiles.a.phaseGates.Funnel[0].description = "Individuell";
  const before = JSON.stringify(d);
  api.initialize(d);
  assert.equal(JSON.stringify(d), before);
  assert.deepEqual(json(d.flowGovernance), json(old().flowGovernance));
});
test("new teams copy selected template independently", () => {
  const d = baseline();
  api.ensureTeam(d, "a");
  api.ensureTeam(d, "b");
  d.flowCriteria.profiles.a.commonDoR[0].description = "Individuell";
  assert.notEqual(
    d.flowCriteria.profiles.b.commonDoR[0].description,
    "Individuell",
  );
  assert.notEqual(d.flowCriteria.commonDoR[0].description, "Individuell");
});
test("comparison is read-only and shows shorter criteria and rules", () => {
  const d = old(),
    before = JSON.stringify(d),
    rows = adoption.plan(d);
  assert(
    rows.some(
      (r) =>
        r.id === "DoR" && r.current[0].description !== r.next[0].description,
    ),
  );
  assert(
    rows.some(
      (r) =>
        r.id === "Phase:Funnel" &&
        r.current[1].description.length > r.next[1].description.length,
    ),
  );
  assert.equal(JSON.stringify(d), before);
});
test("targeted adoption changes only the selected team section", () => {
  const d = old();
  api.ensureTeam(d, "a");
  api.ensureTeam(d, "b");
  const before = JSON.stringify(d);
  const next = adoption.apply(
    d,
    "a",
    ["Phase:Deploying & Releasing"],
    ["a", "b"],
  );
  assert.equal(JSON.stringify(d), before);
  assert.deepEqual(
    json(next.flowCriteria.profiles.b),
    json(d.flowCriteria.profiles.b),
  );
  assert.deepEqual(
    json(next.flowCriteria.phaseGates),
    json(d.flowCriteria.phaseGates),
  );
  assert.deepEqual(next.policies, d.policies);
  assert.match(
    next.flowCriteria.profiles.a.phaseGates["Deploying & Releasing"][1]
      .description,
    /bestätigt/,
  );
  assert.deepEqual(
    json(next.flowCriteria.profiles.a.commonDoD),
    json(d.flowCriteria.profiles.a.commonDoD),
  );
});
test("explicit minimum contract adoption preserves custom WIP and interface", () => {
  const d = old();
  d.policies[5].wip = "2";
  d.policies[5].interface = "Individuelle Übergabe";
  const next = adoption.apply(d, "", ["policy:Deploying & Releasing"]);
  assert.equal(next.policies[5].wip, "2");
  assert.equal(next.policies[5].interface, "Individuelle Übergabe");
  assert.match(next.policies[5].exit, /bestätigt/);
  assert.deepEqual(json(next.flowCriteria), json(d.flowCriteria));
});
test("explicit governance replacement preserves measured WIP/SLE but resets agreement status", () => {
  const d = old();
  d.flowGovernance = {
    ...std.governance(),
    wip: "2 Features je Team",
    sle: "85% in 10 Tagen",
    decisionRole: "ART-Rolle",
    evidence: "Protokoll",
  };
  d.flowGovernance.status = "Vereinbart";
  const next = adoption.apply(d, "", ["governance"]);
  assert.equal(next.flowGovernance.status, "Vorschlag");
  assert.equal(next.flowGovernance.wip, d.flowGovernance.wip);
  assert.equal(next.flowGovernance.sle, d.flowGovernance.sle);
});
test("empty stale duplicate or removed-team adoption is rejected without changes", () => {
  const d = old(),
    before = JSON.stringify(d);
  for (const ids of [[], ["missing"], ["DoD", "DoD"]])
    assert.throws(() => adoption.apply(d, "", ids));
  assert.throws(() => adoption.apply(d, "removed", ["DoD"], ["a"]));
  assert.equal(JSON.stringify(d), before);
});
test("old and new configurations roundtrip with independent profiles", () => {
  for (const d of [old(), baseline()]) {
    api.ensureTeam(d, "a");
    const copy = JSON.parse(JSON.stringify(d));
    api.initialize(copy);
    api.validate(copy.flowCriteria);
    std.validateGovernance(copy.flowGovernance);
    assert.deepEqual(json(copy), json(d));
  }
});
test("structural consistency reports wrong completion types", () => {
  const d = baseline();
  d.flowCriteria.phaseGates.Funnel[1].type = "Abschluss";
  assert(
    std
      .issues(d)
      .some(
        (i) => i.target.stage === "Funnel" && i.message.includes("vorbehalten"),
      ),
  );
});
test("governance changes invalidate confirmations while absent governance preserves old signatures", () => {
  function agreement(html) {
    const ctx = {
      window: { addEventListener() {} },
      document: { addEventListener() {}, querySelectorAll: () => [] },
      structuredClone,
      console,
    };
    vm.createContext(ctx);
    vm.runInContext(moduleText(html, "utg-flow-ux-core"), ctx);
    return ctx.window.UTGAgreement;
  }
  const current = agreement(source),
    previous = { signature: () => legacyFixture.signatureWithoutGovernance },
    d = old(),
    teams = [{ id: "a", name: "A", productIds: [] }];
  delete d.flowGovernance;
  d.configs["a::flow"] = { status: "Entwurf", entries: {} };
  assert.equal(
    current.signature(d, "a", teams),
    previous.signature(d, "a", teams),
  );
  let confirmed = current.confirm(d, "a", "Abgestimmt", teams);
  assert.equal(current.state(confirmed, "a", teams).changed, false);
  confirmed.flowGovernance = std.governance();
  assert.equal(current.state(confirmed, "a", teams).changed, true);
  confirmed = current.confirm(confirmed, "a", "Abgestimmt", teams);
  confirmed.flowGovernance.wip = "Neue WIP-Vereinbarung";
  assert.equal(current.state(confirmed, "a", teams).changed, true);
});
test("all seven phase contexts distinguish shared readiness from result quality", () => {
  for (const stage of stages) {
    assert(std.context(stage, "DoR"));
    assert(std.context(stage, "DoD"));
  }
  const d = baseline();
  assert.equal(d.flowCriteria.standardRevision, 4);
  assert.match(
    d.flowCriteria.phaseGates.Validating[1].description,
    /DoD.*erfüllt/,
  );
  assert.match(
    d.flowCriteria.phaseGates["Deploying & Releasing"][0].description,
    /DoD.*erfüllt/,
  );
  for (const stage of stages)
    for (const type of ["DoR", "DoD"])
      assert.deepEqual(
        json(api.typed(d, stage, "", type)),
        json(api.typed(d, "Funnel", "", type)),
      );
  assert(
    d.flowCriteria.commonDoR.every(
      (c) => c.description.split(/\s+/).length <= 15,
    ),
  );
  assert(d.policies.every((c) => c.exit.split(/\s+/).length <= 20));
});
console.log("PASS " + passed + " active flow regression groups");
