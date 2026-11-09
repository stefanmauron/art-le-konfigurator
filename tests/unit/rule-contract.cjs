const fs = require("node:fs"),
  vm = require("node:vm"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const root = path.resolve(__dirname, "../.."),
  html = fs.readFileSync(
    path.join(root, "dist/UTG-LE_Operating_Model_v3.16_RC3.html"),
    "utf8",
  ),
  out =
    process.env.OUTPUT_DIR ||
    path.join(root, ".test-output/unit-rule-contract");
fs.mkdirSync(out, { recursive: true });
const stages = [
    "Funnel",
    "Analyzing",
    "Backlog",
    "Implementing",
    "Validating",
    "Deploying & Releasing",
    "Done",
  ],
  ctx = { window: { UTGFlow: { states: stages } }, structuredClone };
vm.createContext(ctx);
for (const id of [
  "utg-flow-standard-3152",
  "utg-flow-criteria-data",
  "utg-operating-model-review",
])
  vm.runInContext(
    html.match(
      new RegExp('<script id="' + id + '">([\\s\\S]*?)<\\/script>'),
    )[1],
    ctx,
  );
const api = ctx.window.UTGFlowCriteria,
  review = ctx.window.UTGOperatingModelReview;
const checks = [];
function base() {
  const b = JSON.parse(
    html.match(/const snapshot=(\{"v2"[\s\S]*?);function baseline/)[1],
  );
  b.v2.teams = [
    { id: "a", name: "Team A" },
    { id: "b", name: "Team B" },
  ];
  b.v3.products = [
    { id: "pa", name: "Produkt A" },
    { id: "pb", name: "Produkt B" },
  ];
  api.initialize(b.v3);
  for (const t of b.v2.teams) api.ensureTeam(b.v3, t.id);
  Object.assign(b.v3.flowGovernance, {
    status: "Vereinbart",
    wip: "2 Features",
    sle: "85% in 10 Tagen; Testdaten",
    decisionRole: "Testrolle",
    evidence: "Testvereinbarung",
  });
  return b;
}
function run(id, fn) {
  try {
    fn();
    checks.push({ id, ok: true });
    console.log("PASS " + id);
  } catch (e) {
    checks.push({ id, ok: false, error: e.message });
    console.log("FAIL " + id + " " + e.message);
  }
}
function findings(b) {
  const before = JSON.stringify(b),
    r = review.validate(b.v2, b.v3, true);
  assert.equal(JSON.stringify(b), before);
  return r;
}
run("complete-reference-and-teams", () =>
  assert.equal(findings(base()).length, 0),
);
for (const stage of stages) {
  run("missing-policy:" + stage, () => {
    const b = base();
    b.v3.policies = b.v3.policies.filter((p) => p.name !== stage);
    assert(
      findings(b).some(
        (f) =>
          f.message.includes("Flow-Regel fehlt") &&
          f.target.kind === "policy" &&
          f.target.stage === stage,
      ),
    );
  });
  run("duplicate-policy:" + stage, () => {
    const b = base();
    b.v3.policies.push(
      structuredClone(b.v3.policies.find((p) => p.name === stage)),
    );
    assert(
      findings(b).some(
        (f) => f.message.includes("mehrfach") && f.target.stage === stage,
      ),
    );
  });
  run("missing-policy-text:" + stage, () => {
    const b = base();
    b.v3.policies.find((p) => p.name === stage).exit = " ";
    assert(
      findings(b).some(
        (f) =>
          f.message.includes("Vereinbarung fehlt") && f.target.stage === stage,
      ),
    );
  });
  run("missing-decision-role:" + stage, () => {
    const b = base();
    b.v3.policies.find((p) => p.name === stage).owner = "";
    assert(
      findings(b).some(
        (f) => f.message.includes("Entscheidrolle") && f.target.stage === stage,
      ),
    );
  });
}
for (const team of ["", "a", "b"])
  for (const stage of stages)
    run("missing-entry:" + team + ":" + stage, () => {
      const b = base(),
        p = team ? b.v3.flowCriteria.profiles[team] : b.v3.flowCriteria;
      p.phaseGates[stage] = p.phaseGates[stage].filter(
        (c) => c.type !== "Eintritt",
      );
      assert(
        findings(b).some(
          (f) =>
            f.message.includes("Eintrittskriterium fehlt") &&
            f.target.stage === stage &&
            (f.target.team || "") === team &&
            f.target.kind === "criteria" &&
            f.target.type === "Phase",
        ),
      );
    });
for (const team of ["", "a", "b"])
  run("missing-ac-guidance:" + team, () => {
    const b = base(),
      p = team ? b.v3.flowCriteria.profiles[team] : b.v3.flowCriteria;
    for (const rule of Object.values(p.rules))
      rule.criteria = rule.criteria.filter((c) => c.type !== "AC");
    assert(
      findings(b).some(
        (f) =>
          f.message.includes("Keine Akzeptanzkriterien") &&
          f.target.stage === "Analyzing" &&
          f.target.type === "AC" &&
          (f.target.team || "") === team,
      ),
    );
  });
run("proposal-is-not-agreement", () => {
  const b = base();
  b.v3.flowGovernance.status = "Vorschlag";
  assert(
    findings(b).some((f) =>
      f.message.includes("noch nicht gemeinsam vereinbart"),
    ),
  );
  assert.equal(b.v3.flowGovernance.status, "Vorschlag");
});
run("unknown-state-is-visible", () => {
  const b = base();
  b.v3.policies.push({ name: "Unbekannt", exit: "Nicht Teil des Modells" });
  assert(findings(b).some((f) => f.message.includes("Unbekannte Phase")));
});
fs.writeFileSync(
  path.join(out, "checks.json"),
  JSON.stringify(checks, null, 2) + "\n",
);
console.log(
  JSON.stringify({
    checks: checks.length,
    passed: checks.filter((c) => c.ok).length,
    failed: checks.filter((c) => !c.ok).length,
  }),
);
if (checks.some((c) => !c.ok)) process.exitCode = 1;
