require("./helpers/paths.cjs");
// Regression checks run the actual scripts from the current standalone app.
// Run from the repository root: npm test
const fs = require("node:fs"),
  vm = require("node:vm"),
  assert = require("node:assert/strict");
const appPath =
  "dist/UTG-LE_Operating_Model_v3.16_RC3.html";
const { view, statement, expression } = require("./legacy-view.cjs");
const html = view(
  fs.readFileSync(require("./helpers/paths.cjs").appFile(appPath), "utf8"),
);
const blocks = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)].map(
  (m) => ({ attributes: m[1], code: m[2] }),
);
for (const block of blocks) new vm.Script(block.code);
const script = (id) => {
  const block = blocks.find((b) => b.attributes.includes('id="' + id + '"'));
  assert.ok(block, id);
  return block.code;
};
const migration = blocks.find((b) =>
  b.code.includes("legacyArchive.retiredServiceFields"),
).code;
const V2 = "gever-art-leistungsmatrix-v1",
  V3 = "gever-art-v3-config";
let checks = 0;
function test(name, fn) {
  fn();
  checks++;
  console.log("PASS " + name);
}
function boot(initial = {}) {
  const store = new Map(
      Object.entries(initial).map(([key, value]) => [
        key,
        JSON.stringify(value),
      ]),
    ),
    events = [];
  let fail = false;
  const ctx = {
    console,
    structuredClone,
    document: { getElementById: () => null },
    localStorage: {
      getItem: (key) => store.get(key) ?? null,
      setItem(key, value) {
        if (fail) throw Error("QuotaExceededError");
        store.set(key, value);
      },
      removeItem: (key) => store.delete(key),
    },
    Event: class {
      constructor(type) {
        this.type = type;
      }
    },
    CustomEvent: class {
      constructor(type, options) {
        this.type = type;
        this.detail = options.detail;
      }
    },
    window: {
      UTGEdits: { closeSaved: (dialog) => dialog.close() },
      dispatchEvent: (event) => events.push(event),
      addEventListener() {},
    },
  };
  vm.createContext(ctx);
  for (const id of [
    "utg-flow-definition",
    "utg-flow-standard-3152",
    "utg-storage-api",
    "utg-design-criteria-data",
    "utg-canonical-defaults",
    "utg-service-data",
    "utg-flow-criteria-data",
    "utg-operating-model-review",
  ])
    vm.runInContext(script(id), ctx);
  return {
    ctx,
    store,
    events,
    fail: (value) => (fail = value),
    run: (code) => vm.runInContext(code, ctx),
  };
}
const base = () => ({
  schema: 3,
  products: [],
  activities: [
    { id: "a", name: "Test", phase: "Analyzing", service: "s1" },
    { id: "b", name: "Legacy", phase: "Implementing", service: "Alpha" },
  ],
  services: [
    {
      id: "s1",
      name: "Alpha",
      provider: "BIT",
      embedding: "Shared Services",
      interaction: "Servicebezug",
    },
    { id: "s2", name: "Beta", provider: "ISCeco" },
  ],
  configs: {
    "t::flow": {
      entries: {
        Test: { service: "Alpha", org: "BIT", business: "PO", note: "keep" },
        Legacy: { service: "s1", org: "BIT" },
      },
    },
  },
  providers: ["BIT", "ISCeco"],
});
test("all application script blocks parse", () =>
  assert.ok(blocks.length >= 27));
