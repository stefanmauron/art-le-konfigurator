import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { analyze, validate, stable } from "../src/merge.js";
const read = (n) =>
  JSON.parse(
    fs.readFileSync(new URL("fixtures/Laptop-" + n + ".json", import.meta.url)),
  );
const A = read(1),
  B = read(2),
  cp = structuredClone;
function renameActivity(b, index, name) {
  const a = b.v3.activities[index],
    old = a.name;
  a.name = name;
  for (const c of Object.values(b.v3.configs)) {
    c.entries[name] = c.entries[old];
    delete c.entries[old];
  }
}
export function resolveAll(a, b, mode = "A") {
  const choices = {};
  for (let pass = 0; pass < 20; pass++) {
    const r = analyze(a, b, choices);
    if (r.ready) return { r, choices };
    const pending = r.conflicts.filter((c) => !c.resolved);
    assert.ok(pending.length, JSON.stringify(r.errors));
    for (const c of pending) {
      if (c.kind === "name")
        choices[c.key] = { name: c.b.name + " · eigenständig " + pass };
      else if (c.kind === "ownership") choices[c.key] = { take: "duplicate" };
      else
        choices[c.key] = {
          take:
            mode === "both" && c.options.includes("both")
              ? "both"
              : mode === "both"
                ? "A"
                : mode,
        };
    }
  }
  throw Error("Konflikte nicht konvergiert");
}
test("Geänderter Tätigkeitsname mit gleicher ID: A/B passt Matrixverweise beider Quellen an", () => {
  const b = cp(B),
    old = b.v3.activities[0].name;
  renameActivity(b, 0, "Anderer Tätigkeitsname");
  validate(b);
  for (const take of ["A", "B"]) {
    const r = analyze(A, b, {
      ["activities:" + b.v3.activities[0].id]: { take },
    });
    assert.equal(r.ready, true, JSON.stringify(r.errors));
    const name = take === "A" ? old : b.v3.activities[0].name;
    for (const source of [A, b])
      for (const t of source.v2.teams) {
        const before =
          source.v3.configs[t.id + "::flow"].entries[
            source.v3.activities[0].name
          ];
        assert.deepEqual(
          r.bundle.v3.configs[t.id + "::flow"].entries[name],
          before,
        );
      }
  }
});
test("Zwei vertauschte Tätigkeitsnamen werden atomar ohne Überschreiben zugeordnet", () => {
  const b = cp(B),
    names = b.v3.activities.slice(0, 2).map((a) => a.name);
  for (const c of Object.values(b.v3.configs)) {
    const x = c.entries[names[0]],
      y = c.entries[names[1]];
    c.entries[names[0]] = y;
    c.entries[names[1]] = x;
  }
  b.v3.activities[0].name = names[1];
  b.v3.activities[1].name = names[0];
  validate(b);
  const choices = Object.fromEntries(
    b.v3.activities
      .slice(0, 2)
      .map((a) => ["activities:" + a.id, { take: "B" }]),
  );
  const r = analyze(A, b, choices);
  assert.equal(r.ready, true, JSON.stringify(r.errors));
  for (const t of A.v2.teams) {
    const old = A.v3.configs[t.id + "::flow"].entries,
      e = r.bundle.v3.configs[t.id + "::flow"].entries;
    assert.deepEqual(e[names[1]], old[names[0]]);
    assert.deepEqual(e[names[0]], old[names[1]]);
  }
});
test("Mehrere gleichzeitige Konflikte: beide Teams, Produkte und Services behalten", () => {
  const b = cp(A);
  for (const t of b.v2.teams)
    b.v3.teamContracts[t.id].business += " Variante B";
  for (const p of b.v3.products) p.description += " Variante B";
  for (const s of b.v3.services.slice(0, 3)) s.provider = "BIT";
  const before = [stable(A), stable(b)],
    { r } = resolveAll(A, b, "both");
  assert.equal(r.bundle.v2.teams.length, 4);
  assert.equal(r.bundle.v3.products.length, 4);
  assert.equal(r.bundle.v3.services.length, A.v3.services.length + 3);
  assert.deepEqual([stable(A), stable(b)], before);
});
test("Drei Dateien nacheinander: Zusammenführung ist bei disjunkten Inhalten assoziativ", () => {
  const c = cp(B);
  for (const t of c.v2.teams) {
    const old = t.id;
    t.id += "-c";
    t.name += " C";
    for (const field of [
      "teamContracts",
      "teamDesignCriteria",
      "teamDesignAssessments",
      "agreementConfirmations",
    ])
      if (Object.hasOwn(c.v3[field] || {}, old)) {
        c.v3[field][t.id] = c.v3[field][old];
        delete c.v3[field][old];
      }
    for (const field of ["profiles", "teams"])
      if (Object.hasOwn(c.v3.flowCriteria[field], old)) {
        c.v3.flowCriteria[field][t.id] = c.v3.flowCriteria[field][old];
        delete c.v3.flowCriteria[field][old];
      }
    c.v3.configs[t.id + "::flow"] = c.v3.configs[old + "::flow"];
    delete c.v3.configs[old + "::flow"];
    t.productIds = t.productIds.map((id) => id + "-c");
  }
  for (const p of c.v3.products) {
    p.id += "-c";
    p.name += " C";
  }
  c.v2.selected = c.v2.teams[0].id;
  c.v3.team = c.v2.selected;
  c.v3.product = c.v3.products[0].id;
  const left = analyze(analyze(A, B).bundle, c),
    right = analyze(A, analyze(B, c).bundle);
  assert.equal(left.ready, true);
  assert.equal(right.ready, true);
  assert.equal(stable(left.bundle), stable(right.bundle));
  assert.equal(left.bundle.v2.teams.length, 6);
});
test("Leere Team-/Produktdatei ergänzt einen Arbeitsstand ohne fachlichen Verlust", () => {
  const empty = cp(A);
  empty.v2 = { teams: [], selected: "" };
  empty.v3.products = [];
  empty.v3.configs = {};
  empty.v3.team = "";
  empty.v3.product = "";
  for (const f of [
    "teamContracts",
    "teamDesignCriteria",
    "teamDesignAssessments",
    "agreementConfirmations",
  ])
    empty.v3[f] = {};
  empty.v3.flowCriteria.profiles = {};
  empty.v3.flowCriteria.teams = {};
  for (const [a, b] of [
    [A, empty],
    [empty, A],
  ]) {
    const r = analyze(a, b);
    assert.equal(r.ready, true);
    assert.deepEqual(r.bundle.v2.teams, A.v2.teams);
    assert.deepEqual(r.bundle.v3.configs, A.v3.configs);
  }
});
test("Unicode, Zeilenumbrüche, Anführungszeichen und HTML-artiger Freitext bleiben exakt erhalten", () => {
  const b = cp(B),
    value =
      'Änderung 🧭 漢字 e\u0301\n"Zitat" \\ Pfad <script>alert(1)</script>';
  b.v2.teams[0].description = value;
  b.v3.products[0].description = value;
  for (const c of Object.values(b.v3.configs))
    for (const e of Object.values(c.entries)) e.note = value;
  const r = analyze(A, b);
  assert.equal(r.ready, true);
  assert.equal(r.bundle.v2.teams[2].description, value);
  for (const t of b.v2.teams)
    for (const e of Object.values(r.bundle.v3.configs[t.id + "::flow"].entries))
      assert.equal(e.note, value);
});
test("Namenskonflikte werden unabhängig von Grossschreibung und Rand-Leerzeichen erkannt", () => {
  const b = cp(B);
  b.v2.teams[0].name = "  TEAM 1  ";
  const r = analyze(A, b);
  assert.equal(r.ready, false);
  assert.ok(r.conflicts.some((c) => c.kind === "name"));
});
test("Konfliktentscheidung wechseln: keine Reste einer zuvor erzeugten Kopie", () => {
  const b = cp(B);
  b.v3.services[0].provider = "BIT";
  const both = resolveAll(A, b, "both");
  const r = analyze(A, b, {
    ["services:" + b.v3.services[0].id]: { take: "B" },
  });
  assert.equal(r.ready, true);
  assert.equal(r.renames.length, 0);
  assert.equal(r.bundle.v3.services.length, A.v3.services.length);
  assert.ok(both.r.renames.length);
});
test("100 gemischte Konfliktsätze mit wechselnder A/B-Auswahl erhalten jede gewählte Team-Matrix", () => {
  for (let i = 0; i < 100; i++) {
    const b = cp(A);
    for (const t of b.v2.teams) {
      b.v3.teamContracts[t.id].business = "Fall " + i;
      for (const e of Object.values(b.v3.configs[t.id + "::flow"].entries))
        e.note = "B " + i;
    }
    const choices = Object.fromEntries(
      b.v2.teams.map((t, n) => [
        "teams:" + t.id,
        { take: (i + n) % 2 ? "A" : "B" },
      ]),
    );
    const r = analyze(A, b, choices);
    assert.equal(r.ready, true);
    for (const t of b.v2.teams) {
      const source = choices["teams:" + t.id].take === "A" ? A : b;
      assert.deepEqual(
        r.bundle.v3.configs[t.id + "::flow"],
        source.v3.configs[t.id + "::flow"],
      );
    }
  }
});
