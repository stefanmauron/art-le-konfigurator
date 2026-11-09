import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { analyze, validate, stable } from "../src/merge.js";
const A = JSON.parse(
    fs.readFileSync(new URL("fixtures/Laptop-1.json", import.meta.url)),
  ),
  B = JSON.parse(
    fs.readFileSync(new URL("fixtures/Laptop-2.json", import.meta.url)),
  );
const cp = (x) => structuredClone(x),
  first = A.v2.teams[0].id,
  flow = first + "::flow";
const conflict = (b, choices = {}) => analyze(A, b, choices);
const throws = (mutate, pattern) => {
  const b = cp(B);
  mutate(b);
  assert.throws(() => validate(b), pattern);
};
const pickAll = (r, take = "A") =>
  Object.fromEntries(
    r.conflicts
      .filter((c) => c.options.includes(take))
      .map((c) => [c.key, { take }]),
  );
test("Inputs bleiben auch nach verschachtelten Konfliktentscheidungen unverändert", () => {
  const b = cp(A);
  b.v3.configs[flow].entries[Object.keys(b.v3.configs[flow].entries)[0]].note =
    "anders";
  const before = [stable(A), stable(b)];
  const r = conflict(b);
  conflict(b, pickAll(r, "B"));
  assert.deepEqual([stable(A), stable(b)], before);
});
test("Identische Objekte unabhängig von JSON-Schlüsselreihenfolge erkennen", () => {
  const b = JSON.parse(
    JSON.stringify(A, (k, v) =>
      v && typeof v === "object" && !Array.isArray(v)
        ? Object.fromEntries(Object.entries(v).reverse())
        : v,
    ),
  );
  assert.equal(conflict(b).conflicts.length, 0);
});
test("Team-Konflikt umfasst Matrix, Kriterien, Vertrag und Bestätigung als Einheit", () => {
  const b = cp(A);
  b.v3.teamContracts[first].business = "B";
  b.v3.flowCriteria.profiles[first].commonDoD[0].description = "B prüft alles.";
  let r = conflict(b);
  assert.equal(r.unresolved, 1);
  assert.equal(r.conflicts[0].key, "teams:" + first);
  assert.equal(r.ready, false);
  for (const take of ["A", "B"]) {
    r = conflict(b, { ["teams:" + first]: { take } });
    assert.equal(r.ready, true);
    assert.deepEqual(
      r.bundle.v3.teamContracts[first],
      (take === "A" ? A : b).v3.teamContracts[first],
    );
    assert.deepEqual(
      r.bundle.v3.flowCriteria.profiles[first],
      (take === "A" ? A : b).v3.flowCriteria.profiles[first],
    );
  }
});
test("LE-Service-Konflikt zeigt betroffene Teams und Tätigkeiten", () => {
  const b = cp(B),
    service = b.v3.services[0];
  service.provider = "BIT";
  const r = conflict(b),
    c = r.conflicts.find((c) => c.key === "services:" + service.id);
  assert.ok(c);
  assert.ok(c.affectedA.length + c.affectedB.length > 0);
  assert.equal(r.ready, false);
  for (const take of ["A", "B"])
    assert.equal(conflict(b, { [c.key]: { take } }).ready, true);
});
test("LE-Service beide behalten: ID und alle Serviceverweise erhalten eindeutige neue Zuordnung", () => {
  const b = cp(B),
    id = b.v3.services[0].id;
  b.v3.services[0].provider = "BIT";
  let choices = { ["services:" + id]: { take: "both" } };
  let r = conflict(b, choices);
  const naming = r.conflicts.find((c) => c.kind === "name");
  assert.ok(naming);
  choices[naming.key] = { name: "Eigener Service Laptop 2" };
  r = conflict(b, choices);
  assert.equal(r.ready, true, JSON.stringify(r.errors));
  const newId = r.renames[0].to;
  assert.ok(r.bundle.v3.services.some((s) => s.id === newId));
  for (const t of b.v2.teams)
    for (const [name, e] of Object.entries(
      b.v3.configs[t.id + "::flow"].entries,
    ))
      assert.equal(
        r.bundle.v3.configs[t.id + "::flow"].entries[name].service,
        e.service === id ? newId : e.service,
      );
  for (const t of A.v2.teams)
    assert.deepEqual(
      r.bundle.v3.configs[t.id + "::flow"],
      A.v3.configs[t.id + "::flow"],
    );
});
test("Namensgleichheit bei verschiedenen IDs: getrennt erhalten und explizite Umbenennung verlangen", () => {
  const b = cp(B);
  b.v2.teams[0].name = A.v2.teams[0].name;
  let r = conflict(b);
  assert.equal(r.unresolved, 1);
  const k = r.conflicts[0].key;
  r = conflict(b, { [k]: { name: "Eigenständiges Team Laptop 2" } });
  assert.equal(r.ready, true);
  assert.equal(r.bundle.v2.teams.length, 4);
});
test("Leere oder bereits belegte Ersatznamen bleiben blockiert", () => {
  const b = cp(B);
  b.v2.teams[0].name = A.v2.teams[0].name;
  const k = conflict(b).conflicts[0].key;
  for (const name of [" ", A.v2.teams[1].name, b.v2.teams[1].name])
    assert.equal(conflict(b, { [k]: { name } }).ready, false);
});
test("Beide Team-Stände erhalten, Produktkonflikte explizit mit Kopien auflösen", () => {
  const b = cp(A);
  b.v3.teamContracts[first].business = "Andere Verantwortung";
  let choices = { ["teams:" + first]: { take: "both" } };
  let r = conflict(b, choices);
  const naming = r.conflicts.find((c) => c.kind === "name");
  choices[naming.key] = { name: "Eigenständiges Team B" };
  r = conflict(b, choices);
  const ownership = r.conflicts.find((c) => c.kind === "ownership");
  assert.ok(ownership);
  choices[ownership.key] = { take: "duplicate" };
  r = conflict(b, choices);
  assert.equal(r.ready, true, JSON.stringify(r.errors));
  assert.equal(r.bundle.v2.teams.length, 3);
  assert.equal(r.bundle.v3.products.length, 3);
  const newId = r.renames.find((x) => x.kind === "teams").to;
  assert.equal(
    r.bundle.v3.teamContracts[newId].business,
    "Andere Verantwortung",
  );
  assert.deepEqual(r.bundle.v3.configs[newId + "::flow"], b.v3.configs[flow]);
  assert.deepEqual(
    r.bundle.v3.flowCriteria.profiles[newId],
    b.v3.flowCriteria.profiles[first],
  );
  assert.ok(
    !r.bundle.v2.teams
      .find((t) => t.id === newId)
      .productIds.includes(A.v2.teams[0].productIds[0]),
  );
});
test("Produktkonflikt: verantwortliches Team kann explizit gewählt werden", () => {
  const b = cp(B),
    pid = A.v3.products[0].id;
  b.v3.products.push(cp(A.v3.products[0]));
  b.v2.teams[0].productIds.push(pid);
  let r = conflict(b);
  assert.ok(r.conflicts.some((c) => c.kind === "ownership"));
  r = conflict(b, { ["ownership:" + pid]: { take: first } });
  assert.equal(r.ready, true);
  assert.ok(
    !r.bundle.v2.teams
      .find((t) => t.id === b.v2.teams[0].id)
      .productIds.includes(pid),
  );
});
test("Neue IDs kollidieren nicht mit bereits vorhandenen Suffix-IDs", () => {
  const b = cp(B),
    s = b.v3.services[0],
    id = s.id;
  s.provider = "BIT";
  b.v3.services.push({ ...s, id: id + "--merge-b", name: "Anderer Service" });
  let r = conflict(b, { ["services:" + id]: { take: "both" } });
  assert.equal(r.renames[0].to, id + "--merge-b-2");
});
test("Tätigkeit umbenennen passt namensbasierte Matrixschlüssel an", () => {
  const b = cp(B),
    a = b.v3.activities[0];
  a.description = "B Variante";
  let choices = { ["activities:" + a.id]: { take: "both" } };
  let r = conflict(b, choices);
  const c = r.conflicts.find((c) => c.kind === "name");
  choices[c.key] = { name: "Eigene Tätigkeit B" };
  r = conflict(b, choices);
  assert.equal(r.ready, true, JSON.stringify(r.errors));
  for (const t of b.v2.teams) {
    const entries = r.bundle.v3.configs[t.id + "::flow"].entries;
    assert.deepEqual(
      entries["Eigene Tätigkeit B"],
      b.v3.configs[t.id + "::flow"].entries[a.name],
    );
    assert.ok(!Object.hasOwn(entries, a.name));
  }
});
test("Unbekannte Felder werden nicht still verworfen", () => {
  for (const mutate of [
    (b) => (b.future = {}),
    (b) => (b.v3.future = {}),
    (b) => (b.v2.teams[0].future = "x"),
    (b) => (b.v3.services[0].future = "x"),
    (b) => (b.v3.flowCriteria.profiles[b.v2.teams[0].id].future = {}),
    (b) =>
      (b.v3.configs[b.v2.teams[0].id + "::flow"].entries[
        b.v3.activities[0].name
      ].future = "x"),
  ])
    throws(mutate, /unbekanntes Feld/);
});
test("Ältere Versionen und RC2 werden abgelehnt", () => {
  for (const [appVersion, releaseStage] of [
    ["3.15", "RC3"],
    ["3.16", "RC2"],
    ["3.16", ""],
    ["2.99", "Final"],
    ["falsch", "RC3"],
  ])
    throws((b) => Object.assign(b, { appVersion, releaseStage }), /v3.16|RC3/);
});
test("Spätere Versionen mit bekanntem Schema unterstützt; neues Schema blockiert", () => {
  for (const appVersion of ["3.17", "4.0", "3.16.1"]) {
    const b = cp(B);
    b.appVersion = appVersion;
    assert.equal(validate(b), true);
    assert.equal(conflict(b).ready, true);
  }
  throws((b) => (b.v3.schema = 4), /Konfiguration/);
  throws((b) => (b.version = 5), /Format/);
  throws((b) => (b.v3.flowSchema = "future"), /Schema/);
});
test("Unvollständige und falsche Datenstrukturen abgelehnt", () => {
  for (const mutate of [
    (b) => delete b.v2,
    (b) => (b.v3.products = null),
    (b) => (b.v3.configs = []),
    (b) => (b.v3.services[0].name = ""),
    (b) => (b.organisations = []),
    (b) => (b.v2.teams[0].productIds = "x"),
  ])
    throws(mutate, /./);
});
test("Doppelte IDs und doppelte Namen in einzelnen Dateien abgelehnt", () => {
  throws((b) => b.v2.teams.push(cp(b.v2.teams[0])), /Doppelte/);
  throws(
    (b) => (b.v3.products[1].name = b.v3.products[0].name),
    /Doppelte Namen/,
  );
});
test("Unbekannte Produkt-, Service-, Tätigkeits- und Teamverweise abgelehnt", () => {
  throws((b) => b.v2.teams[0].productIds.push("missing"), /Produkt/);
  throws((b) => (b.v3.activities[0].service = "missing"), /LE-Service/);
  throws(
    (b) =>
      (b.v3.configs[b.v2.teams[0].id + "::flow"].entries[
        b.v3.activities[0].name
      ].service = "missing"),
    /LE-Service/,
  );
  throws(
    (b) =>
      (b.v3.configs[b.v2.teams[0].id + "::flow"].entries.Unknown = {
        service: "",
      }),
    /Tätigkeit/,
  );
  throws((b) => (b.v3.teamContracts.Unknown = { business: "X" }), /Team/);
  throws((b) => (b.v3.teamDesignAssessments.Unknown = {}), /Team/);
});
test("Doppelte Produktverantwortung innerhalb einer Datei abgelehnt", () =>
  throws(
    (b) => b.v2.teams[1].productIds.push(b.v2.teams[0].productIds[0]),
    /mehrfach/,
  ));