test("flow criteria migration preserves all legacy policies and individual settings", () => {
  const x = boot(),
    api = x.ctx.window.UTGFlowCriteria,
    d = base();
  d.policies = [
    {
      id: "FP-1",
      name: "Funnel",
      exit: "Mein Kriterium",
      owner: "Meine Rolle",
      wip: "3",
      interface: "Eigene Übergabe",
    },
  ];
  const before = JSON.stringify(d);
  api.initialize(d);
  assert.deepEqual(
    JSON.parse(before),
    JSON.parse(
      JSON.stringify({ ...d, flowCriteria: undefined, migrations: undefined }),
    ),
  );
  const once = JSON.stringify(d);
  api.initialize(d);
  assert.equal(JSON.stringify(d), once);
  assert.equal(Object.keys(d.flowCriteria.rules).length, 7);
});
test("team criteria and team DoD can change independently of the template and other teams", () => {
  const x = boot(),
    api = x.ctx.window.UTGFlowCriteria,
    d = api.initialize(base()),
    c = {
      id: "own",
      type: "AC",
      description: "Team A Nachweis",
      owner: "PO A",
      evidence: "Ticket",
    };
  const changed = api.update(d, "Validating", "team-a", [c], true);
  assert.equal(
    api.effective(changed, "Validating", "team-a").common[0].description,
    c.description,
  );
  assert.equal(api.effective(changed, "Validating", "team-b").common.length, 0);
  assert.equal(api.effective(d, "Validating", "team-a").common.length, 0);
  const updated = api.update(changed, "commonDoD", "team-a", [
    { ...c, type: "DoD" },
  ]);
  for (const stage of ["Implementing", "Validating", "Done"])
    assert.equal(
      api.effective(updated, stage, "team-a").dod[0].description,
      c.description,
    );
  assert.notEqual(
    api.effective(updated, "Done", "team-b").dod[0].description,
    c.description,
  );
  assert.equal(api.effective(updated, "Funnel", "team-a").dod.length, 1);
});
test("deleted flow criteria and disabled DoD references stay deleted on initialization", () => {
  const x = boot(),
    api = x.ctx.window.UTGFlowCriteria;
  let d = api.update(base(), "Funnel", "", [], false);
  d = api.update(d, "commonDoD", "", []);
  api.initialize(d);
  assert.equal(d.flowCriteria.rules.Funnel.criteria.length, 0);
  assert.equal(d.flowCriteria.commonDoD.length, 0);
  assert.equal(d.flowCriteria.rules.Funnel.useDoD, false);
});
test("flow criteria JSON roundtrip preserves custom criteria and legacy text", () => {
  const x = boot(),
    api = x.ctx.window.UTGFlowCriteria,
    d = JSON.parse(x.store.get(V3));
  d.policies[0].exit = "Individuelle Regel";
  api.initialize(d);
  d.flowCriteria.teams.t = {
    Funnel: [
      {
        id: "own",
        type: "Aufnahme",
        description: "Mein Text",
        owner: "Ich",
        evidence: "Referenz",
      },
    ],
  };
  x.store.set(V3, JSON.stringify(d));
  const bundle = JSON.parse(JSON.stringify(x.ctx.window.UTGStorage.bundle()));
  x.ctx.window.UTGStorage.restore(bundle);
  const restored = JSON.parse(x.store.get(V3));
  assert.equal(restored.policies[0].exit, "Individuelle Regel");
  assert.equal(
    JSON.stringify(restored.flowCriteria),
    JSON.stringify(d.flowCriteria),
  );
});
test("invalid imported flow criteria are rejected before storage changes", () => {
  const x = boot(),
    api = x.ctx.window.UTGFlowCriteria,
    b = x.ctx.window.UTGStorage.bundle();
  api.initialize(b.v3);
  b.v3.flowCriteria.phaseGates.Funnel[0].evidence = 23;
  const before = [...x.store];
  assert.throws(() => x.ctx.window.UTGStorage.restore(b), /Flow-Kriterien/);
  assert.deepEqual([...x.store], before);
});
test("standard catalog contains five DoR, four AC templates and five DoD criteria", () => {
  const f = boot().ctx.window.UTGFlowCriteria.defaults();
  assert.equal(f.commonDoR.length, 5);
  assert.equal(
    f.rules.Analyzing.criteria.filter((c) => c.type === "AC").length,
    4,
  );
  assert.equal(f.commonDoD.length, 5);
  assert.ok(
    f.commonDoD.every((c) => c.type === "DoD" && c.owner && c.evidence),
  );
});
test("team edits deletions additions and DoD references survive initialization and JSON restore", () => {
  const x = boot(),
    api = x.ctx.window.UTGFlowCriteria;
  let d = JSON.parse(x.store.get(V3));
  api.ensureTeam(d, "a");
  api.ensureTeam(d, "b");
  d = api.update(d, "Backlog", "a", [], false);
  d = api.update(d, "commonDoD", "a", []);
  api.initialize(d);
  api.ensureTeam(d, "a");
  assert.equal(api.effective(d, "Backlog", "a").common.length, 0);
  assert.equal(api.effective(d, "Done", "a").dod.length, 0);
  assert.equal(api.effective(d, "Backlog", "b").dor.length, 5);
  const b = x.ctx.window.UTGStorage.bundle();
  b.v3 = d;
  x.ctx.window.UTGStorage.restore(JSON.parse(JSON.stringify(b)));
  const restored = JSON.parse(x.store.get(V3));
  assert.equal(
    JSON.stringify(restored.flowCriteria),
    JSON.stringify(d.flowCriteria),
  );
  assert.equal(api.effective(restored, "Backlog", "a").common.length, 0);
});
test("template changes affect new teams while preserving existing team profiles", () => {
  const api = boot().ctx.window.UTGFlowCriteria;
  let d = api.ensureTeam(base(), "existing");
  const old = JSON.stringify(d.flowCriteria.profiles.existing);
  d = api.update(d, "Backlog", "", [], false);
  api.ensureTeam(d, "new");
  assert.equal(api.effective(d, "Backlog", "new").common.length, 0);
  assert.equal(JSON.stringify(d.flowCriteria.profiles.existing), old);
});
test("legacy standard migration changes only exact untouched lists and retains team additions", () => {
  const x = boot();
  x.run(
    script("utg-flow-criteria-data").replace(
      "window.UTGFlowCriteria=",
      "window.__flowLegacy=legacyDefaults;window.UTGFlowCriteria=",
    ),
  );
  const api = x.ctx.window.UTGFlowCriteria,
    d = base();
  d.flowCriteria = x.ctx.window.__flowLegacy();
  d.flowCriteria.commonDoD[0].description = "Eigene DoD";
  d.flowCriteria.rules.Analyzing.criteria = [];
  d.flowCriteria.teams.a = {
    Backlog: [
      {
        id: "own",
        type: "DoR",
        description: "Eigene Ergänzung",
        owner: "Team",
        evidence: "Ticket",
      },
    ],
  };
  api.initialize(d);
  assert.equal(d.flowCriteria.rules.Backlog.criteria.length, 5);
  assert.equal(d.flowCriteria.commonDoD[0].description, "Eigene DoD");
  assert.equal(d.flowCriteria.rules.Analyzing.criteria.length, 0);
  api.ensureTeam(d, "a");
  assert.equal(api.effective(d, "Backlog", "a").common.length, 6);
  const once = JSON.stringify(d);
  api.initialize(d);
  api.ensureTeam(d, "a");
  assert.equal(JSON.stringify(d), once);
});
test("invalid team profile import is rejected before writes", () => {
  const x = boot(),
    b = x.ctx.window.UTGStorage.bundle();
  x.ctx.window.UTGFlowCriteria.ensureTeam(b.v3, "a");
  b.v3.flowCriteria.profiles.a.commonDoD[0].description = 42;
  const before = [...x.store];
  assert.throws(() => x.ctx.window.UTGStorage.restore(b), /Flow-Kriterien/);
  assert.deepEqual([...x.store], before);
});
test("typed criterion drawers save only their category and preserve other criteria and DoD references", () => {
  const api = boot().ctx.window.UTGFlowCriteria;
  let d = api.ensureTeam(base(), "a");
  const before = JSON.stringify(
    d.flowCriteria.profiles.a.rules.Analyzing.criteria.filter(
      (c) => c.type !== "AC",
    ),
  );
  d = api.updateTyped(d, "Analyzing", "a", "AC", []);
  assert.equal(api.typed(d, "Analyzing", "a", "AC").length, 0);
  assert.equal(
    JSON.stringify(d.flowCriteria.profiles.a.rules.Analyzing.criteria),
    before,
  );
  const dodBefore = JSON.stringify(d.flowCriteria.profiles.a.commonDoD);
  d = api.updateTyped(d, "Backlog", "a", "DoR", []);
  assert.equal(d.flowCriteria.profiles.a.rules.Backlog.useDoD, false);
  assert.equal(JSON.stringify(d.flowCriteria.profiles.a.commonDoD), dodBefore);
  d = api.updateTyped(d, "Backlog", "a", "DoD", [], true);
  assert.equal(d.flowCriteria.profiles.a.rules.Backlog.useDoD, false);
  assert.equal(api.typed(d, "Done", "a", "DoD").length, 0);
  assert.equal(api.typed(d, "Done", "b", "DoD").length, 5);
  assert.throws(
    () =>
      api.updateTyped(d, "Analyzing", "a", "AC", [{ id: "bad", type: "DoR" }]),
    /Kriterienart/,
  );
});
function flowUI() {
  const x = boot(),
    bundle = x.ctx.window.UTGStorage.bundle();
  bundle.v2.teams = [
    { id: "a", name: "Team A", assignments: {} },
    { id: "b", name: "Team B", assignments: {} },
  ];
  x.ctx.window.UTGStorage.restore(bundle);
  let phase = 0,
    tid = "a",
    lastDialog;
  const observer = [],
    selector = {
      get value() {
        return "team:" + tid;
      },
      addEventListener(type, fn) {
        this.change = fn;
      },
    };
  const host = {
    panel: null,
    classList: { contains: () => false },
    querySelector(q) {
      if (q === ".flow-criteria-panel") return this.panel;
      if (q === "h3") return { nextSibling: null };
      return this.panel
        ?.querySelectorAll()
        .find((b) => q.includes('"' + b.dataset.editFlow + '"'));
    },
    append(panel) {
      this.panel = panel;
    },
    insertBefore(panel) {
      this.panel = panel;
    },
    firstChild: null,
  };
  const field = () => ({ value: "", focus() {}, setAttribute() {} });
  function panel() {
    const p = {
      className: "",
      innerHTML: "",
      remove() {
        host.panel = null;
      },
    };
    const buttons = ["Phase", "DoD", "DoR", "AC"].map((type) => ({
      dataset: { editFlow: type },
      isConnected: true,
      focus() {
        this.focused = true;
      },
    }));
    p.querySelectorAll = () => buttons;
    return p;
  }
  function dialog() {
    const controls = {
      "#flow-criteria-fields": {
        rows: [],
        innerHTML: "",
        querySelectorAll(q) {
          return q === ".flow-criteria-editor" ? this.rows : [];
        },
      },
      "#flow-add": field(),
      "#flow-save-error": { textContent: "" },
      "#flow-cancel": field(),
      form: {},
    };
    const d = {
      open: false,
      handlers: {},
      set innerHTML(v) {
        this.markup = v;
        if (v.includes('id="flow-use-dod"'))
          controls["#flow-use-dod"] = {
            checked: /id="flow-use-dod" checked/.test(v),
          };
      },
      querySelector(q) {
        return controls[q];
      },
      addEventListener(t, fn) {
        this.handlers[t] = fn;
      },
      showModal() {
        this.open = true;
      },
      close() {
        this.open = false;
        this.handlers.close?.();
      },
      remove() {},
      controls,
    };
    lastDialog = d;
    return d;
  }
  x.ctx.document = {
    getElementById: (id) =>
      id === "utg33detail" ? host : id === "model-view" ? selector : null,
    querySelector: () => ({ dataset: { policy: String(phase) } }),
    createElement: (tag) => (tag === "dialog" ? dialog() : panel()),
    body: { append() {} },
  };
  x.ctx.MutationObserver = class {
    constructor(fn) {
      observer.push(fn);
    }
    observe() {}
  };
  x.ctx.window.UTGRuleDetails = { edit: (open) => open() };
  x.run(script("utg-flow-criteria-ui"));
  return {
    ...x,
    host,
    select(p, t) {
      phase = p;
      tid = t;
      host.panel = null;
      observer[0]();
    },
    open(type) {
      host.panel
        .querySelectorAll()
        .find((b) => b.dataset.editFlow === type)
        .onclick();
      return lastDialog;
    },
    fill(d, item) {
      d.controls["#flow-criteria-fields"].rows = [
        {
          dataset: { id: item.id },
          querySelector: (q) => ({
            value: item[q.match(/data-field="(.*?)"/)[1]] || "",
          }),
        },
      ];
    },
    submit(d) {
      d.controls.form.onsubmit({ preventDefault() {} });
    },
  };
}
test("actual phase DoD DoR and AC buttons open the matching drawer and save independently for all seven phases and both teams", () => {
  const x = flowUI();
  for (const tid of ["a", "b"])
    for (let i = 0; i < 7; i++)
      for (const type of ["Phase", "DoD", "DoR", "AC"]) {
        x.select(i, tid);
        const d = x.open(type);
        assert.equal(d.open, true);
        assert.ok(
          d.markup.includes(
            {
              Phase: "Phasenregeln",
              DoD: "DoD · Ergebnisqualität",
              DoR: "DoR · Umsetzungsstart",
              AC: "Vorlage für Feature-AC",
            }[type] +
              " · " +
              ("Team " +
                tid.toUpperCase() +
                (["Phase", "AC"].includes(type)
                  ? " · " +
                    x.ctx.window.UTGFlow.states[i].replace(/&/g, "&amp;")
                  : "")),
          ),
        );
        const own = {
          id: "own-" + type + "-" + i,
          type: type === "Phase" ? "Eintritt" : type,
          description: tid + " " + type + " " + i,
          owner: "Rolle " + tid,
          evidence: "Nachweis " + tid,
        };
        x.fill(d, own);
        x.submit(d);
        assert.equal(d.open, false);
        const saved = JSON.parse(x.store.get(V3));
        assert.equal(
          x.ctx.window.UTGFlowCriteria.typed(
            saved,
            x.ctx.window.UTGFlow.states[i],
            tid,
            type,
          )[0].description,
          own.description,
        );
        if (tid === "b")
          assert.ok(
            x.ctx.window.UTGFlowCriteria.typed(
              saved,
              x.ctx.window.UTGFlow.states[i],
              "a",
              type,
            )[0].description.startsWith("a "),
          );
      }
});
test("actual criterion drawer retains draft on failure supports retry and cancels without writes", () => {
  const x = flowUI();
  x.select(2, "a");
  const d = x.open("DoR"),
    before = x.store.get(V3),
    own = {
      id: "mine",
      type: "DoR",
      description: "Eigener Entwurf",
      owner: "PO",
      evidence: "Test",
    };
  x.fill(d, own);
  x.fail(true);
  x.submit(d);
  assert.equal(d.open, true);
  assert.equal(x.store.get(V3), before);
  assert.match(
    d.controls["#flow-save-error"].textContent,
    /Speichern fehlgeschlagen/,
  );
  x.fail(false);
  x.submit(d);
  assert.equal(d.open, false);
  const after = x.store.get(V3),
    cancel = x.open("AC");
  x.fill(cancel, { ...own, type: "AC" });
  cancel.controls["#flow-cancel"].onclick();
  assert.equal(x.store.get(V3), after);
});
test("baseline and reset contain canonical DoD DoR AC and remove individual profiles only on explicit reset", () => {
  const x = boot(),
    api = x.ctx.window.UTGFlowCriteria,
    b = x.ctx.window.UTGDefaults.baseline();
  assert.equal(b.v3.flowCriteria.commonDoD.length, 5);
  assert.equal(b.v3.flowCriteria.commonDoR.length, 5);
  assert.equal(
    b.v3.flowCriteria.rules.Analyzing.criteria.filter((c) => c.type === "AC")
      .length,
    4,
  );
  const d = api.updateTyped(b.v3, "Backlog", "a", "DoR", []);
  x.ctx.window.UTGStorage.write(V3, d);
  api.initialize(d);
  assert.equal(api.typed(d, "Backlog", "a", "DoR").length, 0);
  x.ctx.window.UTGDefaults.install();
  const restored = JSON.parse(x.store.get(V3));
  assert.equal(
    JSON.stringify(restored.flowCriteria),
    JSON.stringify(b.v3.flowCriteria),
  );
  restored.flowCriteria.commonDoD[0].description = "Mutated";
  assert.notEqual(
    x.ctx.window.UTGDefaults.baseline().v3.flowCriteria.commonDoD[0]
      .description,
    "Mutated",
  );
});
test("central DoR migration retains variants from every phase and never resurrects deleted criteria", () => {
  const api = boot().ctx.window.UTGFlowCriteria,
    d = api.initialize(base());
  delete d.flowCriteria.commonDoR;
  d.flowCriteria.rules.Funnel.criteria.push({
    id: "same",
    type: "DoR",
    description: "Variante Funnel",
    owner: "PO",
    evidence: "A",
  });
  d.flowCriteria.rules.Backlog.criteria = [
    {
      id: "same",
      type: "DoR",
      description: "Variante Backlog",
      owner: "Team",
      evidence: "B",
    },
  ];
  api.initialize(d);
  assert.equal(d.flowCriteria.commonDoR.length, 2);
  assert.equal(new Set(d.flowCriteria.commonDoR.map((c) => c.id)).size, 2);
  api.ensureTeam(d, "a");
  let changed = api.updateTyped(d, "Funnel", "a", "DoR", []);
  api.initialize(changed);
  api.ensureTeam(changed, "a");
  for (const stage of api.defaults().rules
    ? Object.keys(api.defaults().rules)
    : [])
    assert.equal(api.typed(changed, stage, "a", "DoR").length, 0);
  assert.equal(api.typed(changed, "Done", "b", "DoR").length, 2);
});
test("central DoR and DoD edits are visible from every rule and do not change other teams or AC", () => {
  const api = boot().ctx.window.UTGFlowCriteria;
  let d = api.ensureTeam(base(), "a");
  api.ensureTeam(d, "b");
  const before = JSON.stringify(d.flowCriteria.profiles.b),
    ac = JSON.stringify(api.typed(d, "Analyzing", "a", "AC"));
  for (const type of ["DoR", "DoD"]) {
    const item = {
      id: "custom-" + type,
      type,
      description: "Individuell " + type,
      owner: "PO",
      evidence: "Test",
    };
    d = api.updateTyped(d, "Funnel", "a", type, [item]);
    for (const stage of Object.keys(d.flowCriteria.rules))
      assert.equal(
        api.typed(d, stage, "a", type)[0].description,
        item.description,
      );
  }
  assert.equal(JSON.stringify(d.flowCriteria.profiles.b), before);
  assert.equal(JSON.stringify(api.typed(d, "Analyzing", "a", "AC")), ac);
  assert.ok(!script("utg-flow-criteria-ui").includes("flow-use-dod"));
});
test("phase defaults add only missing catalogs and preserve all custom rule and team values", () => {
  const api = boot().ctx.window.UTGFlowCriteria,
    d = api.ensureTeam(base(), "a");
  delete d.flowCriteria.phaseGates;
  delete d.flowCriteria.profiles.a.phaseGates;
  d.flowCriteria.profiles.a.commonDoR[0].description = "Meine DoR";
  d.policies = [{ name: "Funnel", exit: "Mein Übergang" }];
  const oldRules = JSON.stringify(d.flowCriteria.profiles.a.rules);
  api.initialize(d);
  assert.equal(Object.keys(d.flowCriteria.phaseGates).length, 7);
  for (const stage of Object.keys(d.flowCriteria.phaseGates)) {
    const items = api.typed(d, stage, "a", "Phase");
    assert.ok(items.length >= 2);
    assert.equal(items[0].type, "Eintritt");
    assert.equal(items[1].type, stage === "Done" ? "Abschluss" : "Übergang");
  }
  assert.equal(JSON.stringify(d.flowCriteria.profiles.a.rules), oldRules);
  assert.equal(d.policies[0].exit, "Mein Übergang");
  assert.equal(d.flowCriteria.profiles.a.commonDoR[0].description, "Meine DoR");
  const once = JSON.stringify(d);
  api.initialize(d);
  assert.equal(JSON.stringify(d), once);
});
test("individual phase criteria survive reload import and deletion; reset restores canonical values", () => {
  const x = boot(),
    api = x.ctx.window.UTGFlowCriteria;
  let d = api.ensureTeam(JSON.parse(x.store.get(V3)), "a");
  const custom = {
    id: "own-phase",
    type: "Übergang",
    description: "Eigene Freigabe",
    owner: "PO",
    evidence: "Ticket",
  };
  d = api.updateTyped(d, "Funnel", "a", "Phase", [custom]);
  d = api.updateTyped(d, "Analyzing", "a", "Phase", []);
  api.initialize(d);
  const b = x.ctx.window.UTGStorage.bundle();
  b.v3 = d;
  x.ctx.window.UTGStorage.restore(JSON.parse(JSON.stringify(b)));
  const restored = JSON.parse(x.store.get(V3));
  assert.equal(
    api.typed(restored, "Funnel", "a", "Phase")[0].description,
    custom.description,
  );
  assert.equal(api.typed(restored, "Analyzing", "a", "Phase").length, 0);
  assert.ok(api.typed(restored, "Funnel", "b", "Phase").length >= 2);
  x.ctx.window.UTGDefaults.install();
  const reset = JSON.parse(x.store.get(V3));
  assert.ok(api.typed(reset, "Funnel", "a", "Phase").length >= 2);
  assert.equal(api.typed(reset, "Done", "a", "DoR").length, 5);
  assert.equal(api.typed(reset, "Funnel", "a", "DoD").length, 5);
});
test("all phase and team edits remain separate through serialization restore and fresh startup", () => {
  const x = boot(),
    api = x.ctx.window.UTGFlowCriteria,
    b = x.ctx.window.UTGStorage.bundle();
  b.v2.teams = [
    { id: "a", name: "A", assignments: {} },
    { id: "b", name: "B", assignments: {} },
  ];
  let d = b.v3;
  for (const tid of ["a", "b"]) {
    for (const stage of x.ctx.window.UTGFlow.states) {
      for (const type of ["Phase", "AC"])
        d = api.updateTyped(d, stage, tid, type, [
          {
            id: tid + "-" + stage + "-" + type,
            type: type === "Phase" ? "Übergang" : "AC",
            description: tid + " / " + stage + " / " + type,
            owner: "Rolle " + tid,
            evidence: "Nachweis " + stage,
          },
        ]);
    }
    for (const type of ["DoD", "DoR"])
      d = api.updateTyped(d, "Funnel", tid, type, [
        {
          id: tid + "-" + type,
          type,
          description: tid + " zentral " + type,
          owner: tid,
          evidence: "Verweis",
        },
      ]);
  }
  d = api.updateTyped(d, "Done", "a", "Phase", []);
  d.policies.forEach((p, i) => {
    p.exit = "Individuelle Regel " + i;
    p.owner = "Eigene Rolle " + i;
    p.type = "Schnittstelle";
  });
  b.v3 = d;
  x.ctx.window.UTGStorage.restore(JSON.parse(JSON.stringify(b)));
  const exported = JSON.parse(JSON.stringify(x.ctx.window.UTGStorage.bundle())),
    y = boot({ [V2]: exported.v2, [V3]: exported.v3 });
  const restored = JSON.parse(y.store.get(V3));
  y.ctx.window.UTGFlowCriteria.initialize(restored);
  assert.equal(
    JSON.stringify(restored.flowCriteria),
    JSON.stringify(d.flowCriteria),
  );
  assert.equal(JSON.stringify(restored.policies), JSON.stringify(d.policies));
  for (const stage of x.ctx.window.UTGFlow.states) {
    assert.equal(
      api.typed(restored, stage, "a", "DoD")[0].description,
      "a zentral DoD",
    );
    assert.equal(
      api.typed(restored, stage, "b", "DoR")[0].description,
      "b zentral DoR",
    );
    assert.equal(
      api.typed(restored, stage, "b", "AC")[0].description,
      "b / " + stage + " / AC",
    );
  }
  assert.equal(api.typed(restored, "Done", "a", "Phase").length, 0);
});
test("criteria controls distinguish phase rules and shared catalogue contexts", () => {
  const x = flowUI();
  for (let i = 0; i < 7; i++) {
    x.select(i, "a");
    const markup = x.host.panel.innerHTML;
    for (const term of [
      "Für diese Phase",
      "Über alle Phasen",
      "DoD · Ergebnisqualität",
      "DoR · Umsetzungsstart",
      "Phasenregeln",
      "flow-catalog-context",
    ])
      assert.ok(markup.includes(term));
    assert.ok(
      markup.includes(
        x.ctx.window.UTGFlowStandard.context(
          x.ctx.window.UTGFlow.states[i],
          "DoD",
        ),
      ),
    );
  }
  assert.ok(script("utg-policy-editor-3144").includes("'Abschluss'"));
});
test("Done uses Abschluss in defaults and only unchanged old defaults migrate once", () => {
  const x = boot(),
    api = x.ctx.window.UTGFlowCriteria,
    b = x.ctx.window.UTGDefaults.baseline();
  assert.equal(b.v3.policies.find((p) => p.name === "Done").type, "Abschluss");
  assert.ok(
    b.v3.policies
      .filter((p) => p.name !== "Done")
      .every((p) => p.type === "Übergang"),
  );
  const old = {
    name: "Done",
    type: "Ausführung",
    id: "FP-7",
    exit: "Vereinbarte Done-Kriterien erfüllt; Wirkungsmessung erfolgt nachgelagert",
    wip: "",
    scope: "ART",
    owner: "ART / zuständige Rollen",
    interface: "",
  };
  for (const custom of [
    {},
    { exit: "Eigener Abschluss" },
    { type: "Schnittstelle" },
    { owner: "Meine Rolle" },
  ]) {
    const d = { ...base(), policies: [{ ...old, ...custom }] };
    api.initialize(d);
    assert.equal(
      d.policies[0].type,
      Object.keys(custom).length ? custom.type || "Ausführung" : "Abschluss",
    );
    d.policies[0].type = "Ausführung";
    api.initialize(d);
    assert.equal(d.policies[0].type, "Ausführung");
  }
  assert.ok(script("utg-policy-editor-3144").includes("'Abschluss'"));
});
test("all default activities have no proposed service while existing assignments survive loading", () => {
  const x = boot(),
    defaults = x.ctx.window.UTGDefaults.baseline();
  assert.equal(defaults.v3.activities.length, 32);
  assert.ok(defaults.v3.activities.every((a) => a.service === ""));
  const d = base(),
    y = boot({ [V3]: d, [V2]: { teams: [] } });
  assert.equal(JSON.parse(y.store.get(V3)).activities[0].service, "s1");
  assert.equal(
    JSON.parse(y.store.get(V3)).configs["t::flow"].entries.Test.service,
    "s1",
  );
  x.ctx.window.UTGDefaults.install();
  assert.ok(
    JSON.parse(x.store.get(V3)).activities.every((a) => a.service === ""),
  );
});
function reviewFixture() {
  const x = boot(),
    b = x.ctx.window.UTGDefaults.baseline();
  b.v2.teams = [
    { id: "a", name: "Alpha", assignments: {} },
    { id: "b", name: "Beta", assignments: {} },
  ];
  b.v3.products = [{ id: "p", name: "Produkt" }];
  Object.assign(b.v3.flowGovernance, {
    status: "Vereinbart",
    wip: "2 Features",
    sle: "85% in 10 Tagen",
    decisionRole: "ART Lead",
    evidence: "Testvereinbarung",
  });
  for (const t of b.v2.teams)
    x.ctx.window.UTGFlowCriteria.ensureTeam(b.v3, t.id);
  return {
    ...x,
    b,
    review: () => x.ctx.window.UTGOperatingModelReview.validate(b.v2, b.v3),
  };
}
test("complete reference and two team profiles pass review without changing any data", () => {
  const x = reviewFixture(),
    before = JSON.stringify(x.b);
  assert.equal(x.review().length, 0);
  assert.equal(JSON.stringify(x.b), before);
});
test("review checks missing and duplicate policies for each of seven states", () => {
  for (let i = 0; i < 7; i++) {
    const x = reviewFixture(),
      stage = x.ctx.window.UTGFlow.states[i];
    x.b.v3.policies = x.b.v3.policies.filter((p) => p.name !== stage);
    assert.ok(x.review().includes(stage + " · Flow-Regel fehlt."));
    const policy = { name: stage, type: "Übergang", exit: "Individuell" };
    x.b.v3.policies.push(policy, { ...policy });
    assert.ok(x.review().includes(stage + " · Flow-Regel mehrfach vorhanden."));
  }
});
test("review detects phase entry and transition gaps independently in every team and every state", () => {
  for (const id of ["a", "b"])
    for (const stage of [
      "Funnel",
      "Analyzing",
      "Backlog",
      "Implementing",
      "Validating",
      "Deploying & Releasing",
      "Done",
    ]) {
      const x = reviewFixture(),
        p = x.b.v3.flowCriteria.profiles[id],
        name = id === "a" ? "Alpha" : "Beta";
      p.phaseGates[stage] = [];
      const before = JSON.stringify(x.b),
        issues = x.review();
      assert.ok(
        issues.includes(
          "Team " + name + " · " + stage + " · Eintrittskriterium fehlt.",
        ),
      );
      assert.ok(
        issues.includes(
          "Team " +
            name +
            " · " +
            stage +
            " · " +
            (stage === "Done"
              ? "Abschlusskriterium fehlt."
              : "Übergangskriterium fehlt."),
        ),
      );
      assert.ok(
        !issues.some((s) =>
          s.includes("Team " + (id === "a" ? "Beta" : "Alpha")),
        ),
      );
      assert.equal(JSON.stringify(x.b), before);
    }
});
test("review covers central DoR DoD and scoped AC plus criterion role evidence and duplicate IDs", () => {
  const x = reviewFixture(),
    p = x.b.v3.flowCriteria.profiles.a;
  p.commonDoR = [];
  p.commonDoD[0].owner = "Noch zu klären";
  p.commonDoD[0].evidence = "";
  p.commonDoD.push({ ...p.commonDoD[0] });
  for (const r of Object.values(p.rules))
    r.criteria = r.criteria.filter((c) => c.type !== "AC");
  const issues = x.review();
  assert.ok(
    issues.some((s) => s.startsWith("Team Alpha · Team-DoR · Keine Kriterien")),
  );
  assert.ok(issues.some((s) => s.includes("Verantwortliche Rolle fehlt")));
  assert.ok(issues.some((s) => s.includes("Erwarteter Nachweis fehlt")));
  assert.ok(issues.some((s) => s.includes("doppelte Kriterien-ID")));
  assert.ok(
    issues.some((s) =>
      s.startsWith("Team Alpha · AC · Keine Akzeptanzkriterien"),
    ),
  );
  assert.ok(!issues.some((s) => s.startsWith("Team Beta")));
});
test("review reports missing templates and profiles without initializing or writing them", () => {
  const x = reviewFixture();
  delete x.b.v3.flowCriteria;
  const before = JSON.stringify(x.b),
    store = [...x.store],
    issues = x.review();
  assert.ok(issues.includes("Standardvorlage · Kriterienkatalog fehlt."));
  assert.ok(issues.includes("Team Alpha · Kriterienkatalog fehlt."));
  assert.equal(JSON.stringify(x.b), before);
  assert.deepEqual([...x.store], store);
});
test("review hints carry exact team phase and drawer targets without parsing display names", () => {
  const x = reviewFixture();
  x.b.v2.teams[0].name = "Team · Spezial";
  const p = x.b.v3.flowCriteria.profiles.a;
  p.commonDoD = [];
  p.commonDoR = [];
  p.phaseGates.Validating = [];
  for (const r of Object.values(p.rules))
    r.criteria = r.criteria.filter((c) => c.type !== "AC");
  const hints = x.ctx.window.UTGOperatingModelReview.validate(
    x.b.v2,
    x.b.v3,
    true,
  );
  for (const type of ["DoD", "DoR", "AC"])
    assert.ok(
      hints.some(
        (h) =>
          h.target.kind === "criteria" &&
          h.target.team === "a" &&
          h.target.type === type,
      ),
    );
  assert.ok(
    hints.some(
      (h) =>
        h.target.stage === "Validating" &&
        h.target.team === "a" &&
        h.target.type === "Phase",
    ),
  );
  assert.ok(hints.every((h) => h.target && h.target.kind));
  const standard = hints.filter((h) => h.target.team === "a");
  assert.ok(standard.every((h) => h.message.includes("Team · Spezial")));
});
test("review navigation selects correct team phase and criterion drawer in all 56 combinations", () => {
  const x = boot(),
    calls = [],
    selector = {
      value: "",
      dispatchEvent() {
        calls.push(["select", this.value]);
      },
    },
    detail = {
      scrollIntoView() {},
      querySelector() {
        return {
          focus() {
            calls.push(["focus"]);
          },
        };
      },
    };
  x.ctx.window.UTGFlowCriteriaUI = {
    open: (...args) => calls.push(["drawer", ...args]),
  };
  x.ctx.window.UTGWorkspace = {
    openService: (id) => calls.push(["service", id]),
  };
  x.ctx.document = {
    querySelectorAll: () =>
      Array.from({ length: 5 }, (_, i) => ({
        click() {
          calls.push(["tab", i]);
        },
      })),
    getElementById: (id) =>
      id === "model-view" ? selector : id === "utg33detail" ? detail : null,
    querySelector: (q) => ({
      click() {
        calls.push(["policy", q.match(/data-policy="(\d+)"/)[1]]);
      },
    }),
  };
  x.run(script("utg-review-navigation"));
  const before = [...x.store];
  for (const team of ["a", "b"])
    for (let i = 0; i < 7; i++)
      for (const type of ["Phase", "DoD", "DoR", "AC"]) {
        calls.length = 0;
        const stage = x.ctx.window.UTGFlow.states[i];
        x.ctx.window.UTGReviewNavigation.open({
          kind: "criteria",
          team,
          stage,
          type,
        });
        assert.deepEqual(calls[0], ["tab", 3]);
        assert.deepEqual(calls[1], ["select", "team:" + team]);
        assert.deepEqual(calls[2], ["policy", String(i)]);
        assert.deepEqual(calls[3], ["drawer", stage, team, type]);
      }
  calls.length = 0;
  x.ctx.window.UTGReviewNavigation.open({ kind: "policy", stage: "Done" });
  assert.deepEqual(calls[1], ["select", "reference"]);
  assert.deepEqual(calls[2], ["policy", "6"]);
  assert.ok(!calls.some((c) => c[0] === "drawer"));
  calls.length = 0;
  x.ctx.window.UTGReviewNavigation.open({ kind: "service", id: "s1" });
  assert.deepEqual(calls, [
    ["tab", 1],
    ["service", "s1"],
  ]);
  assert.deepEqual([...x.store], before);
});
test("embedding migration renames the old standard and its references while preserving custom catalog and assignments", () => {
  const x = boot(),
    m = x.ctx.window.UTGModels,
    d = base();
  d.embeddings = [
    "Im Team integriert",
    "Eigenes Team im ART",
    "Shared Services",
    "Eigene Einbindung",
  ];
  d.services[0].embedding = "Eigenes Team im ART";
  d.configs["t::flow"].entries.Test.embedding = "Eigenes Team im ART";
  d.configs["t::flow"].entries.Legacy.embedding = "Eigene Einbindung";
  const note = d.configs["t::flow"].entries.Test.note;
  m.normalizeEmbeddings(d);
  assert.ok(d.embeddings.includes("Anderes Team im selben ART"));
  assert.ok(!d.embeddings.includes("Eigenes Team im ART"));
  assert.equal(d.services[0].embedding, "Anderes Team im selben ART");
  assert.equal(
    d.configs["t::flow"].entries.Test.embedding,
    "Anderes Team im selben ART",
  );
  assert.equal(
    d.configs["t::flow"].entries.Legacy.embedding,
    "Eigene Einbindung",
  );
  assert.equal(d.configs["t::flow"].entries.Test.note, note);
  const once = JSON.stringify(d);
  m.normalizeEmbeddings(d);
  assert.equal(JSON.stringify(d), once);
  m.renameEmbedding(d, "Anderes Team im selben ART", "Eigenes Team im ART");
  m.normalizeEmbeddings(d);
  assert.ok(d.embeddings.includes("Eigenes Team im ART"));
  assert.equal(m.embeddingKind(d, "Eigenes Team im ART"), "art-team");
});
test("renaming shared embedding retains semantic identity inherited values and independent provider totals", () => {
  const x = boot(),
    m = x.ctx.window.UTGModels,
    d = base();
  d.embeddings = m.embeddings.slice();
  m.normalizeEmbeddings(d);
  m.renameEmbedding(d, "Shared Services", "Geteilte Spezialkompetenz");
  assert.equal(m.embeddingKind(d, "Geteilte Spezialkompetenz"), "shared");
  assert.equal(d.services[0].embedding, "Geteilte Spezialkompetenz");
  assert.equal(
    m.effective(d, { service: "s1", orgSource: "service" }).embedding,
    "Geteilte Spezialkompetenz",
  );
  x.run(script("utg-open-assignments-core"));
  d.configs["t::flow"].entries.Test = { service: "s1", orgSource: "service" };
  const result = x.ctx.window.UTGOpenAssignments.evaluate(
    d,
    { id: "t" },
    "Test",
  );
  assert.equal(result.org, "BIT");
  assert.equal(result.bucket, 3);
  assert.equal(result.isShared, true);
  d.configs["t::flow"].entries.Test.embedding = "Im Team integriert";
  assert.equal(
    x.ctx.window.UTGOpenAssignments.evaluate(d, { id: "t" }, "Test").isShared,
    false,
  );
});
test("embedding semantic metadata survives export import and rejects invalid metadata before writing", () => {
  const x = boot(),
    m = x.ctx.window.UTGModels,
    b = x.ctx.window.UTGStorage.bundle();
  m.renameEmbedding(b.v3, "Shared Services", "Spezialistenpool");
  x.ctx.window.UTGStorage.restore(JSON.parse(JSON.stringify(b)));
  let exported = JSON.parse(JSON.stringify(x.ctx.window.UTGStorage.bundle()));
  assert.equal(m.embeddingKind(exported.v3, "Spezialistenpool"), "shared");
  const y = boot({ [V3]: exported.v3, [V2]: exported.v2 });
  assert.equal(
    y.ctx.window.UTGModels.embeddingKind(
      JSON.parse(y.store.get(V3)),
      "Spezialistenpool",
    ),
    "shared",
  );
  exported.v3.embeddingKinds.Spezialistenpool = "invalid";
  const before = [...x.store];
  assert.throws(
    () => x.ctx.window.UTGStorage.restore(exported),
    /Kennungen der Einbindung/,
  );
  assert.deepEqual([...x.store], before);
});
test("service rows render all cells and refresh values without duplicating edit actions", () => {
  const source = html.slice(
      html.indexOf("function serviceRows(){"),
      html.indexOf("function editService(index)"),
    ),
    opened = [];
  const rows = Array.from({ length: 5 }, (_, i) => {
    const sources = Array.from({ length: 4 }, (_, k) =>
      k === 0
        ? { tagName: "INPUT", value: "Service " + i }
        : {
            tagName: "SELECT",
            value: "v",
            selectedOptions: [{ textContent: "Wert " + i + " " + k }],
          },
    );
    const cells = sources.map((field) => ({
      children: [],
      querySelector: (q) =>
        q === "input,select"
          ? field
          : cells[sources.indexOf(field)].children.find(
              (c) => c.className === "app-service-value",
            ),
      append(node) {
        this.children.push(node);
      },
    }));
    const actions = [],
      classes = new Set();
    return {
      cells,
      sources,
      actions,
      classes,
      classList: {
        toggle(k, v) {
          if (v) classes.add(k);
          else classes.delete(k);
        },
      },
      dataset: { i: String(i) },
      querySelector: () =>
        actions.find((b) => b.className === "app-edit-service"),
      querySelectorAll: () => cells,
      lastElementChild: {
        prepend(button) {
          actions.unshift(button);
        },
      },
    };
  });
  const c = {
    services: { rows },
    document: { createElement: () => ({}) },
    editService: (i) => opened.push(i),
  };
  vm.runInNewContext(source + ";serviceRows();serviceRows()", c);
  rows.forEach((row, i) => {
    assert.equal(row.actions.length, 1);
    assert.equal(row.actions[0].textContent, "Bearbeiten");
    assert.ok(row.classes.has("app-service-ready"));
    for (const cell of row.cells) {
      assert.equal(cell.children.length, 1);
      assert.ok(cell.children[0].textContent);
    }
    row.actions[0].onclick();
    assert.equal(opened[i], String(i));
  });
  rows[4].sources[0].value = "Geänderter Service";
  rows[4].sources[1].selectedOptions = [{ textContent: "Neuer Anbieter" }];
  vm.runInNewContext("serviceRows()", c);
  assert.equal(rows[4].cells[0].children[0].textContent, "Geänderter Service");
  assert.equal(rows[4].cells[1].children[0].textContent, "Neuer Anbieter");
  rows[4].cells[2].querySelector = () => null;
  vm.runInNewContext("serviceRows()", c);
  assert.equal(rows[4].classes.has("app-service-ready"), false);
  assert.ok(
    html.includes("#v3servicerows tr.app-service-ready td[data-f]>input"),
  );
});
test("all catalog lists render immediate accessible icons and route edit actions to the correct catalog", () => {
  const x = boot(),
    model = x.ctx.window.UTGModels;
  let data = model.migrate(base());
  data.providers = ["ART", "BIT & Partner"];
  data.embeddings = model.embeddings.slice();
  data.interactions = model.interactions.slice();
  const hosts = {},
    editors = [];
  class Element {
    constructor(tag) {
      this.tagName = tag;
      this.children = [];
      this.dataset = {};
      this.attrs = {};
    }
    append(...nodes) {
      this.children.push(...nodes);
    }
    replaceChildren() {
      this.children = [];
    }
    setAttribute(k, v) {
      this.attrs[k] = v;
    }
  }
  for (const id of ["utg-providers", "utg-embeddings", "utg-interactions"])
    hosts[id] = new Element("div");
  const ctx = {
    document: {
      getElementById: (id) => hosts[id],
      createElement: (tag) => new Element(tag),
    },
    read: () => structuredClone(data),
    save: (d) => {
      data = d;
    },
    defaults: {
      providers: [],
      embeddings: model.embeddings,
      interactions: model.interactions,
    },
    list: (type) => data[type],
    window: {
      UTGModels: model,
      UTGDialogs: { editName: (options) => editors.push(options) },
    },
    confirm: () => false,
  };
  const start = html.indexOf(
      "function draw(){for(const [type,id] of [['providers','utg-providers']",
    ),
    end = html.indexOf("function createCatalogEntry", start);
  vm.runInNewContext(html.slice(start, end) + ";draw()", ctx);
  for (const [type, id] of [
    ["providers", "utg-providers"],
    ["embeddings", "utg-embeddings"],
    ["interactions", "utg-interactions"],
  ]) {
    assert.equal(hosts[id].children.length, data[type].length);
    hosts[id].children.forEach((row, i) => {
      assert.equal(row.children[0].textContent, data[type][i]);
      for (const action of row.children.slice(1)) {
        assert.ok(action.innerHTML.includes("<svg"));
        assert.ok(action.attrs["aria-label"].includes(data[type][i]));
        assert.ok(action.title.includes(data[type][i]));
      }
      row.children[1].onclick();
      assert.equal(editors.at(-1).value, data[type][i]);
      const before = JSON.stringify(data);
      row.children[2].onclick();
      assert.equal(JSON.stringify(data), before);
    });
  }
  const shared = hosts["utg-embeddings"].children.find(
    (row) => row.children[0].textContent === "Shared Services",
  );
  shared.children[1].onclick();
  editors.at(-1).submit("Geteilter Pool");
  assert.ok(data.embeddings.includes("Geteilter Pool"));
  assert.equal(data.services[0].embedding, "Geteilter Pool");
  assert.equal(model.embeddingKind(data, "Geteilter Pool"), "shared");
  data.providers = [];
  vm.runInNewContext("draw()", ctx);
  assert.equal(
    hosts["utg-providers"].children[0].textContent,
    "Noch keine Einträge.",
  );
});
test("service and activity filters preserve rows and recover after rerender and clearing the search", () => {
  const source = html.slice(
    html.indexOf("function searchable(host,selector,title){"),
    html.indexOf("searchable($('crud-teams')"),
  );
  let mutation;
  const controls = [];
  function element(tag) {
    const e = {
      tagName: tag.toUpperCase(),
      children: [],
      listeners: {},
      value: "",
      append(...nodes) {
        this.children.push(...nodes);
      },
      setAttribute() {},
      addEventListener(t, fn) {
        this.listeners[t] = fn;
      },
    };
    controls.push(e);
    return e;
  }
  const rows = [
      { textContent: "Integration-Tests BIT", querySelectorAll: () => [] },
      { textContent: "Deployment ISCeco", querySelectorAll: () => [] },
    ],
    host = {
      before() {},
      after() {},
      querySelectorAll: () => rows,
      addEventListener() {},
    };
  const c = {
    document: { createElement: element },
    MutationObserver: class {
      constructor(fn) {
        mutation = fn;
      }
      observe() {}
    },
  };
  vm.runInNewContext(source + ";searchable(host,'tr','Services')", {
    ...c,
    host,
  });
  const input = controls.find((e) => e.tagName === "INPUT"),
    count = controls.find((e) => e.className === "app-result-count");
  input.value = "deployment";
  input.listeners.input();
  assert.equal(rows[0].hidden, true);
  assert.equal(rows[1].hidden, false);
  assert.equal(count.textContent, "1 / 2");
  rows.splice(0, 2, {
    textContent: "Geänderter Service BIT",
    querySelectorAll: () => [],
  });
  mutation();
  assert.equal(count.textContent, "0 / 1");
  input.value = "";
  input.listeners.input();
  assert.equal(rows[0].hidden, false);
  assert.equal(count.textContent, "1 / 1");
});
test("matrix renders all default activities as complete ten-cell rows without touching action styles", () => {
  const x = boot(),
    data = x.ctx.window.UTGDefaults.baseline().v3;
  data.team = "t";
  data.product = "p";
  data.products = [{ id: "p", name: "P" }];
  data.configs = { "t::flow": { status: "Entwurf", entries: {} } };
  const A = data.activities.map((a) => [a.phase, a.name]),
    nodes = {
      v3team: {},
      v3product: {},
      v3status: { dataset: {} },
      v3rows: { querySelectorAll: () => [] },
    },
    esc = (value) =>
      String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/"/g, "&quot;");
  const c = {
    structuredClone,
    d: data,
    A,
    K: V3,
    window: {
      UTGStorage: { rawGet: () => null },
      UTGModels: x.ctx.window.UTGModels,
    },
    console,
    $: (id) => nodes[id],
    teams: () => [{ id: "t", name: "T", productIds: ["p"] }],
    assignedProducts: () => data.products,
    refreshActivities() {},
    ensure() {},
    cfg: () => data.configs["t::flow"],
    esc,
    orgOptions: () => ["ART", "BIT", "Noch zu klären"],
    dimensionOptions: () => ["Im Team integriert", "Servicebezug"],
    options: (values, current) =>
      values
        .map(
          (value) =>
            '<option value="' +
            esc(value) +
            '" ' +
            (value === current ? "selected" : "") +
            ">" +
            esc(value) +
            "</option>",
        )
        .join(""),
    proposedEntry: () => ({ org: "Noch zu klären", service: "" }),
    old: () => ({}),
  };
  const start = html.indexOf("function renderMatrix(requestedTeam){"),
    end = html.indexOf("window.addEventListener('utg:pending-updated'", start);
  vm.runInNewContext(html.slice(start, end) + ";renderMatrix()", c);
  const rows = [
    ...nodes.v3rows.innerHTML.matchAll(/<tr data-i="\d+">([\s\S]*?)<\/tr>/g),
  ];
  assert.equal(rows.length, 32);
  rows.forEach(([_, row], i) => {
    assert.equal((row.match(/<td(?: |>)/g) || []).length, 10);
    assert.ok(row.includes(esc(A[i][1])));
    assert.ok(!row.includes("utg-catalog-icon-action"));
  });
});
test("about dialog opens and closes in all five register contexts including Escape with focus restored and no data changes", () => {
  const x = boot(),
    before = [...x.store],
    created = [];
  const version = {
      className: "app-version",
      textContent: "v3.14.8",
      remove() {
        this.removed = true;
      },
    },
    title = {
      querySelector: () => version,
      append(node) {
        this.meta = node;
      },
    };
  function element(tag) {
    const controls = {},
      events = {},
      e = {
        events,
        tagName: tag,
        attrs: {},
        open: false,
        children: [],
        append(node) {
          this.children.push(node);
        },
        setAttribute(k, v) {
          this.attrs[k] = v;
        },
        querySelector(q) {
          return (controls[q] ??= {
            focus() {
              this.focused = true;
            },
          });
        },
        addEventListener(t, fn) {
          events[t] = fn;
        },
        showModal() {
          this.open = true;
        },
        close() {
          this.open = false;
          events.close?.();
        },
        focus() {
          this.focused = true;
        },
      };
    created.push(e);
    return e;
  }
  x.ctx.document = {
    querySelector: () => title,
    createElement: element,
    body: { append() {} },
  };
  x.run(script("utg-about-window"));
  const trigger = created[0],
    meta = created[1],
    dialog = created[2];
  assert.equal(title.meta, meta);
  assert.equal(meta.className, "app-header-meta");
  assert.equal(meta.children[0], trigger);
  assert.equal(meta.children.length, 1);
  assert.equal(version.removed, true);
  assert.equal(trigger.textContent, "v3.14.8");
  assert.equal(trigger.title, "Über diese App und Change-log");
  assert.equal(trigger.attrs["aria-haspopup"], "dialog");
  assert.ok(
    dialog.innerHTML.includes(
      process.env.UTG_EXPECT_STAGE === "RC3"
        ? "v3.16 (RC3) – Technische Überarbeitung"
        : process.env.UTG_EXPECT_STAGE === "RC2"
          ? "v3.16 · RC2 – Verbesserungen gegenüber v3.15"
          : "v3.15.5 · 6. November 2026",
    ),
  );
  assert.ok(
    dialog.innerHTML.includes(
      ["RC3", "RC2"].includes(process.env.UTG_EXPECT_STAGE)
        ? "Zusammenarbeit klären. Gemeinsam liefern."
        : "Flow-Regeln gestalten:",
    ),
  );
  assert.ok(!dialog.className?.includes("app-drawer"));
  trigger.onclick();
  assert.equal(dialog.open, true);
  assert.equal(dialog.querySelector(".app-about-close").focused, true);
  dialog.querySelector("#utg-about-dismiss").onclick();
  assert.equal(dialog.open, false);
  assert.equal(trigger.focused, true);
  trigger.onclick();
  dialog.querySelector(".app-about-close").onclick();
  assert.equal(dialog.open, false);
  for (let register = 0; register < 5; register++) {
    for (const mode of ["dismiss", "close", "escape"]) {
      trigger.onclick();
      assert.equal(dialog.open, true);
      assert.equal(dialog.querySelector(".app-about-close").focused, true);
      if (mode === "escape") {
        let prevented = false;
        dialog.events.cancel({
          preventDefault() {
            prevented = true;
          },
        });
        assert.equal(prevented, true);
      } else
        dialog
          .querySelector(
            mode === "dismiss" ? "#utg-about-dismiss" : ".app-about-close",
          )
          .onclick();
      assert.equal(dialog.open, false);
      assert.equal(trigger.focused, true);
    }
  }
  assert.equal(created.length, 3);
  assert.deepEqual([...x.store], before);
});
test("about window box rules override generic important modal padding width and radius", () => {
  const rules = [];
  for (const block of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/g))
    for (const rule of block[1].matchAll(/([^{}]+)\{([^{}]*)\}/g))
      for (const selector of rule[1].split(",").map((s) => s.trim()))
        if (["dialog", "#utg-about-dialog"].includes(selector))
          rules.push({ selector, body: rule[2] });
  function winning(property) {
    let best;
    for (const [index, rule] of rules.entries())
      for (const declaration of rule.body.split(";")) {
        const colon = declaration.indexOf(":");
        if (declaration.slice(0, colon).trim() !== property) continue;
        const raw = declaration.slice(colon + 1),
          weight =
            (raw.includes("!important") ? 1000 : 0) +
            (rule.selector.startsWith("#") ? 100 : 1);
        if (
          !best ||
          weight > best.weight ||
          (weight === best.weight && index >= best.index)
        )
          best = { weight, index, value: raw.replace("!important", "").trim() };
      }
    return best.value;
  }
  assert.ok(
    rules.some(
      (r) =>
        r.selector === "dialog" &&
        r.body.includes("background:var(--surface)") &&
        r.body.includes("color-scheme:light"),
    ),
  );
  assert.equal(winning("padding"), "0");
  assert.equal(winning("max-width"), "calc(100vw - 32px)");
  assert.equal(winning("border-radius"), "var(--radius)");
});
test("first start and defaults stay independent", () => {
  const b = boot(),
    a = b.ctx.window.UTGDefaults.baseline();
  a.v3.services[0].name = "Changed";
  assert.notEqual(
    b.ctx.window.UTGDefaults.baseline().v3.services[0].name,
    "Changed",
  );
  assert.equal(JSON.parse(b.store.get(V3)).schema, 3);
});
test("F1 deleted default stays deleted through repeated startup migration", () => {
  const b = boot(),
    d = JSON.parse(b.store.get(V3));
  d.activities.splice(0, 1);
  b.store.set(V3, JSON.stringify(d));
  b.run(migration);
  b.run(migration);
  assert.equal(
    JSON.parse(b.store.get(V3)).activities.some((a) => a.id === "activity-01"),
    false,
  );
});
test("F1 deleted custom activity stays deleted", () => {
  const d = base();
  d.activities = [];
  const b = boot({ [V3]: d, [V2]: { teams: [] } });
  b.run(migration);
  assert.equal(JSON.parse(b.store.get(V3)).activities.length, 0);
});
test("F1 legacy split migrates once and retains archive", () => {
  const d = base();
  d.modelVersion = "3.10.0";
  d.activities = [{ id: "old", name: "Code-Review / Continuous Integration" }];
  d.services[0].capacity = "2 days";
  d.services[0].criteria = "Done";
  const b = boot({ [V3]: d, [V2]: { teams: [] } });
  b.run(migration);
  let saved = JSON.parse(b.store.get(V3));
  assert.ok(saved.activities.some((a) => a.name === "Continuous Integration"));
  assert.equal(saved.legacyArchive.retiredServiceFields.s1.capacity, "2 days");
  saved.activities = saved.activities.filter(
    (a) => a.name !== "Continuous Integration",
  );
  b.store.set(V3, JSON.stringify(saved));
  b.run(migration);
  assert.equal(
    JSON.parse(b.store.get(V3)).activities.some(
      (a) => a.name === "Continuous Integration",
    ),
    false,
  );
});
const b = boot(),
  api = b.ctx.window.UTGServiceData;