test("Prototype-Schlüssel und übermässige Verschachtelung abgelehnt", () => {
  const b = cp(B);
  Object.defineProperty(b.v3, "__proto__", {
    value: { polluted: true },
    enumerable: true,
  });
  assert.throws(() => validate(b), /Schlüssel/);
  assert.equal({}.polluted, undefined);
  throws((b) => (b.organisations = { constructor: {} }), /Schlüssel/);
  throws((b) => {
    let x = b.organisations;
    for (let i = 0; i < 85; i++) x = x.deep = {};
  }, /verschachtelt/);
});
test("Historische Organisationsdaten unverändert erhalten und Konflikte entscheiden", () => {
  const a = cp(A),
    b = cp(B);
  a.organisations = { a: { note: "unverändert" }, same: { note: "A" } };
  b.organisations = { b: { note: "unverändert" }, same: { note: "B" } };
  let r = analyze(a, b);
  assert.equal(r.unresolved, 1);
  r = analyze(a, b, { "organisation:same": { take: "B" } });
  assert.equal(r.ready, true);
  assert.deepEqual(r.bundle.organisations, {
    a: { note: "unverändert" },
    same: { note: "B" },
    b: { note: "unverändert" },
  });
});
test("Historische Organisationsdaten verhindern unsichere ID-Umschreibung", () => {
  const b = cp(B);
  b.organisations = { opaque: { note: "unbekannter Bezug" } };
  b.v3.services[0].provider = "BIT";
  assert.throws(
    () =>
      conflict(b, { ["services:" + b.v3.services[0].id]: { take: "both" } }),
    /nicht sicher/,
  );
});
test("ART-Regeln und Policies sind ausdrückliche globale Konflikte", () => {
  const b = cp(B);
  b.v3.policies[0].exit = "B";
  b.v3.flowCriteria.commonDoD[0].description = "B";
  let r = conflict(b);
  assert.equal(r.unresolved, 2);
  r = conflict(b, pickAll(r, "B"));
  assert.equal(r.ready, true);
  assert.deepEqual(r.bundle.v3.policies, b.v3.policies);
  assert.deepEqual(
    r.bundle.v3.flowCriteria.commonDoD,
    b.v3.flowCriteria.commonDoD,
  );
});
test("Auswahlkataloge additiv; Klassifikationsunterschiede werden nicht verschluckt", () => {
  const b = cp(B);
  b.v3.providers.push("Eigener Anbieter");
  b.v3.embeddings.push("Eigene Einbindung");
  b.v3.embeddingKinds["Eigene Einbindung"] = "custom";
  b.v3.embeddingKinds[b.v3.embeddings[0]] = "custom";
  let r = conflict(b);
  assert.equal(r.unresolved, 1);
  r = conflict(b, pickAll(r, "A"));
  assert.equal(r.ready, true);
  assert.ok(r.bundle.v3.providers.includes("Eigener Anbieter"));
  assert.equal(r.bundle.v3.embeddingKinds["Eigene Einbindung"], "custom");
});
test("Ungeklärte und ungültige Entscheidungen geben keinen Download frei", () => {
  const b = cp(B);
  b.v3.services[0].provider = "BIT";
  const k = "services:" + b.v3.services[0].id;
  for (const choices of [
    {},
    { [k]: { take: "invalid" } },
    { [k]: { take: "both" } },
  ])
    assert.equal(conflict(b, choices).ready, false);
});
test("200 reproduzierbare Zufallsvarianten: alle Team-/Matrixwerte unverändert und idempotent", () => {
  let seed = 7713;
  const rand = () => (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0);
  for (let i = 0; i < 200; i++) {
    const a = cp(A),
      b = cp(B);
    for (const x of [a, b])
      for (const c of Object.values(x.v3.configs))
        for (const e of Object.values(c.entries)) {
          e.note = "Seed " + rand();
          e.business = "Rolle " + rand();
          e.service =
            rand() % 2 ? x.v3.services[rand() % x.v3.services.length].id : "";
        }
    const before = [stable(a), stable(b)],
      r = analyze(a, b);
    assert.equal(r.ready, true);
    for (const x of [a, b])
      for (const [k, c] of Object.entries(x.v3.configs))
        assert.deepEqual(r.bundle.v3.configs[k], c);
    assert.deepEqual([stable(a), stable(b)], before);
    const r2 = analyze(r.bundle, b);
    assert.equal(r2.ready, true);
    assert.equal(stable(r2.bundle), stable(r.bundle));
  }
});