test("F2 duplicate names rejected case-insensitively without mutating source", () => {
  const d = base(),
    before = JSON.stringify(d);
  assert.throws(() => api.update(d, "s1", { name: " beta " }), /bereits/);
  assert.equal(JSON.stringify(d), before);
});
test("F2 empty name rejected", () =>
  assert.throws(() => api.update(base(), "s1", { name: "  " }), /Namen/));
test("F2 rename preserves ID references and updates legacy name references", () => {
  const d = api.update(base(), "s1", { name: "Gamma" });
  assert.equal(d.activities[0].service, "s1");
  assert.equal(d.activities[1].service, "s1");
  assert.equal(d.configs["t::flow"].entries.Test.service, "s1");
  assert.equal(d.configs["t::flow"].entries.Legacy.service, "s1");
  assert.equal(d.configs["t::flow"].entries.Test.note, "keep");
});
test("F3 failed service commit keeps persisted and input data untouched", () => {
  const x = boot({ [V3]: base(), [V2]: { teams: [] } }),
    before = x.store.get(V3),
    input = JSON.parse(before);
  x.fail(true);
  assert.throws(
    () =>
      x.ctx.window.UTGServiceData.commit(
        x.ctx.window.UTGServiceData.update(input, "s1", { name: "Gamma" }),
      ),
    /Quota/,
  );
  assert.equal(x.store.get(V3), before);
  assert.equal(input.services[0].name, "Alpha");
  assert.equal(x.events.at(-1).detail.ok, false);
});
test("F3 successful service edit commits all fields in one config write", () => {
  const x = boot({ [V3]: base(), [V2]: { teams: [] } });
  x.events.length = 0;
  const next = x.ctx.window.UTGServiceData.update(base(), "s1", {
    name: "Gamma",
    provider: "ISCeco",
    interaction: "Befähigung",
  });
  x.ctx.window.UTGServiceData.commit(next);
  const saved = JSON.parse(x.store.get(V3));
  assert.equal(saved.services[0].name, "Gamma");
  assert.equal(saved.configs["t::flow"].entries.Test.org, "BIT");
  assert.equal(
    x.events.filter((e) => e.type === "utg:storage-status" && e.detail.ok)
      .length,
    1,
  );
});
test("targeted matrix writes propagate storage failures without mutating the input", () => {
  const x = boot({
    [V3]: base(),
    [V2]: { teams: [{ id: "t", name: "T", assignments: {} }] },
  });
  x.run(script("utg-flow-ux-core"));
  x.run(script("utg-matrix-transactions-315"));
  const before = x.store.get(V3),
    d = JSON.parse(before),
    entry = structuredClone(d.configs["t::flow"].entries.Test);
  x.fail(true);
  assert.throws(
    () =>
      x.ctx.window.UTGMatrix.saveField(
        "t",
        "Test",
        "business",
        "Neue Rolle",
        entry,
        d.configs["t::flow"],
      ),
    /Quota/,
  );
  assert.equal(x.store.get(V3), before);
  assert.equal(d.configs["t::flow"].entries.Test.business, "PO");
});
test("F5 deletion clears ID and name references, preserving other values", () => {
  const input = base(),
    before = JSON.stringify(input),
    refs = api.references(input, input.services[0]);
  assert.equal(refs.activities.length, 2);
  assert.equal(refs.flows.length, 2);
  const next = api.remove(input, "s1");
  assert.equal(next.services.length, 1);
  for (const a of next.activities) assert.equal(a.service, "");
  for (const e of Object.values(next.configs["t::flow"].entries))
    assert.equal(e.service, "");
  assert.equal(next.configs["t::flow"].entries.Test.business, "PO");
  assert.equal(JSON.stringify(input), before);
});
// Load the real interface evaluator without constructing its UI.
const reviewBlock = blocks.find((b) =>
  b.code.includes("window.UTGInterfaceReview="),
).code;
b.run(reviewBlock);
const review = b.ctx.window.UTGInterfaceReview;
test("service inheritance respects explicit team overrides and placeholders", () => {
  const service = base().services[0];
  assert.equal(review.evaluate(service, {}).embedding, true);
  assert.equal(
    review.evaluate(service, { embedding: "Noch zu klären" }).embedding,
    false,
  );
  assert.equal(
    review.evaluate(service, { interaction: "Nicht erforderlich" }).interaction,
    true,
  );
});
test("F4 absent and explicitly open activities both count as open execution", () => {
  const start = html.indexOf("const rows=activeTeams.map(team=>"),
    end = html.indexOf(
      "for(const issue of window.UTGMethodValidation.validate(d))",
      start,
    );
  const context = {
    activeTeams: [{ id: "t", name: "Team" }],
    d: {
      configs: {
        "t::flow": {
          entries: {
            Explicit: { org: "Noch zu klären" },
            Assigned: { org: "BIT" },
          },
        },
      },
    },
    acts: [{ name: "Missing" }, { name: "Explicit" }, { name: "Assigned" }],
    services: [],
    valid: review.valid,
    window: { UTGInterfaceReview: review, UTGModels: b.ctx.window.UTGModels },
  };
  vm.runInNewContext(
    html.slice(start, end) + ";globalThis.result=rows",
    context,
  );
  assert.equal(context.result[0].org, 2);
  assert.equal(context.result[0].assigned, 2);
});
test("F6 service action invokes drawer API directly before any observer callback", () => {
  let opened, activated;
  const service = { dataset: { reviewService: "s1" } };
  const code = html.slice(
    html.indexOf(
      "panel.addEventListener('click',event=>{const service=event.target.closest('[data-review-service]')",
    ),
    html.indexOf(
      "window.addEventListener('gever-v3-updated',render);window.addEventListener('utg-catalog-changed',render);document.querySelectorAll('#utg-nav button').forEach(b=>b.addEventListener('click',render));render();",
      html.indexOf(
        "panel.addEventListener('click',event=>{const service=event.target.closest('[data-review-service]')",
      ),
    ),
  );
  const context = {
    panel: {
      addEventListener: (_, fn) =>
        fn({
          target: {
            closest: (selector) =>
              selector === "[data-review-service]" ? service : null,
          },
        }),
    },
    document: {
      querySelectorAll: () => [{}, { click: () => (activated = true) }],
    },
    read: () => base(),
    KEY: V3,
    window: { UTGWorkspace: { openService: (id) => (opened = id) } },
  };
  vm.runInNewContext(code, context);
  assert.equal(activated, true);
  assert.equal(opened, "s1");
});
test("JSON bundle round-trip preserves edits, deleted defaults and team contracts", () => {
  const x = boot({ [V3]: base(), [V2]: { teams: [] } });
  const next = api.update(base(), "s1", { name: "Gamma" });
  next.teamContracts = { t: { business: "PO" } };
  x.ctx.window.UTGServiceData.commit(next);
  const bundle = JSON.parse(JSON.stringify(x.ctx.window.UTGStorage.bundle()));
  const y = boot();
  y.ctx.window.UTGStorage.restore(bundle);
  assert.equal(y.store.get(V3), x.store.get(V3));
  y.run(migration);
  assert.equal(JSON.parse(y.store.get(V3)).activities.length, 2);
  assert.equal(JSON.parse(y.store.get(V3)).teamContracts.t.business, "PO");
});
test("F3 actual service drawer stays open on error and saves successfully on retry", () => {
  const x = boot({ [V3]: base(), [V2]: { teams: [] } });
  let closed = 0,
    toasts = 0;
  const start = html.indexOf(
      "form.onsubmit=e=>{e.preventDefault();try{const current=window.UTGStorage.read('gever-art-v3-config')",
    ),
    end = html.indexOf(";dialog.append(form)", start);
  assert.ok(start >= 0 && end > start);
  x.ctx.form = {};
  x.ctx.fields = [
    { key: "name", input: { value: "Gamma" } },
    { key: "provider", input: { value: "BIT" } },
  ];
  x.ctx.index = "0";
  x.ctx.serviceId = "s1";
  x.ctx.dialog = { close: () => closed++ };
  x.ctx.toast = () => toasts++;
  x.ctx.error = { hidden: true };
  x.run(html.slice(start, end));
  x.fail(true);
  x.ctx.form.onsubmit({ preventDefault() {} });
  assert.equal(closed, 0);
  assert.equal(toasts, 0);
  assert.equal(x.ctx.error.hidden, false);
  assert.equal(x.ctx.fields[0].input.value, "Gamma");
  assert.equal(JSON.parse(x.store.get(V3)).services[0].name, "Alpha");
  x.fail(false);
  x.ctx.form.onsubmit({ preventDefault() {} });
  assert.equal(closed, 1);
  assert.equal(toasts, 0);
  assert.equal(JSON.parse(x.store.get(V3)).services[0].name, "Gamma");
});
test("F5 delete confirmation counts both reference types", () =>
  assert.ok(
    html.includes(
      "refs.flows.length+' Leistungszuordnungen und '+refs.activities.length+' Tätigkeitsvorschläge",
    ),
  ));