test("Noch unkonfigurierte Teams ohne Matrix oder Produkt bleiben unverändert erhalten", () => {
  const b = cp(B),
    t = b.v2.teams[0];
  t.productIds = [];
  delete b.v3.configs[t.id + "::flow"];
  const r = analyze(A, b);
  assert.equal(r.ready, true);
  assert.ok(!Object.hasOwn(r.bundle.v3.configs, t.id + "::flow"));
  assert.deepEqual(
    r.bundle.v2.teams.find((x) => x.id === t.id),
    t,
  );
});
test("Bekanntes historisches Service-Archiv additiv und ohne Verlust erhalten", () => {
  const a = cp(A),
    b = cp(B);
  a.v3.legacyArchive = {
    retiredServiceFields: { one: { capacity: "1", criteria: "A" } },
  };
  b.v3.legacyArchive = {
    retiredServiceFields: { two: { capacity: "2", criteria: "B" } },
  };
  const r = analyze(a, b);
  assert.equal(r.ready, true);
  assert.deepEqual(r.bundle.v3.legacyArchive.retiredServiceFields, {
    ...a.v3.legacyArchive.retiredServiceFields,
    ...b.v3.legacyArchive.retiredServiceFields,
  });
});
test("ID-Umschreibung verändert Freitext und Bestätigungssignaturen nicht", () => {
  const b = cp(B),
    id = b.v3.services[0].id,
    tid = b.v2.teams[0].id;
  b.v3.services[0].provider = "BIT";
  b.v3.configs[tid + "::flow"].entries[b.v3.activities[0].name].note =
    "Text mit " + id;
  let c = { ["services:" + id]: { take: "both" } };
  let r = analyze(A, b, c);
  c[r.conflicts.find((x) => x.kind === "name").key] = {
    name: "Anderer Service B",
  };
  r = analyze(A, b, c);
  assert.equal(r.ready, true);
  assert.equal(
    r.bundle.v3.configs[tid + "::flow"].entries[b.v3.activities[0].name].note,
    "Text mit " + id,
  );
});

test("Ungültige Archivstrukturen und Migrationswerte werden ohne Datenverlust abgelehnt", () => {
  for (const value of [null, [], "Text"])
    throws((b) => (b.v3.legacyArchive = value), /Objekt/);
  for (const value of [null, [], "Text"])
    throws(
      (b) => (b.v3.legacyArchive = { retiredServiceFields: value }),
      /Objekt/,
    );
  throws(
    (b) => (b.v3.migrations.activityCatalog3110 = { unknown: "x" }),
    /Migrationskennzeichnung/,
  );
  throws(
    (b) =>
      (b.v3.legacyArchive = { retiredServiceFields: { x: { unknown: "x" } } }),
    /unbekanntes Feld/,
  );
});
test("Leeres historisches Archiv bleibt ohne erfundene Felder erhalten", () => {
  const a = cp(A);
  a.v3.legacyArchive = {};
  const r = analyze(a, a);
  assert.equal(r.ready, true);
  assert.deepEqual(r.bundle.v3.legacyArchive, {});
});