test("activity description drawer preserves multiline free text and cancels without saving", () => {
  class Element {
    constructor(tag) {
      this.tag = tag;
      this.children = [];
      this.events = {};
      this.value = "";
      this.isConnected = true;
    }
    setAttribute() {}
    append(...nodes) {
      this.children.push(...nodes);
    }
    addEventListener(type, fn) {
      this.events[type] = fn;
    }
    showModal() {
      this.open = true;
    }
    close() {
      this.open = false;
      this.events.close?.();
    }
    remove() {}
    focus() {}
    setCustomValidity() {}
    reportValidity() {}
  }
  const context = {
    window: { UTGDialogs: {} },
    document: {
      activeElement: new Element("button"),
      body: new Element("body"),
      createElement: (tag) => new Element(tag),
    },
  };
  const start = html.indexOf("window.UTGDialogs.editName=function"),
    end = html.indexOf("(function(){'use strict';\nconst V2=", start);
  vm.runInNewContext(statement(html, start), context);
  let saved;
  const drawer = context.window.UTGDialogs.editName({
    title: "Tätigkeit bearbeiten",
    value: "Analyse",
    description: "Bisherige Beschreibung",
    submit: (name, description) => {
      saved = { name, description };
    },
  });
  const form = drawer.children[0],
    textarea = form.children.find((child) => child.tag === "textarea");
  assert.equal(textarea.value, "Bisherige Beschreibung");
  textarea.value =
    'Aufgaben präzisieren.\n\nErgebnis: <Entscheid> & "Nachweis"';
  form.events.submit({ preventDefault() {} });
  assert.equal(saved.name, "Analyse");
  assert.equal(saved.description, textarea.value);
  saved = undefined;
  const cancelled = context.window.UTGDialogs.editName({
    title: "Erstellen",
    description: "",
    submit: () => {
      saved = true;
    },
  });
  const buttons = cancelled.children[0].children.at(-1);
  buttons.children[1].onclick();
  assert.equal(saved, undefined);
  const legacy = context.window.UTGDialogs.editName({
    title: "Leistungserbringer",
    submit() {},
  });
  assert.equal(
    legacy.children[0].children.some((child) => child.tag === "textarea"),
    false,
  );
});
test("activity descriptions survive JSON restore and startup migration unchanged", () => {
  const data = base(),
    description =
      "Analyse: Aufgaben und Abgrenzung.\n\nKeine Freigabe <automatisch>.";
  data.activities[0].description = description;
  const x = boot({ [V3]: data, [V2]: { teams: [] } }),
    bundle = JSON.parse(JSON.stringify(x.ctx.window.UTGStorage.bundle())),
    y = boot();
  y.ctx.window.UTGStorage.restore(bundle);
  y.run(migration);
  assert.equal(
    JSON.parse(y.store.get(V3)).activities[0].description,
    description,
  );
  assert.ok(/item\d*\.description=description/.test(html));
  assert.ok(html.includes("esc(item.description)"));
  assert.ok(html.includes("description:item.description||''"));
});
const design = boot().ctx.window.UTGDesignCriteria;
test("design criteria seed nine defaults once and preserve deliberately empty catalogs", () => {
  const data = design.initialize({});
  assert.equal(data.designCriteria.length, 9);
  const first = data.designCriteria[0].name;
  data.designCriteria = [];
  design.initialize(data);
  assert.equal(data.designCriteria.length, 0);
  assert.equal(design.initialize({}).designCriteria[0].name, first);
});
test("design criteria can be added and renamed without losing team assessments", () => {
  let data = design.upsert(
    {},
    undefined,
    "Eigene Vorgabe",
    "Mehrzeilig\n<Beispiel>",
  );
  const id = data.designCriteria.at(-1).id;
  data = design.assess(data, "t1", id, "Teilweise erfüllt", "Lücke: Betrieb");
  data = design.upsert(data, id, "Neue Bezeichnung", "Neue Beschreibung");
  assert.equal(data.teamDesignAssessments.t1[id].note, "Lücke: Betrieb");
  assert.equal(data.designCriteria.at(-1).description, "Neue Beschreibung");
  assert.throws(
    () => design.upsert(data, undefined, " neue bezeichnung ", "Text"),
    /existiert/,
  );
});
test("design assessments are independent per team and criterion", () => {
  let data = design.initialize({});
  const [a, b] = data.designCriteria;
  data = design.assess(data, "t1", a.id, "Erfüllt", "Alle Kompetenzen");
  data = design.assess(data, "t2", a.id, "Nicht erfüllt", "Test fehlt");
  data = design.assess(data, "t1", b.id, "Nicht anwendbar", "Begründung");
  assert.equal(data.teamDesignAssessments.t1[a.id].status, "Erfüllt");
  assert.equal(data.teamDesignAssessments.t2[a.id].status, "Nicht erfüllt");
  assert.equal(data.teamDesignAssessments.t1[b.id].status, "Nicht anwendbar");
  assert.throws(
    () => design.assess(data, "t1", a.id, "Ungültig", ""),
    /Erfüllungsgrad/,
  );
});
test("deleting a design criterion removes its assessments and does not restore defaults", () => {
  let data = design.initialize({});
  const id = data.designCriteria[0].id;
  data = design.assess(data, "t1", id, "Erfüllt", "Text");
  data = design.assess(data, "t2", id, "Nicht beurteilt", "Offen");
  const next = design.remove(data, id);
  assert.equal(next.designCriteria.length, 8);
  assert.equal(next.teamDesignAssessments.t1[id], undefined);
  assert.equal(next.teamDesignAssessments.t2[id], undefined);
  assert.equal(design.initialize(next).designCriteria.length, 8);
  assert.equal(data.designCriteria.length, 9);
});
test("design criteria and team assessments survive export, import and reset", () => {
  const x = boot(),
    data = JSON.parse(x.store.get(V3));
  const id = data.designCriteria[0].id;
  const next = design.assess(
    design.upsert(data, id, "Angepasst", "Eigene Beschreibung"),
    "t1",
    id,
    "Teilweise erfüllt",
    "Nächste Schritte\nTesten",
  );
  x.ctx.window.UTGStorage.write(V3, next);
  const bundle = JSON.parse(JSON.stringify(x.ctx.window.UTGStorage.bundle())),
    y = boot();
  y.ctx.window.UTGStorage.restore(bundle);
  y.run(migration);
  const restored = JSON.parse(y.store.get(V3));
  assert.equal(restored.designCriteria[0].name, "Angepasst");
  assert.equal(
    restored.teamDesignAssessments.t1[id].note,
    "Nächste Schritte\nTesten",
  );
  y.ctx.window.UTGDefaults.install();
  const reset = JSON.parse(y.store.get(V3));
  assert.equal(reset.designCriteria.length, 9);
  assert.equal(Object.keys(reset.teamDesignAssessments).length, 0);
});
test("import rejects malformed criteria and assessment values before writing", () => {
  const x = boot(),
    before = x.store.get(V3),
    bundle = JSON.parse(JSON.stringify(x.ctx.window.UTGStorage.bundle()));
  bundle.v3.designCriteria = [{ id: "a", name: "Test" }];
  assert.throws(
    () => x.ctx.window.UTGStorage.restore(bundle),
    /Design-Kriterien/,
  );
  assert.equal(x.store.get(V3), before);
  bundle.v3.designCriteria = [];
  bundle.v3.teamDesignAssessments = {
    t: { a: { status: "Fake", note: "Text" } },
  };
  assert.throws(
    () => x.ctx.window.UTGStorage.restore(bundle),
    /Design-Beurteilung/,
  );
  assert.equal(x.store.get(V3), before);
});
test("each team gets independent criterion descriptions and checkbox values", () => {
  let data = design.ensureTeams({}, [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
  ]);
  assert.equal(data.teamDesignCriteria.a.length, 9);
  assert.equal(data.teamDesignCriteria.b.length, 9);
  const id = data.teamDesignCriteria.a[0].id;
  data = design.teamEdit(data, "a", id, "Individuell A", "Nur für Team A");
  data = design.teamCheck(data, "a", id, true);
  assert.equal(data.teamDesignCriteria.a[0].fulfilled, true);
  assert.equal(data.teamDesignCriteria.b[0].fulfilled, false);
  assert.notEqual(data.teamDesignCriteria.b[0].description, "Nur für Team A");
  assert.notEqual(data.teamDesignCriteria.b[0].name, "Individuell A");
});
test("team-specific add and delete leave other teams intact and do not restore deleted items", () => {
  let data = design.ensureTeams({}, [{ id: "a" }, { id: "b" }]);
  const id = data.teamDesignCriteria.a[0].id;
  data = design.teamRemove(data, "a", id);
  design.ensureTeams(data, [{ id: "a" }, { id: "b" }]);
  assert.equal(data.teamDesignCriteria.a.length, 8);
  assert.equal(data.teamDesignCriteria.b.length, 9);
  data = design.teamEdit(data, "a", undefined, "Eigenes Kriterium", "Text");
  assert.equal(data.teamDesignCriteria.a.length, 9);
  assert.equal(
    data.teamDesignCriteria.b.some((c) => c.name === "Eigenes Kriterium"),
    false,
  );
});
test("existing assessments migrate once; new teams receive all nine defaults", () => {
  let data = design.initialize({});
  const id = data.designCriteria[0].id;
  data = design.assess(data, "a", id, "Erfüllt", "Begründung behalten");
  data = design.ensureTeams(data, [{ id: "a" }]);
  assert.equal(data.teamDesignCriteria.a[0].fulfilled, true);
  assert.equal(data.teamDesignCriteria.a[0].note, "Begründung behalten");
  data = design.teamCheck(data, "a", id, false);
  design.ensureTeams(data, [{ id: "a" }]);
  assert.equal(data.teamDesignCriteria.a[0].fulfilled, false);
  data.designCriteria = [];
  design.ensureTeams(data, [{ id: "a" }, { id: "new" }], true);
  assert.equal(data.teamDesignCriteria.new.length, 9);
});
test("overall view separates fulfilled and unfulfilled criteria using individual team labels", () => {
  const teams = [
    { id: "a", name: "A" },
    { id: "b", name: "B" },
  ];
  let data = design.ensureTeams({}, teams);
  const id = data.teamDesignCriteria.a[0].id;
  data = design.teamEdit(data, "a", id, "A-Kriterium", "A-Text");
  data = design.teamCheck(data, "a", id, true);
  const summary = design.teamSummary(data, teams);
  assert.equal(summary[0].fulfilled.length, 1);
  assert.equal(summary[0].fulfilled[0].name, "A-Kriterium");
  assert.equal(summary[0].unassessed.length, 8);
  assert.equal(summary[1].fulfilled.length, 0);
  assert.equal(summary[1].unassessed.length, 9);
  data = design.teamCheck(data, "a", id, false);
  assert.equal(design.teamSummary(data, teams)[0].unfulfilled.length, 1);
});
test("team-specific criteria survive JSON round-trip; malformed checkboxes are rejected", () => {
  const x = boot(),
    data = design.ensureTeams(JSON.parse(x.store.get(V3)), [{ id: "a" }]);
  const id = data.teamDesignCriteria.a[0].id;
  const next = design.teamCheck(
    design.teamEdit(data, "a", id, "Angepasst", "Freitext\nZeile 2"),
    "a",
    id,
    true,
  );
  x.ctx.window.UTGStorage.write(V3, next);
  const bundle = JSON.parse(JSON.stringify(x.ctx.window.UTGStorage.bundle())),
    y = boot();
  y.ctx.window.UTGStorage.restore(bundle);
  const saved = JSON.parse(y.store.get(V3));
  assert.equal(saved.teamDesignCriteria.a[0].name, "Angepasst");
  assert.equal(saved.teamDesignCriteria.a[0].fulfilled, true);
  bundle.v3.teamDesignCriteria.a[0].fulfilled = "yes";
  assert.throws(
    () => y.ctx.window.UTGStorage.restore(bundle),
    /Team-Design-Kriterien/,
  );
});
test("shared description previews expand only overflowing or multiline text and keep accessible toggle state", () => {
  const nodes = [];
  function preview(text, width, scroll) {
    const classes = new Set(),
      attrs = {};
    const button = {
      hidden: true,
      setAttribute: (key, value) => (attrs[key] = value),
      closest: () => node,
    };
    const node = {
      isConnected: true,
      clientWidth: width,
      classList: {
        contains: (key) => classes.has(key),
        toggle(key) {
          if (classes.has(key)) {
            classes.delete(key);
            return false;
          }
          classes.add(key);
          return true;
        },
      },
      querySelector: (selector) =>
        selector === ".app-description-text"
          ? { scrollWidth: scroll, textContent: text }
          : button,
    };
    nodes.push(node);
    return { node, button, attrs };
  }
  const short = preview("Kurzer Text", 200, 80),
    long = preview("Langer Text", 200, 350),
    multiline = preview("Zeile 1\nZeile 2", 200, 100);
  const listeners = {};
  const context = {
    document: {
      querySelectorAll: () => [
        {
          querySelectorAll: () => nodes,
          addEventListener: (type, fn) => (listeners[type] = fn),
        },
      ],
    },
    window: { addEventListener() {} },
    ResizeObserver: class {
      observe() {}
      unobserve() {}
    },
    MutationObserver: class {
      observe() {}
    },
  };
  vm.runInNewContext(script("utg-activity-description-preview"), context);
  assert.equal(short.button.hidden, true);
  assert.equal(long.button.hidden, false);
  assert.equal(multiline.button.hidden, false);
  listeners.click({ target: { closest: () => long.button } });
  assert.equal(long.attrs["aria-expanded"], "true");
  assert.equal(long.attrs["aria-label"], "Beschreibung zuklappen");
  listeners.click({ target: { closest: () => long.button } });
  assert.equal(long.attrs["aria-expanded"], "false");
  assert.equal(long.attrs["aria-label"], "Beschreibung aufklappen");
});
test("import rejects malformed nested data and duplicate service names before touching storage", () => {
  for (const mutate of [
    (b) => b.v3.services.push({ ...b.v3.services[0], id: "another" }),
    (b) => (b.v3.configs = { bad: { entries: { Task: null } } }),
    (b) => (b.v3.activities[0].additionalPhases = "bad"),
    (b) => (b.v3.teamContracts = { t: null }),
    (b) => (b.version = 999),
  ]) {
    const x = boot(),
      before = x.store.get(V3),
      bundle = JSON.parse(JSON.stringify(x.ctx.window.UTGStorage.bundle()));
    mutate(bundle);
    assert.throws(() => x.ctx.window.UTGStorage.restore(bundle));
    assert.equal(x.store.get(V3), before);
  }
});
test("import rolls back every successful prior write after later write failure", () => {
  const x = boot(),
    before = [...x.store],
    bundle = JSON.parse(JSON.stringify(x.ctx.window.UTGStorage.bundle()));
  bundle.v3.services[0].name = "Changed";
  bundle.v2.teams = [{ id: "new", name: "New", assignments: {} }];
  const original = x.ctx.localStorage.setItem;
  let failed = false;
  x.ctx.localStorage.setItem = (key, value) => {
    if (key === V2 && !failed) {
      failed = true;
      throw Error("Quota");
    }
    original(key, value);
  };
  assert.throws(
    () => x.ctx.window.UTGStorage.restore(bundle),
    /wiederhergestellt/,
  );
  assert.deepEqual([...x.store], before);
});
test("rollback restores a previously absent key by removing it", () => {
  const x = boot(),
    bundle = JSON.parse(JSON.stringify(x.ctx.window.UTGStorage.bundle()));
  x.store.delete(V3);
  bundle.v2.teams = [{ id: "new", name: "New", assignments: {} }];
  const original = x.ctx.localStorage.setItem;
  x.ctx.localStorage.setItem = (key, value) => {
    if (key === V2) throw Error("Denied");
    original(key, value);
  };
  assert.throws(
    () => x.ctx.window.UTGStorage.restore(bundle),
    /wiederhergestellt/,
  );
  assert.equal(x.store.has(V3), false);
});
test("legacy team assignments are normalized without changing imported user data", () => {
  const x = boot(),
    bundle = JSON.parse(JSON.stringify(x.ctx.window.UTGStorage.bundle()));
  bundle.v2.teams = [{ id: "new", name: "New" }];
  x.ctx.window.UTGStorage.restore(bundle);
  assert.equal(JSON.parse(x.store.get(V2)).teams[0].name, "New");
  assert.equal(
    typeof JSON.parse(x.store.get(V2)).teams[0].assignments,
    "object",
  );
  assert.equal(bundle.v2.teams[0].assignments, undefined);
});
test("description toggles work in all five preview areas including flow criteria after resize and view rerender", () => {
  const hosts = [],
    records = [],
    mutations = [],
    resizes = [];
  function record() {
    const classes = new Set(),
      attrs = {},
      text = { textContent: "Langer Text", scrollWidth: 300 };
    const button = {
      hidden: true,
      setAttribute: (key, value) => (attrs[key] = value),
    };
    const container = {
      isConnected: true,
      clientWidth: 150,
      classList: {
        contains: (key) => classes.has(key),
        toggle(key) {
          if (classes.has(key)) {
            classes.delete(key);
            return false;
          }
          classes.add(key);
          return true;
        },
      },
      querySelector: (selector) =>
        selector === ".app-description-text" ? text : button,
    };
    button.closest = () => container;
    return { container, button, attrs, text };
  }
  for (let i = 0; i < 5; i++) {
    const state = { record: record(), listeners: {} };
    records.push(state);
    hosts.push({
      querySelectorAll: () => [state.record.container],
      addEventListener: (type, fn) => (state.listeners[type] = fn),
    });
  }
  const context = {
    document: {
      querySelectorAll: (selector) => {
        assert.ok(
          selector.includes("#crud-products") &&
            selector.includes("#utg-design-overview-rows") &&
            selector.includes("#model-content"),
        );
        return hosts;
      },
    },
    window: { addEventListener() {} },
    ResizeObserver: class {
      constructor(fn) {
        resizes.push(fn);
      }
      observe() {}
      unobserve() {}
    },
    MutationObserver: class {
      constructor(fn) {
        mutations.push(fn);
      }
      observe() {}
    },
  };
  vm.runInNewContext(script("utg-activity-description-preview"), context);
  records.forEach((state, index) => {
    assert.equal(state.record.button.hidden, false);
    const click = () =>
      state.listeners.click({ target: { closest: () => state.record.button } });
    click();
    assert.equal(state.record.attrs["aria-expanded"], "true");
    assert.equal(state.record.button.textContent, "−");
    click();
    assert.equal(state.record.attrs["aria-expanded"], "false");
    assert.equal(state.record.button.textContent, "+");
    state.record.container.clientWidth = 500;
    resizes[index]();
    assert.equal(state.record.button.hidden, true);
    state.record.container.isConnected = false;
    state.record = record();
    mutations[index]();
    assert.equal(state.record.button.hidden, false);
    click();
    assert.equal(state.record.attrs["aria-expanded"], "true");
  });
  assert.ok(html.includes("font-size:0!important"));
  assert.ok(html.includes("transform:translate(-50%,-50%)"));
});
test("precise activity copy upgrades only untouched defaults and preserves individual descriptions", () => {
  const x = boot(),
    model = x.ctx.window.UTGModels;
  const data = {
    activities: [
      {
        id: "activity-01",
        name: "Bedarfserfassung",
        description: "Bedarfserfassung",
      },
      { id: "activity-11", name: "Entwicklung", description: "Eigener Text" },
      { id: "activity-12", name: "Konfigurationsmanagement", description: "" },
      { id: "activity-13", name: "Eigener Name", description: "Unit-Tests" },
    ],
    services: [],
    configs: {},
  };
  model.migrate(data);
  assert.match(data.activities[0].description, /erwarteten Nutzen/);
  assert.equal(data.activities[1].description, "Eigener Text");
  assert.equal(data.activities[2].description, "");
  assert.equal(data.activities[3].description, "Unit-Tests");
  const once = JSON.stringify(data);
  model.migrate(data);
  assert.equal(JSON.stringify(data), once);
  assert.equal(x.ctx.window.UTGDefaults.baseline().v3.activities.length, 32);
});
test("selected release is consistent in title, header, exported metadata and file name", () => {
  const x = boot(),
    version = process.env.UTG_EXPECT_VERSION || "3.15.5",
    stage = process.env.UTG_EXPECT_STAGE || "",
    display = "v" + version + (stage ? " (" + stage + ")" : ""),
    suffix = version + (stage ? "_" + stage : "");
  assert.equal(x.ctx.window.UTGVersion, version);
  assert.equal(x.ctx.window.UTGStorage.bundle().appVersion, version);
  assert.equal(x.ctx.window.UTGStorage.bundle().releaseStage, stage);
  assert.equal(
    x.ctx.window.UTGDefaults.baseline().v3.operatingModelVersion,
    version,
  );
  assert.ok(
    html.includes(
      "<title>ART &amp; Leistungserbringer | Operating Model · " +
        display +
        "</title>",
    ),
  );
  assert.ok(html.includes('class="app-version">' + display + "</span>"));
  assert.ok(html.includes("UTG-LE_Konfiguration_v" + suffix + ".json"));
});
test("updated default companion phases preserve existing individual mappings", () => {
  const x = boot(),
    defaults = x.ctx.window.UTGDefaults.baseline().v3.activities;
  assert.equal(
    JSON.stringify(
      defaults.find((a) => a.id === "activity-21").additionalPhases,
    ),
    JSON.stringify(["Implementing", "Validating"]),
  );
  assert.equal(
    JSON.stringify(
      defaults.find((a) => a.id === "activity-12").additionalPhases,
    ),
    JSON.stringify(["Validating", "Deploying & Releasing"]),
  );
  const data = x.ctx.window.UTGDefaults.baseline().v3;
  data.activities.find((a) => a.id === "activity-21").additionalPhases = [
    "Implementing",
  ];
  data.activities.find((a) => a.id === "activity-12").additionalPhases = [];
  const y = boot({ [V3]: data, [V2]: { teams: [] } });
  const methodMigration = blocks.find((b) =>
    b.code.includes(
      "const reference=new Map(base.activities.map(a=>[a.id,a]))",
    ),
  ).code;
  y.run(methodMigration);
  y.run(migration);
  const saved = JSON.parse(y.store.get(V3));
  assert.equal(
    JSON.stringify(
      saved.activities.find((a) => a.id === "activity-21").additionalPhases,
    ),
    JSON.stringify(["Implementing"]),
  );
  assert.equal(
    saved.activities.find((a) => a.id === "activity-12").additionalPhases
      .length,
    0,
  );
});
test("activity scope refinements migrate default text and rollback references without changing phases", () => {
  const x = boot(),
    data = x.ctx.window.UTGDefaults.baseline().v3;
  const rollback = data.activities.find((a) => a.id === "activity-32");
  rollback.name = "Rollback-Vorbereitung und -Prüfung";
  rollback.description =
    "Ein geprüfter Rückfallplan ermöglicht die Rückkehr zu einem definierten Stand bei fehlgeschlagener Bereitstellung.";
  data.configs = {
    "t::flow": {
      entries: { [rollback.name]: { org: "BIT", note: "Erhalten" } },
    },
  };
  const phases = JSON.stringify(
    data.activities.map((a) => [a.id, a.phase, a.additionalPhases]),
  );
  x.ctx.window.UTGModels.migrate(data);
  assert.equal(rollback.name, "Rollback-Bereitschaft prüfen");
  assert.match(rollback.description, /Software- und Konfigurationsstand/);
  assert.equal(data.configs["t::flow"].entries[rollback.name].note, "Erhalten");
  assert.equal(
    data.configs["t::flow"].entries["Rollback-Vorbereitung und -Prüfung"],
    undefined,
  );
  assert.equal(
    JSON.stringify(
      data.activities.map((a) => [a.id, a.phase, a.additionalPhases]),
    ),
    phases,
  );
  const once = JSON.stringify(data);
  x.ctx.window.UTGModels.migrate(data);
  assert.equal(JSON.stringify(data), once);
});
test("scope refinements preserve individual descriptions, names and conflicting matrix entries", () => {
  const x = boot(),
    data = x.ctx.window.UTGDefaults.baseline().v3;
  const a = data.activities.find((a) => a.id === "activity-23");
  a.description = "Meine Betriebsübergabe";
  const r = data.activities.find((a) => a.id === "activity-32");
  r.name = "Eigener Rollback";
  r.description = "Individueller Text";
  x.ctx.window.UTGModels.migrate(data);
  assert.equal(a.description, "Meine Betriebsübergabe");
  assert.equal(r.name, "Eigener Rollback");
  assert.equal(r.description, "Individueller Text");
  r.name = "Rollback-Vorbereitung und -Prüfung";
  data.configs = {
    "t::flow": {
      entries: {
        [r.name]: { note: "Alt" },
        "Rollback-Bereitschaft prüfen": { note: "Separat" },
      },
    },
  };
  x.ctx.window.UTGModels.migrate(data);
  assert.equal(r.name, "Rollback-Vorbereitung und -Prüfung");
  assert.equal(
    data.configs["t::flow"].entries["Rollback-Bereitschaft prüfen"].note,
    "Separat",
  );
  assert.equal(data.configs["t::flow"].entries[r.name].note, "Alt");
});
test("current and marked configurations preserve every old combined name during complete loading", () => {
  for (const provenance of [
    { modelVersion: "3.14.8" },
    { operatingModelVersion: "3.11.0" },
    { modelVersion: "3.10.0", migrations: { activityCatalog3110: true } },
    {},
  ]) {
    const d = base();
    Object.assign(d, provenance);
    d.activities = [
      {
        id: "own1",
        name: "Code-Review / Continuous Integration",
        description: "Mein Text",
        phase: "Validating",
        additionalPhases: [],
      },
      {
        id: "own2",
        name: "Deployment / technische Integration",
        description: "Eigener Umfang",
        phase: "Implementing",
        additionalPhases: ["Validating"],
      },
      {
        id: "own3",
        name: "Betriebsübergabe / Rollback",
        description: "",
        phase: "Deploying & Releasing",
        additionalPhases: [],
      },
    ];
    const expected = JSON.stringify(d.activities);
    const x = boot({ [V3]: d, [V2]: { teams: [] } });
    x.run(migration);
    const once = JSON.parse(x.store.get(V3));
    assert.equal(JSON.stringify(once.activities), expected);
    const y = boot({ [V3]: once, [V2]: { teams: [] } });
    y.run(migration);
    assert.equal(
      JSON.stringify(JSON.parse(y.store.get(V3)).activities),
      expected,
    );
  }
});
test("confirmed legacy combined names migrate once with references and correct new phases", () => {
  const d = base();
  d.modelVersion = "3.10.0";
  d.activities = [
    {
      id: "old",
      name: "Deployment / technische Integration",
      phase: "Deploying & Releasing",
      additionalPhases: ["Implementing"],
      description: "Alter Text",
    },
  ];
  d.configs = {
    "t::flow": {
      entries: {
        "Deployment / technische Integration": { org: "BIT", note: "Erhalten" },
      },
    },
  };
  const x = boot({ [V3]: d, [V2]: { teams: [] } });
  const saved = JSON.parse(x.store.get(V3));
  assert.equal(saved.activities[0].name, "Deployment");
  assert.equal(saved.activities[1].name, "Technische Integration");
  assert.equal(saved.activities[1].phase, "Implementing");
  assert.equal(saved.activities[1].additionalPhases.length, 0);
  assert.equal(
    saved.configs["t::flow"].entries["Technische Integration"].note,
    "Erhalten",
  );
  saved.activities[0].name = "Deployment / technische Integration";
  const y = boot({ [V3]: saved, [V2]: { teams: [] } });
  y.run(migration);
  assert.equal(
    JSON.parse(y.store.get(V3)).activities[0].name,
    "Deployment / technische Integration",
  );
});
test("legacy splitting preserves colliding names and existing separate entries", () => {
  const d = base();
  d.modelVersion = "3.10.0";
  d.activities = [
    { id: "old", name: "Code-Review / Continuous Integration" },
    { id: "own", name: "Code-Review" },
  ];
  d.configs = {
    "t::flow": {
      entries: {
        "Code-Review / Continuous Integration": { note: "Sammel" },
        "Code-Review": { note: "Individuell" },
      },
    },
  };
  const x = boot({ [V3]: d, [V2]: { teams: [] } }),
    saved = JSON.parse(x.store.get(V3));
  assert.equal(
    saved.activities[0].name,
    "Code-Review / Continuous Integration",
  );
  assert.equal(
    saved.configs["t::flow"].entries["Code-Review"].note,
    "Individuell",
  );
  assert.equal(
    saved.configs["t::flow"].entries["Code-Review / Continuous Integration"]
      .note,
    "Sammel",
  );
});
test("service execution inherits only when explicitly requested; old overrides survive provider changes", () => {
  const x = boot(),
    model = x.ctx.window.UTGModels;
  const data = base();
  data.configs["t::flow"].entries.Test.org = "ART";
  data.configs["t::flow"].entries.Inherited = {
    service: "s1",
    org: "",
    orgSource: "service",
  };
  model.normalizeServiceReferences(data);
  assert.equal(data.configs["t::flow"].entries.Test.orgSource, "explicit");
  const updated = x.ctx.window.UTGServiceData.update(data, "s1", {
    provider: "ISCeco",
  });
  assert.equal(
    model.effective(updated, updated.configs["t::flow"].entries.Test).org,
    "ART",
  );
  assert.equal(
    model.effective(updated, updated.configs["t::flow"].entries.Inherited).org,
    "ISCeco",
  );
  updated.configs["t::flow"].entries.Test.orgSource = "service";
  assert.equal(
    model.effective(updated, updated.configs["t::flow"].entries.Test).org,
    "ISCeco",
  );
});
test("ID and unique legacy-name references resolve identically across dimensions and normalize idempotently", () => {
  const x = boot(),
    model = x.ctx.window.UTGModels,
    data = base();
  for (const reference of ["Alpha", "s1"]) {
    const result = model.effective(data, {
      service: reference,
      orgSource: "service",
    });
    assert.equal(result.org, "BIT");
    assert.equal(result.embedding, "Shared Services");
    assert.equal(result.interaction, "Servicebezug");
  }
  model.normalizeServiceReferences(data);
  assert.equal(data.activities[1].service, "s1");
  assert.equal(data.configs["t::flow"].entries.Test.service, "s1");
  const once = JSON.stringify(data);
  model.normalizeServiceReferences(data);
  assert.equal(JSON.stringify(data), once);
});
test("ambiguous and unknown service references are preserved and exposed for clarification", () => {
  const x = boot(),
    model = x.ctx.window.UTGModels,
    data = base();
  data.services.push({ id: "s3", name: "s1", provider: "Other" });
  data.configs["t::flow"].entries.Test.service = "s1";
  data.activities[0].service = "missing";
  model.normalizeServiceReferences(data);
  assert.equal(model.resolveService(data, "s1"), null);
  assert.equal(data.configs["t::flow"].entries.Test.service, "s1");
  assert.equal(data.activities[0].service, "missing");
  assert.match(
    model.serviceOptions(data, "s1").find((o) => o.value === "s1").label,
    /Ungeklärter Bezug/,
  );
  const options = model.serviceOptions(data, "missing");
  assert.equal(options.at(-1).value, "missing");
  assert.match(options.at(-1).label, /Ungeklärter Bezug/);
});
test("shared pair transaction restores both old stores and can be retried without mutation", () => {
  const x = boot(),
    before = [...x.store],
    v2 = {
      teams: [{ id: "t", name: "Team", assignments: {}, productIds: ["p"] }],
    },
    v3 = base();
  v3.products = [{ id: "p", name: "Product" }];
  const input = JSON.stringify([v2, v3]),
    write = x.ctx.localStorage.setItem;
  let fail = true;
  x.ctx.localStorage.setItem = (key, value) => {
    if (key === V2 && fail) {
      fail = false;
      throw Error("Quota");
    }
    write(key, value);
  };
  assert.throws(
    () => x.ctx.window.UTGStorage.commitPair(v2, v3),
    /wiederhergestellt/,
  );
  assert.deepEqual([...x.store], before);
  assert.equal(JSON.stringify([v2, v3]), input);
  x.ctx.window.UTGStorage.commitPair(v2, v3);
  assert.equal(JSON.parse(x.store.get(V2)).teams[0].productIds[0], "p");
  assert.equal(
    JSON.parse(x.store.get(V3)).configs["t::flow"].entries.Test.service,
    "s1",
  );
});
test("product assignment drawer stays open after transaction failure and closes after successful retry", () => {
  const x = boot();
  let closed = 0,
    reloaded = 0,
    handler;
  const message = { textContent: "" };
  const v2 = {
      teams: [{ id: "t", name: "T", assignments: {}, productIds: [] }],
    },
    v3 = base();
  v3.products = [{ id: "p", name: "P" }];
  x.ctx.selectedTeam = "t";
  x.ctx.V2 = V2;
  x.ctx.V3 = V3;
  x.ctx.read = (key) => structuredClone(key === V2 ? v2 : v3);
  x.ctx.dialog = {
    querySelector: (selector) =>
      selector === "form"
        ? { addEventListener: (_, fn) => (handler = fn) }
        : message,
    querySelectorAll: () => [{ value: "p" }],
    close: () => closed++,
  };
  x.ctx.location = { reload: () => reloaded++ };
  x.ctx.alert = (message) => {
    throw Error(message);
  };
  const start = html.indexOf(
      "dialog.querySelector('form').addEventListener('submit',event=>{",
    ),
    end = html.indexOf(
      '})();</script><script id="utg-service-live-sync',
      start,
    );
  x.run(statement(html, start));
  x.fail(true);
  handler({ submitter: { value: "save" }, preventDefault() {} });
  assert.equal(closed, 0);
  assert.equal(reloaded, 0);
  assert.ok(message.textContent);
  x.fail(false);
  handler({ submitter: { value: "save" }, preventDefault() {} });
  assert.equal(closed, 1);
  assert.equal(reloaded, 1);
});
test("inherited execution is used by ART aggregation and method validation", () => {
  const x = boot(),
    data = base();
  data.configs["t::flow"].entries.Test = {
    service: "s1",
    org: "",
    orgSource: "service",
  };
  x.run(script("utg-open-assignments-core"));
  x.run(script("utg-shared-method-validation"));
  const result = x.ctx.window.UTGOpenAssignments.evaluate(
    data,
    { id: "t" },
    "Test",
  );
  assert.equal(result.org, "BIT");
  const issues = x.ctx.window.UTGMethodValidation.validate(data);
  assert.equal(
    issues.some((i) => i.message.includes("Ausführung offen für Test")),
    false,
  );
});
test("ID selections retain service labels after rename and unknown references remain selectable", () => {
  const x = boot(),
    model = x.ctx.window.UTGModels,
    data = x.ctx.window.UTGServiceData.update(base(), "s1", { name: "Gamma" });
  const options = model.serviceOptions(data, "s1");
  assert.equal(options.find((o) => o.value === "s1").label, "Gamma");
  assert.equal(
    options.some((o) => o.value === "Alpha"),
    false,
  );
  assert.equal(
    model.resolveService(data, data.activities[1].service).name,
    "Gamma",
  );
});
test("JSON import preserves explicit and inherited execution while normalizing service references", () => {
  const x = boot(),
    bundle = JSON.parse(JSON.stringify(x.ctx.window.UTGStorage.bundle()));
  bundle.v3 = base();
  bundle.v3.configs["t::flow"].entries.Test.org = "ART";
  bundle.v3.configs["t::flow"].entries.Inherited = {
    service: "Alpha",
    org: "",
    orgSource: "service",
  };
  x.ctx.window.UTGStorage.restore(bundle);
  const data = JSON.parse(x.store.get(V3));
  assert.equal(data.configs["t::flow"].entries.Test.orgSource, "explicit");
  assert.equal(data.configs["t::flow"].entries.Inherited.service, "s1");
  assert.equal(
    x.ctx.window.UTGModels.effective(data, data.configs["t::flow"].entries.Test)
      .org,
    "ART",
  );
  assert.equal(
    x.ctx.window.UTGModels.effective(
      data,
      data.configs["t::flow"].entries.Inherited,
    ).org,
    "BIT",
  );
});
test("real team editor keeps its draft on failure and retry creates exactly one team", () => {
  const x = boot();
  const data = JSON.parse(x.store.get(V3));
  data.products = [{ id: "p", name: "P" }];
  x.store.set(V3, JSON.stringify(data));
  const before = [...x.store];
  let reloaded = 0;
  const message = { textContent: "" };
  const form = {
    querySelector: (selector) =>
      selector === "#crud-name" ? { value: "Neues Team" } : message,
    querySelectorAll: () => [{ value: "p" }],
  };
  Object.assign(x.ctx, {
    drawer: { close() {} },
    form,
    isTeam: true,
    id: undefined,
    V2,
    V3,
    read: (key) => x.ctx.window.UTGStorage.read(key),
    assigned: (team) => team.productIds || [],
    owner: () => null,
    location: { reload: () => reloaded++ },
    alert: (message) => {
      throw Error(message);
    },
  });
  x.ctx.form2 = form;
  const start = Math.max(
    html.indexOf("form.onsubmit=e=>{e.preventDefault();try{const v2=read(V2)"),
    html.indexOf(
      "form2.onsubmit=e=>{e.preventDefault();try{const v22=read(V2)",
    ),
  );
  assert.ok(start > 0);
  x.run(statement(html, start));
  const write = x.ctx.localStorage.setItem;
  let failed = false;
  x.ctx.localStorage.setItem = (key, value) => {
    if (key === V2 && !failed) {
      failed = true;
      throw Error("Quota");
    }
    write(key, value);
  };
  form.onsubmit({ preventDefault() {} });
  assert.equal(reloaded, 0);
  assert.deepEqual([...x.store], before);
  assert.ok(message.textContent);
  form.onsubmit({ preventDefault() {} });
  assert.equal(reloaded, 1);
  assert.equal(JSON.parse(x.store.get(V2)).teams.length, 1);
  assert.equal(JSON.parse(x.store.get(V2)).teams[0].name, "Neues Team");
});
test("real team deletion rolls back every store on failure and succeeds on retry", () => {
  const v2 = {
      teams: [{ id: "t", name: "T", assignments: {}, productIds: ["p"] }],
    },
    v3 = base();
  v3.products = [{ id: "p", name: "P" }];
  const seed = boot().ctx.window;
  seed.UTGFlowCriteria.ensureTeam(v3, "t");
  seed.UTGFlowCriteria.ensureTeam(v3, "other");
  v3.flowCriteria.teams.t = {};
  v3.teamContracts = { t: { business: "PO" }, other: { business: "Other" } };
  const x = boot({ [V2]: v2, [V3]: v3 }),
    before = [...x.store];
  let reloaded = 0;
  const message = {};
  Object.assign(x.ctx, {
    V2,
    V3,
    read: (key) => x.ctx.window.UTGStorage.read(key),
    assigned: (team) => team.productIds || [],
    confirm: () => true,
    location: { reload: () => reloaded++ },
    panel: { querySelector: () => message },
  });
  const start = html.indexOf("function del(type,id){"),
    end = html.indexOf("document.getElementById('crud-add-team')", start);
  x.run(html.slice(start, end));
  const write = x.ctx.localStorage.setItem;
  let failed = false;
  x.ctx.localStorage.setItem = (key, value) => {
    if (key === V2 && !failed) {
      failed = true;
      throw Error("Quota");
    }
    write(key, value);
  };
  x.ctx.del("team", "t");
  assert.equal(reloaded, 0);
  assert.deepEqual([...x.store], before);
  x.ctx.del("team", "t");
  assert.equal(reloaded, 1);
  assert.equal(JSON.parse(x.store.get(V2)).teams.length, 0);
  assert.equal(JSON.parse(x.store.get(V3)).configs["t::flow"], undefined);
  const saved = JSON.parse(x.store.get(V3));
  assert.equal(saved.teamContracts.t, undefined);
  assert.equal(saved.flowCriteria.profiles.t, undefined);
  assert.equal(saved.flowCriteria.teams.t, undefined);
  assert.ok(saved.flowCriteria.profiles.other);
  assert.equal(saved.teamContracts.other.business, "Other");
});
test("matrix renderer shows inherited execution and service labels from IDs", () => {
  const x = boot(),
    data = base();
  data.team = "t";
  data.product = "p";
  data.products = [{ id: "p", name: "P" }];
  data.configs["t::flow"].status = "Entwurf";
  data.configs["t::flow"].entries.Test = {
    service: "s1",
    org: "",
    orgSource: "service",
  };
  const nodes = {
    v3team: {},
    v3product: {},
    v3status: { dataset: {} },
    v3rows: { querySelectorAll: () => [] },
  };
  const c = {
    structuredClone,
    d: data,
    A: [["Analyzing", "Test"]],
    K: V3,
    window: {
      UTGStorage: { rawGet: () => null },
      UTGModels: x.ctx.window.UTGModels,
    },
    console,
    $: (id) => nodes[id],
    teams: () => [{ id: "t", name: "T", productIds: ["p"] }],
    assignedProducts: () => data.products,
    refreshActivities() {},
    ensure() {},
    cfg: () => data.configs["t::flow"],
    esc: (value) => String(value ?? ""),
    orgOptions: () => ["ART", "BIT", "Noch zu klären"],
    dimensionOptions: () => ["Shared Services", "Servicebezug"],
    options: (values, current) =>
      values
        .map(
          (value) =>
            '<option value="' +
            value +
            '" ' +
            (value === current ? "selected" : "") +
            ">" +
            value +
            "</option>",
        )
        .join(""),
  };
  const start = html.indexOf("function renderMatrix(requestedTeam){"),
    end = html.indexOf("window.addEventListener('utg:pending-updated'", start);
  vm.runInNewContext(html.slice(start, end) + ";renderMatrix()", c);
  assert.match(
    nodes.v3rows.innerHTML,
    /<option value="" selected>Servicevorgabe: BIT/,
  );
  assert.match(nodes.v3rows.innerHTML, /<option value="s1" selected>Alpha/);
});
test("v3.13 drawer layout preserves live fields, focus and actions; action icons are idempotent", () => {
  let doc, refresh;
  class Node {
    constructor(tag) {
      this.tagName = tag.toUpperCase();
      this.nodeType = 1;
      this.nodes = [];
      this.dataset = {};
      this.attrs = {};
      this.events = {};
      this._text = "";
      this.classList = {
        add: (...names) => {
          for (const name of names) this.classes.add(name);
        },
        contains: (name) => this.classes.has(name),
      };
      this.classes = new Set();
      this.isConnected = true;
    }
    set className(value) {
      this.classes = new Set(value.split(" "));
    }
    get className() {
      return [...this.classes].join(" ");
    }
    get children() {
      return this.nodes.filter((n) => n.nodeType === 1);
    }
    get childNodes() {
      return this.nodes;
    }
    get nextSibling() {
      if (!this.parentElement) return null;
      const list = this.parentElement.nodes;
      return list[list.indexOf(this) + 1] || null;
    }
    get parentNode() {
      return this.parentElement;
    }
    get textContent() {
      return this._text + this.nodes.map((n) => n.textContent || "").join("");
    }
    set textContent(value) {
      this._text = value;
      this.nodes = [];
    }
    setAttribute(key, value) {
      this.attrs[key] = value;
      if (key === "type") this.type = value;
    }
    hasAttribute(key) {
      return Object.hasOwn(this.attrs, key);
    }
    remove() {
      if (this.parentElement) {
        this.parentElement.nodes = this.parentElement.nodes.filter(
          (n) => n !== this,
        );
        this.parentElement = null;
      }
    }
    append(...nodes) {
      for (let node of nodes) {
        if (typeof node === "string") node = { nodeType: 3, textContent: node };
        if (doc && node.contains?.(doc.activeElement))
          doc.activeElement = doc.body;
        node.remove?.();
        node.parentElement = this;
        this.nodes.push(node);
      }
    }
    prepend(node) {
      node.remove?.();
      node.parentElement = this;
      this.nodes.unshift(node);
    }
    insertBefore(node, next) {
      node.remove?.();
      node.parentElement = this;
      this.nodes.splice(this.nodes.indexOf(next), 0, node);
    }
    contains(node) {
      return (
        this === node || this.children.some((child) => child.contains(node))
      );
    }
    focus() {
      doc.activeElement = this;
    }
    matches(selector) {
      return selector.split(",").some((part) => {
        part = part.trim();
        if (part.startsWith(".")) return this.classes.has(part.slice(1));
        if (part === 'button[type="submit"]')
          return this.tagName === "BUTTON" && this.type === "submit";
        if (part === "dialog") return this.tagName === "DIALOG";
        return this.tagName === part.toUpperCase();
      });
    }
    closest(selector) {
      return this.matches(selector)
        ? this
        : this.parentElement?.closest(selector) || null;
    }
    querySelector(selector) {
      if (selector === ":scope > form")
        return this.children.find((n) => n.tagName === "FORM") || null;
      if (selector === ":scope > .ui-action-icon")
        return (
          this.children.find((n) => n.classes.has("ui-action-icon")) || null
        );
      return this.walk().find((n) => n.matches(selector)) || null;
    }
    walk() {
      return this.children.flatMap((n) => [n, ...n.walk()]);
    }
    addEventListener(type, fn) {
      (this.events[type] ??= []).push(fn);
    }
    close(value) {
      this.returnValue = value;
      for (const fn of this.events.close || []) fn();
    }
  }
  const body = new Node("body");
  doc = {
    body,
    activeElement: null,
    createElement: (tag) => new Node(tag),
    createElementNS: (_, tag) => new Node(tag),
  };
  const drawer = new Node("dialog");
  drawer.className = "app-drawer";
  const form = new Node("form"),
    heading = new Node("h2"),
    field = new Node("input"),
    actions = new Node("div"),
    accept = new Node("button"),
    cancel = new Node("button");
  heading.textContent = "Team erstellen";
  actions.className = "crud-actions";
  accept.type = "submit";
  accept.textContent = "Übernehmen";
  cancel.textContent = "Abbrechen";
  let submitted = 0;
  accept.onclick = () => submitted++;
  actions.append(accept, cancel);
  form.append(heading, field, actions);
  drawer.append(form);
  body.append(drawer);
  doc.activeElement = field;
  const edit = new Node("button");
  edit.textContent = "Bearbeiten";
  body.append(edit);
  const remove = new Node("button");
  remove.textContent = "Löschen";
  body.append(remove);
  const resetAction = new Node("button");
  resetAction.id = "utg-reset-confirm";
  resetAction.textContent = "Standard wiederherstellen";
  body.append(resetAction);
  const rule = new Node("button");
  rule.textContent = "Regel anzeigen";
  rule.setAttribute("data-policy", "0");
  body.append(rule);
  const persistent = new Node("dialog");
  persistent.className = "app-drawer";
  const root = new Node("section"),
    title = new Node("h2"),
    responsibility = new Node("input"),
    dismiss = new Node("button");
  title.textContent = "Verantwortung";
  dismiss.textContent = "Schliessen";
  root.append(title, responsibility);
  persistent.append(root, dismiss);
  body.append(persistent);
  const assignment = new Node("dialog");
  assignment.className = "app-drawer";
  const assignForm = new Node("form"),
    assignTitle = new Node("h2"),
    choices = new Node("div"),
    assignFooter = new Node("div"),
    assignSave = new Node("button");
  assignTitle.textContent = "Produkte zuordnen";
  assignSave.type = "submit";
  assignSave.textContent = "Zuordnungen übernehmen";
  assignFooter.append(assignSave);
  assignForm.append(assignTitle, choices, assignFooter);
  assignment.append(assignForm);
  body.append(assignment);

  doc.querySelectorAll = (selector) => {
    const all = body.walk();
    if (selector === "button,.filebtn")
      return all.filter(
        (n) => n.tagName === "BUTTON" || n.classes.has("filebtn"),
      );
    if (selector === "dialog.app-drawer")
      return [drawer, persistent, assignment];
    if (selector === "dialog.app-drawer .app-save-error") return [];
    throw Error(selector);
  };
  vm.runInNewContext(script("utg-design-interactions-v313"), {
    window: {},
    document: doc,
    MutationObserver: class {
      constructor(fn) {
        refresh = fn;
      }
      observe() {}
    },
  });
  assert.equal(form.querySelector(".ui-drawer-body").contains(field), true);
  assert.equal(form.querySelector(".ui-drawer-footer").contains(accept), true);
  assert.equal(doc.activeElement, field);
  accept.onclick();
  assert.equal(submitted, 1);
  assert.equal(edit.dataset.uiAction, "edit");
  assert.equal(remove.dataset.uiAction, "delete");
  assert.equal(edit.children.length, 1);
  refresh();
  assert.equal(edit.children.length, 1);
  assert.equal(
    form.children.filter((n) => n.classes.has("ui-drawer-header")).length,
    1,
  );
  const close = form.querySelector(".ui-drawer-close");
  assert.equal(close.attrs["aria-label"], "Drawer schliessen");
  close.onclick();
  assert.equal(drawer.returnValue, "cancel");
  assert.equal(resetAction.dataset.uiAction, "reset");
  assert.equal(resetAction.children.length, 1);
  assert.equal(rule.dataset.uiAction, "rule");
  assert.equal(rule.children.length, 1);
  assert.equal(
    assignForm.querySelector(".ui-drawer-footer").contains(assignSave),
    true,
  );
  assert.equal(
    persistent.querySelector(".ui-drawer-header").contains(title),
    true,
  );
  persistent.close("cancel");
  assert.equal(title.parentElement, root);
  assert.equal(root.children[0], title);
});
test("activity description changes preserve every assignment; renames move keys and reject collisions atomically", () => {
  const marker = "submit:(val,description)=>{",
    start = html.indexOf(marker) + "submit:".length,
    end = html.indexOf("write(d);draw()}})", start) + "write(d);draw()}".length;
  assert.ok(start > 20);
  let original = base(),
    stored;
  const handler = vm.runInNewContext("(" + expression(html, start) + ")", {
    read: () => structuredClone(original),
    id: "a",
    write: (d) => (stored = d),
    draw() {},
    Error,
  });
  handler("Test", "Neue Beschreibung");
  assert.equal(
    JSON.stringify(stored.configs),
    JSON.stringify(original.configs),
  );
  assert.equal(stored.activities[0].description, "Neue Beschreibung");
  handler("Neu", "Name geändert");
  assert.equal(stored.configs["t::flow"].entries.Neu.note, "keep");
  assert.equal(stored.configs["t::flow"].entries.Test, undefined);
  original.configs["archiv::flow"] = {
    entries: { Neu: { note: "Archiviertere Zuordnung" } },
  };
  stored = undefined;
  assert.throws(() => handler("Neu", "Entwurf"), /Leistungszuordnung/);
  assert.equal(stored, undefined);
  assert.equal(original.configs["t::flow"].entries.Test.note, "keep");
});
test("not required is a separate ART category and never an open or Shared Services assignment", () => {
  const x = boot();
  x.run(script("utg-open-assignments-core"));
  const d = base();
  d.configs["t::flow"].entries.Test = {
    org: "Nicht erforderlich",
    orgSource: "explicit",
    embedding: "Shared Services",
  };
  const r = x.ctx.window.UTGOpenAssignments.evaluate(d, { id: "t" }, "Test");
  assert.equal(r.bucket, 5);
  assert.equal(r.isShared, false);
  d.configs["t::flow"].entries.Test.org = "Noch zu klären";
  assert.equal(
    x.ctx.window.UTGOpenAssignments.evaluate(d, { id: "t" }, "Test").bucket,
    4,
  );
  assert.ok(html.includes("<th>Nicht erforderlich</th>"));
  assert.ok(html.includes("Zuordnungen ohne benannte Verantwortung"));
  assert.ok(!html.includes("ART Flow Health"));
});
test("all legacy phase agreements are editable through Phase and survive no-op save and file roundtrip", () => {
  const x = boot(),
    api = x.ctx.window.UTGFlowCriteria;
  let d = api.initialize(base());
  d.flowCriteria.rules.Funnel.criteria = [
    {
      id: "legacy-intake",
      type: "Aufnahme",
      description: "Individuelle Aufnahme",
      owner: "PO",
      evidence: "Ticket",
    },
  ];
  api.ensureTeam(d, "a");
  for (const stage of x.ctx.window.UTGFlow.states) {
    const before = JSON.stringify(d.flowCriteria.profiles.a.rules[stage]),
      items = api.typed(d, stage, "a", "Phase"),
      legacy = d.flowCriteria.profiles.a.rules[stage].criteria.filter(
        (c) => !["AC", "DoR", "DoD"].includes(c.type),
      );
    for (const c of legacy)
      assert.ok(
        items.some(
          (i) =>
            i.id === c.id &&
            i.type === c.type &&
            i.description === c.description,
        ),
      );
    d = api.updateTyped(d, stage, "a", "Phase", items);
    assert.equal(
      JSON.stringify(d.flowCriteria.profiles.a.rules[stage]),
      before,
    );
  }
  const items = api.typed(d, "Funnel", "a", "Phase"),
    old = items.find((c) => c._source === "rule");
  old.description = "Individuelle Aufnahme";
  d = api.updateTyped(d, "Funnel", "a", "Phase", items);
  assert.equal(
    d.flowCriteria.profiles.a.rules.Funnel.criteria.find((c) => c.id === old.id)
      .description,
    "Individuelle Aufnahme",
  );
  const b = x.ctx.window.UTGStorage.bundle();
  b.v3 = d;
  x.ctx.window.UTGStorage.restore(JSON.parse(JSON.stringify(b)));
  assert.equal(
    JSON.stringify(JSON.parse(x.store.get(V3)).flowCriteria),
    JSON.stringify(d.flowCriteria),
  );
  assert.ok(!JSON.stringify(d).includes("_source"));
  const hints = x.ctx.window.UTGOperatingModelReview.validate(
    { teams: [{ id: "a", name: "A" }] },
    d,
    true,
  );
  assert.ok(
    hints
      .filter((h) => h.message.includes("Phasenkriterien"))
      .every((h) => h.target.type === "Phase" || h.target.type === "AC"),
  );
});
test("phase evidence migration updates only exact old criteria and retains custom values and deleted lists", () => {
  const x = boot();
  x.run(
    script("utg-flow-criteria-data").replace(
      "window.UTGFlowCriteria=",
      "window.__previousPhases=previousPhaseDefaults;window.UTGFlowCriteria=",
    ),
  );
  const api = x.ctx.window.UTGFlowCriteria;
  let d = api.ensureTeam(base(), "a");
  d.flowCriteria.phaseGates = x.ctx.window.__previousPhases();
  d.flowCriteria.profiles.a.phaseGates = x.ctx.window.__previousPhases();
  d.flowCriteria.profiles.a.phaseGates.Implementing[0].evidence =
    "Meine Eintrittsprüfung";
  d.flowCriteria.profiles.a.phaseGates.Validating = [];
  d.flowCriteria.profiles.a.phaseGates.Done[1].description =
    "Eigener Abschluss";
  api.initialize(d);
  assert.match(
    d.flowCriteria.phaseGates.Implementing[0].evidence,
    /Bereitschaft/,
  );
  assert.equal(d.flowCriteria.phaseGates.Done[1].type, "Abschluss");
  assert.equal(
    d.flowCriteria.profiles.a.phaseGates.Implementing[0].evidence,
    "Meine Eintrittsprüfung",
  );
  assert.equal(d.flowCriteria.profiles.a.phaseGates.Validating.length, 0);
  assert.equal(d.flowCriteria.profiles.a.phaseGates.Done[1].type, "Übergang");
  const once = JSON.stringify(d);
  api.initialize(d);
  assert.equal(JSON.stringify(d), once);
});
test("changed design criteria retain previous assessment but require confirmation and survive import", () => {
  const x = boot(),
    api = x.ctx.window.UTGDesignCriteria;
  let d = x.ctx.window.UTGDefaults.baseline().v3;
  api.ensureTeams(d, [{ id: "a", name: "A" }]);
  const id = d.teamDesignCriteria.a[0].id;
  d = api.teamCheck(d, "a", id, true);
  d = api.teamEdit(d, "a", id, "Angepasster Name", "Mein Inhalt");
  assert.equal(d.teamDesignCriteria.a[0].fulfilled, true);
  assert.equal(d.teamDesignCriteria.a[0].needsReview, true);
  assert.equal(
    api.teamSummary(d, [{ id: "a", name: "A" }])[0].pending.length,
    1,
  );
  assert.equal(
    api.teamSummary(d, [{ id: "a", name: "A" }])[0].fulfilled.length,
    0,
  );
  const b = x.ctx.window.UTGStorage.bundle();
  b.v3 = d;
  x.ctx.window.UTGStorage.restore(JSON.parse(JSON.stringify(b)));
  const saved = JSON.parse(x.store.get(V3));
  assert.equal(saved.teamDesignCriteria.a[0].needsReview, true);
  d = api.teamCheck(saved, "a", id, false);
  assert.equal(d.teamDesignCriteria.a[0].needsReview, false);
  assert.ok(d.teamDesignCriteria.a[0].assessedAt);
  assert.equal(
    api.teamSummary(d, [{ id: "a", name: "A" }])[0].pending.length,
    0,
  );
});
test("storage status retains early failures and successful retry clears them", () => {
  const x = boot();
  x.run(script("utg-storage-api"));
  const api = x.ctx.window.UTGStorage;
  assert.equal(api.getStatus(), null);
  x.fail(true);
  assert.throws(() => api.rawSet(V3, "{}"));
  assert.equal(api.getStatus(), false);
  x.fail(false);
  api.rawSet("status-test", "ok");
  assert.equal(api.getStatus(), true);
  assert.ok(html.includes("paintStorageStatus(window.UTGStorage.getStatus())"));
  assert.ok(html.includes("Hinterlegte Geltungsbeschreibung"));
  assert.ok(
    html.includes(
      process.env.UTG_EXPECT_STAGE === "RC3"
        ? "v3.16 (RC3) – Technische Überarbeitung"
        : process.env.UTG_EXPECT_STAGE === "RC2"
          ? "v3.16 · RC2 – Verbesserungen gegenüber v3.15"
          : "v3.15.5 · 6. November 2026",
    ),
  );
});

(async () => {
  async function asyncTest(name, fn) {
    await fn();
    checks++;
    console.log("PASS " + name);
  }
  function fileContext(picker) {
    const x = boot();
    const status = { textContent: "" },
      downloads = [];
    x.ctx.document = {
      getElementById: () => status,
      querySelector: () => null,
      body: { append() {} },
      createElement: () => ({
        click() {
          downloads.push(this.download);
        },
        remove() {},
      }),
    };
    x.ctx.Blob = Blob;
    x.ctx.URL = { createObjectURL: () => "blob:test", revokeObjectURL() {} };
    x.ctx.setTimeout = (fn) => fn();
    if (picker) x.ctx.window.showSaveFilePicker = picker;
    x.run(script("utg-file-operations"));
    return { ...x, status, downloads };
  }
  await asyncTest(
    "file picker completes a real JSON serialization and close",
    async () => {
      let body,
        closed = false;
      const x = fileContext(async () => ({
        name: "config.json",
        createWritable: async () => ({
          write: async (value) => (body = value),
          close: async () => (closed = true),
        }),
      }));
      assert.equal(await x.ctx.window.UTGFiles.save(), "saved");
      assert.equal(JSON.parse(body).format, "utg-le-complete");
      assert.equal(closed, true);
      assert.equal(x.downloads.length, 0);
    },
  );
  await asyncTest(
    "file write failure aborts stream and does not fall back to download",
    async () => {
      let aborted = false;
      const x = fileContext(async () => ({
        createWritable: async () => ({
          write: async () => {
            throw Error("Disk full");
          },
          abort: async () => (aborted = true),
        }),
      }));
      assert.equal(await x.ctx.window.UTGFiles.save(), "failed");
      assert.equal(aborted, true);
      assert.equal(x.downloads.length, 0);
      assert.match(x.status.textContent, /Disk full/);
    },
  );
  await asyncTest(
    "cancelled file picker does not download or change config",
    async () => {
      const x = fileContext(async () => {
          const e = Error("cancel");
          e.name = "AbortError";
          throw e;
        }),
        before = x.store.get(V3);
      assert.equal(await x.ctx.window.UTGFiles.save(), "cancelled");
      assert.equal(x.downloads.length, 0);
      assert.equal(x.store.get(V3), before);
    },
  );
  await asyncTest(
    "JSON export downloads valid complete config without file picker",
    async () => {
      const x = fileContext();
      assert.equal(await x.ctx.window.UTGFiles.save(true), "download");
      assert.equal(x.downloads.length, 1);
      assert.match(x.status.textContent, /Download gestartet/);
    },
  );
  await asyncTest(
    "export blocks invalid pending edits and malformed stored config",
    async () => {
      const x = fileContext();
      x.ctx.document.querySelector = () => ({});
      assert.equal(await x.ctx.window.UTGFiles.save(true), "failed");
      assert.equal(x.downloads.length, 0);
      x.ctx.document.querySelector = () => null;
      x.store.set(V3, '{"schema":3}');
      assert.equal(await x.ctx.window.UTGFiles.save(true), "failed");
      assert.equal(x.downloads.length, 0);
    },
  );
  await asyncTest(
    "file close failure is reported and never triggers a fallback download",
    async () => {
      let aborted = false;
      const x = fileContext(async () => ({
        name: "config.json",
        createWritable: async () => ({
          write: async () => {},
          close: async () => {
            throw Error("Close failed");
          },
          abort: async () => (aborted = true),
        }),
      }));
      assert.equal(await x.ctx.window.UTGFiles.save(), "failed");
      assert.equal(x.downloads.length, 0);
      assert.equal(aborted, true);
      assert.match(x.status.textContent, /Close failed/);
    },
  );
  console.log(
    `PASS ${checks} regression checks; ${blocks.length} script blocks parsed.`,
  );
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

test("new criteria stay unassessed until an explicit rating; legacy booleans retain their meaning", () => {
  const api = boot().ctx.window.UTGDesignCriteria,
    teams = [
      { id: "a", name: "A" },
      { id: "b", name: "B" },
    ];
  let d = api.ensureTeams({}, teams);
  assert.equal(api.teamSummary(d, teams)[0].unassessed.length, 9);
  d = api.teamEdit(d, "a", null, "Neu", "Beschreibung");
  const id = d.teamDesignCriteria.a.at(-1).id;
  assert.equal(
    api.assessmentStatus(d.teamDesignCriteria.a.at(-1)),
    "Nicht beurteilt",
  );
  d = api.teamEdit(d, "a", id, "Neu geändert", "Text");
  assert.equal(d.teamDesignCriteria.a.at(-1).needsReview, false);
  d = api.teamRate(d, "a", id, "Nicht erfüllt");
  assert.equal(api.teamSummary(d, teams)[0].unfulfilled.length, 1);
  d = api.teamRate(d, "a", id, "Erfüllt");
  d = api.teamEdit(d, "a", id, "Neue Definition", "Text");
  assert.equal(api.teamSummary(d, teams)[0].pending.length, 1);
  assert.equal(d.teamDesignCriteria.a.at(-1).fulfilled, true);
  d = api.teamRate(d, "a", id, "Erfüllt");
  assert.equal(api.teamSummary(d, teams)[0].fulfilled.length, 1);
  assert.equal(api.teamSummary(d, teams)[1].unassessed.length, 9);
  d = api.teamRate(d, "a", id, "Nicht beurteilt");
  assert.equal(api.teamSummary(d, teams)[0].unassessed.length, 10);
  delete d.teamDesignCriteria.a[0].assessmentStatus;
  d.teamDesignCriteria.a[0].fulfilled = false;
  assert.equal(
    api.assessmentStatus(d.teamDesignCriteria.a[0]),
    "Nicht erfüllt",
  );
  delete d.teamDesignCriteria.a[1].assessmentStatus;
  d.teamDesignCriteria.a[1].fulfilled = true;
  assert.equal(api.assessmentStatus(d.teamDesignCriteria.a[1]), "Erfüllt");
  api.validate(JSON.parse(JSON.stringify(d)));
  d.teamDesignCriteria.a[0].assessmentStatus = "ungültig";
  assert.throws(() => api.validate(d), /Team-Design-Kriterien/);
});
test("assessment drawer saves in the overview, preserves untouched reviews and rejects concurrent definition changes", () => {
  const x = boot(),
    api = x.ctx.window.UTGDesignCriteria,
    team = { id: "a", name: "A" };
  let data = api.ensureTeams({}, [team]),
    saved = 0;
  const id = data.teamDesignCriteria.a[0].id;
  data = api.teamRate(data, "a", id, "Erfüllt");
  data = api.teamEdit(data, "a", id, "Geändert", "Beschreibung");
  class Element {
    constructor(tag) {
      this.tag = tag;
      this.children = [];
      this.events = {};
      this.dataset = {};
      this.attrs = {};
      this.value = "";
    }
    append(...nodes) {
      this.children.push(...nodes);
    }
    setAttribute(k, v) {
      this.attrs[k] = v;
    }
    addEventListener(k, fn) {
      this.events[k] = fn;
    }
    showModal() {
      this.open = true;
    }
    close() {
      this.open = false;
      this.events.close?.();
    }
    remove() {}
    focus() {}
  }
  const body = new Element("body"),
    ctx = {
      document: { createElement: (tag) => new Element(tag), body },
      teams: () => [team],
      read: () => structuredClone(data),
      api,
      save: (next) => {
        data = next;
        saved++;
      },
      report: { querySelectorAll: () => [] },
      window: { UTGEdits: { closeSaved: (dialog) => dialog.close() } },
      button: (text, action) => {
        const e = new Element("button");
        e.textContent = text;
        e.onclick = action;
        return e;
      },
      Error,
    };
  const ui = script("utg-design-criteria-ui"),
    start = ui.indexOf("function assessTeam("),
    end = ui.indexOf("function drawReport(", start);
  vm.runInNewContext(ui.slice(start, end), ctx);
  const all = (e) => [e, ...e.children.flatMap(all)],
    open = () => {
      ctx.assessTeam("a");
      const dialog = body.children.at(-1),
        nodes = all(dialog);
      return {
        dialog,
        form: nodes.find((n) => n.tag === "form"),
        selects: nodes.filter((n) => n.tag === "select"),
        nodes,
      };
    };
  let drawer = open();
  drawer.form.onsubmit({ preventDefault() {} });
  assert.equal(saved, 1);
  assert.equal(data.teamDesignCriteria.a[0].needsReview, true);
  assert.equal(drawer.dialog.open, false);
  drawer = open();
  drawer.selects[0].value = "Erfüllt";
  drawer.selects[0].events.change();
  drawer.form.onsubmit({ preventDefault() {} });
  assert.equal(saved, 2);
  assert.equal(data.teamDesignCriteria.a[0].needsReview, false);
  drawer = open();
  drawer.selects[1].value = "Nicht erfüllt";
  drawer.selects[1].events.change();
  drawer.nodes.find((n) => n.textContent === "Abbrechen").onclick();
  assert.equal(saved, 2);
  assert.equal(
    api.assessmentStatus(data.teamDesignCriteria.a[1]),
    "Nicht beurteilt",
  );
  drawer = open();
  drawer.selects[0].value = "Nicht erfüllt";
  drawer.selects[0].events.change();
  data = api.teamEdit(
    data,
    "a",
    id,
    "Inzwischen geändert",
    "Andere Definition",
  );
  drawer.form.onsubmit({ preventDefault() {} });
  assert.equal(saved, 2);
  assert.equal(drawer.dialog.open, true);
  assert.match(
    drawer.nodes.find((n) => n.className === "app-save-error").textContent,
    /inzwischen geändert/,
  );
});
test("agreement confirmations survive export import and malformed confirmations fail before any write", () => {
  const x = boot(),
    b = x.ctx.window.UTGStorage.bundle();
  x.run(script("utg-flow-ux-core"));
  const api = x.ctx.window.UTGAgreement;
  b.v2.teams = [{ id: "a", name: "A", productIds: [], assignments: {} }];
  b.v3.configs["a::flow"] = { status: "Entwurf", entries: {} };
  b.v3 = api.confirm(b.v3, "a", "Freigegeben", b.v2.teams);
  x.ctx.window.UTGStorage.restore(JSON.parse(JSON.stringify(b)));
  const round = x.ctx.window.UTGStorage.bundle();
  assert.equal(api.state(round.v3, "a", round.v2.teams).changed, false);
  assert.ok(round.v3.agreementConfirmations.a.confirmedAt);
  const before = [...x.store];
  round.v3.agreementConfirmations.a.signature = 5;
  assert.throws(
    () => x.ctx.window.UTGStorage.restore(round),
    /Statusbestätigung/,
  );
  assert.deepEqual([...x.store], before);
});
test("explicit matrix status confirmation stays unchanged through export import and invalid import context fails before writes", () => {
  const x = boot(),
    b = x.ctx.window.UTGStorage.bundle();
  x.run(script("utg-flow-ux-core"));
  x.run(script("utg-matrix-transactions-315"));
  b.v2.teams = [{ id: "a", name: "A", productIds: ["p"], assignments: {} }];
  b.v3.products = [{ id: "p", name: "P" }];
  b.v3.team = "a";
  b.v3.configs["a::flow"] = { status: "Entwurf", entries: {} };
  x.ctx.window.UTGStorage.restore(b);
  const seed = JSON.parse(x.store.get(V3)).configs["a::flow"];
  x.ctx.window.UTGMatrix.saveStatus("a", "Freigegeben", "Entwurf", seed);
  const confirmed = JSON.parse(x.store.get(V3));
  assert.equal(
    x.ctx.window.UTGAgreement.state(confirmed, "a", b.v2.teams).changed,
    false,
  );
  const incoming = x.ctx.window.UTGFlowUX.prepareImport(
    x.ctx.window.UTGStorage.bundle(),
  );
  x.ctx.window.UTGStorage.restore(JSON.parse(JSON.stringify(incoming)));
  const stored = JSON.parse(x.store.get(V3));
  assert.equal(
    x.ctx.window.UTGAgreement.state(stored, "a", b.v2.teams).changed,
    false,
  );
  const before = [...x.store];
  incoming.v3.navigationEpoch = { invalid: true };
  assert.throws(
    () => x.ctx.window.UTGStorage.restore(incoming),
    /Konfigurationskontext/,
  );
  assert.deepEqual([...x.store], before);
});
