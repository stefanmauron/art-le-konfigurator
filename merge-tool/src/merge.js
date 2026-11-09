/** Pure merge engine. No files, network, storage writes or input mutations. */
import { initialize as storage } from "../../src/infrastructure/storage/browser-repository.js";
import { initialize as flow } from "../../src/domain/flow.js";
import { initialize as criteria } from "../../src/domain/flow-criteria.js";
import { initialize as standard } from "../../src/domain/flow-standard.js";
import { initialize as design } from "../../src/domain/design-criteria.js";

const app = { localStorage: {} };
flow(app);
standard(app);
criteria(app);
design(app);
storage(app);
const clone = (value) =>
  value === undefined ? undefined : structuredClone(value);
export const stable = (value) => JSON.stringify(sort(value));
function sort(v) {
  if (Array.isArray(v)) return v.map(sort);
  return v && typeof v === "object"
    ? Object.fromEntries(
        Object.keys(v)
          .sort()
          .map((k) => [k, sort(v[k])]),
      )
    : v;
}
const equal = (a, b) => stable(a) === stable(b);
const object = (v) => v !== null && typeof v === "object" && !Array.isArray(v);
const own = (o, k) => Object.hasOwn(o || {}, k);
const fail = (message) => {
  throw Error(message);
};
const teamFields = [
  "teamContracts",
  "teamDesignCriteria",
  "teamDesignAssessments",
  "agreementConfirmations",
];
const catalogs = [
  "products",
  "services",
  "activities",
  "designCriteria",
  "providerRecords",
];
const rootKeys =
  "format version appVersion releaseStage exported v2 v3 organisations";
const v3Keys =
  "schema products configs services activities policies product team providers updated flowSchema methodVersion flowGovernance migrations embeddingKinds providerRecords designCriteria teamDesignAssessments embeddings interactions legacyModels operatingModelVersion teamDesignCriteria flowCriteria agreementConfirmations teamContracts navigationEpoch modelVersion legacyArchive";
function keys(value, allowed, path) {
  if (!object(value)) fail(path + ": Objekt erwartet.");
  const allowedSet = new Set(allowed.split(" "));
  for (const k of Object.keys(value))
    if (!allowedSet.has(k))
      fail(
        path +
          "." +
          k +
          ": unbekanntes Feld. Für dieses Format muss das Werkzeug erweitert werden.",
      );
}
function safe(value, depth = 0) {
  if (depth > 80) fail("Datei ist zu tief verschachtelt.");
  if (value && typeof value === "object")
    for (const [k, v] of Object.entries(value)) {
      if (["__proto__", "constructor", "prototype"].includes(k))
        fail("Unzulässiger Schlüssel: " + k);
      safe(v, depth + 1);
    }
}
const itemKeys = {
  products: "id name description wikiUrl",
  services: "id name provider embedding interaction model",
  activities: "id name phase type description service additionalPhases",
  designCriteria: "id name description needsReview",
  providerRecords: "id name kind",
};
const entryKeys =
  "org orgSource embedding interaction business technical operations service note model legacyModel";
const criterionKeys = "id type description owner evidence contributors";
function checkCriteria(items, path) {
  if (!Array.isArray(items)) fail(path + ": Kriterienliste erwartet.");
  for (const c of items) keys(c, criterionKeys, path);
}
function checkProfile(p, path) {
  keys(p, "rules phaseGates commonDoR commonDoD", path);
  for (const field of ["commonDoR", "commonDoD"])
    if (p[field] !== undefined) checkCriteria(p[field], path + "." + field);
  for (const [stage, r] of Object.entries(p.rules || {})) {
    keys(r, "useDoD criteria", path + ".rules." + stage);
    checkCriteria(r.criteria, path + ".rules." + stage);
  }
  for (const [stage, items] of Object.entries(p.phaseGates || {}))
    checkCriteria(items, path + ".phaseGates." + stage);
}
/** Supported later app versions must retain this known, lossless schema. */
export function validate(bundle) {
  safe(bundle);
  keys(bundle, rootKeys, "Export");
  if (bundle.format !== "utg-le-complete" || bundle.version !== 4)
    fail(
      "Vollständiger Export im Format utg-le-complete / Version 4 erforderlich.",
    );
  const m = /^(\d+)\.(\d+)(?:\.(\d+))?$/.exec(bundle.appVersion || "");
  if (!m || Number(m[1]) < 3 || (Number(m[1]) === 3 && Number(m[2]) < 16))
    fail("Nur v3.16 RC3 oder spätere kompatible Versionen werden unterstützt.");
  if (
    Number(m[1]) === 3 &&
    Number(m[2]) === 16 &&
    !Number(m[3] || 0) &&
    !/^(RC(?:[3-9]|[1-9]\d+)|Release Candidate [3-9]|Final|Stable|GA)$/i.test(
      bundle.releaseStage || "",
    )
  )
    fail("v3.16 benötigt eine eindeutige Kennzeichnung ab RC3.");
  keys(bundle.v2, "teams selected", "v2");
  keys(bundle.v3, v3Keys, "v3");
  app.UTGStorage.validateBundle(bundle);
  if (
    bundle.v3.flowSchema !== "seven-states-v1" ||
    bundle.v3.flowCriteria?.version !== 1
  )
    fail(
      "Nur das aktuelle Team-Flow-Schema seven-states-v1 mit Kriterienversion 1 ist verlustfrei unterstützt.",
    );
  for (const t of bundle.v2.teams) {
    keys(t, "id name description assignments productIds", "Team " + t.id);
    if (
      !Array.isArray(t.productIds) ||
      !object(t.assignments) ||
      Object.keys(t.assignments).length
    )
      fail(
        "Team " +
          t.id +
          ": nur aktuelle Produktzuordnungen und leere Legacy-Assignments unterstützt.",
      );
    if (t.id.includes("::")) fail("Team-ID enthält reservierten Trenner.");
  }
  for (const field of catalogs)
    for (const item of bundle.v3[field] || [])
      keys(item, itemKeys[field], field + "." + item.id);
  for (const [key, c] of Object.entries(bundle.v3.configs)) {
    keys(c, "status entries", "Matrix " + key);
    for (const e of Object.values(c.entries))
      keys(e, entryKeys, "Matrix " + key);
  }
  for (const [id, c] of Object.entries(bundle.v3.teamContracts || {}))
    keys(
      c,
      "business technical operations release escalation",
      "Verantwortung " + id,
    );
  for (const list of Object.values(bundle.v3.teamDesignCriteria || {}))
    for (const c of list)
      keys(
        c,
        "id name description assessmentStatus fulfilled note needsReview assessedAt",
        "Team-Design-Kriterium",
      );
  for (const ratings of Object.values(bundle.v3.teamDesignAssessments || {}))
    for (const r of Object.values(ratings))
      keys(r, "status note assessedAt", "Design-Beurteilung");
  for (const c of Object.values(bundle.v3.agreementConfirmations || {}))
    keys(c, "status signature categorySignature confirmedAt", "Bestätigung");
  if (bundle.v3.flowGovernance)
    keys(
      bundle.v3.flowGovernance,
      "version status workItem pull wip blocked aging exceptions measurementStart measurementEnd sle qualityMinimum decisionRole evidence",
      "Flow-Governance",
    );
  for (const p of bundle.v3.policies || [])
    keys(
      p,
      "name exit owner contributors evidence wip scope type interface standardRevision",
      "Flow-Policy",
    );
  if (own(bundle.v3, "legacyArchive"))
    keys(
      bundle.v3.legacyArchive,
      "retiredServiceFields",
      "Historisches Archiv",
    );
  if (own(bundle.v3, "migrations"))
    keys(
      bundle.v3.migrations,
      "activityCatalog3110 embeddingKinds3141 policyCompletionType3140",
      "Migrationen",
    );
  if (own(bundle.v3.legacyArchive, "retiredServiceFields")) {
    const archive = bundle.v3.legacyArchive.retiredServiceFields;
    if (!object(archive)) fail("Historisches Service-Archiv: Objekt erwartet.");
    for (const record of Object.values(archive))
      keys(record, "capacity criteria", "Archivierter LE-Service");
  }
  if (
    Object.values(bundle.v3.migrations || {}).some(
      (v) => typeof v !== "boolean",
    )
  )
    fail("Ungültige Migrationskennzeichnung.");
  const f = bundle.v3.flowCriteria;
  keys(
    f,
    "version rules phaseGates commonDoR commonDoD teams profiles standardRevision",
    "Flow-Kriterien",
  );
  checkProfile(
    Object.fromEntries(
      ["rules", "phaseGates", "commonDoR", "commonDoD"]
        .filter((k) => own(f, k))
        .map((k) => [k, f[k]]),
    ),
    "ART-Flow",
  );
  for (const [id, p] of Object.entries(f.profiles || {}))
    checkProfile(p, "Team-Flow " + id);
  for (const stages of Object.values(f.teams || {}))
    for (const items of Object.values(stages))
      checkCriteria(items, "Team-Kriterien");
  checkReferences(bundle);
  return true;
}
function checkReferences(b) {
  const d = b.v3,
    teamIds = new Set(b.v2.teams.map((t) => t.id)),
    serviceIds = new Set(d.services.map((s) => s.id)),
    activityNames = new Set(d.activities.map((a) => a.name));
  const checkTeam = (id) => {
    if (!teamIds.has(id)) fail("Verweis auf unbekanntes Team: " + id);
  };
  for (const field of teamFields)
    for (const id of Object.keys(d[field] || {})) checkTeam(id);
  for (const field of ["profiles", "teams"])
    for (const id of Object.keys(d.flowCriteria?.[field] || {})) checkTeam(id);
  for (const [key, c] of Object.entries(d.configs)) {
    if (!key.endsWith("::flow"))
      fail("Legacy- oder unbekannter Matrixschlüssel: " + key);
    checkTeam(key.slice(0, -6));
    for (const [name, e] of Object.entries(c.entries)) {
      if (!activityNames.has(name))
        fail("Matrix verweist auf unbekannte Tätigkeit: " + name);
      if (e.service && !serviceIds.has(e.service))
        fail("Matrix verweist auf unbekannten LE-Service: " + e.service);
    }
  }
  for (const service of d.services)
    if (d.services.some((s) => s.id !== service.id && s.name === service.id))
      fail("Mehrdeutige LE-Service-Kennung: " + service.id);
  for (const a of d.activities)
    if (a.service && !serviceIds.has(a.service))
      fail("Tätigkeit verweist auf unbekannten LE-Service: " + a.name);
  const designIds = new Set((d.designCriteria || []).map((c) => c.id));
  for (const r of Object.values(d.teamDesignAssessments || {}))
    for (const id of Object.keys(r))
      if (!designIds.has(id))
        fail("Beurteilung verweist auf unbekanntes Design-Kriterium: " + id);
}
function teamUnit(b, t) {
  const u = { team: clone(t) };
  if (own(b.v3.configs, t.id + "::flow"))
    u.configs = clone(b.v3.configs[t.id + "::flow"]);
  for (const f of teamFields)
    if (own(b.v3[f], t.id)) u[f] = clone(b.v3[f][t.id]);
  for (const f of ["profiles", "teams"])
    if (own(b.v3.flowCriteria?.[f], t.id))
      u["flow:" + f] = clone(b.v3.flowCriteria[f][t.id]);
  return u;
}
function freshId(id, used) {
  let n = id + "--merge-b",
    i = 2;
  while (used.has(n)) n = id + "--merge-b-" + i++;
  used.add(n);
  return n;
}
function renameTeam(b, old, next) {
  const t = b.v2.teams.find((t) => t.id === old);
  t.id = next;
  for (const f of teamFields) move(b.v3[f], old, next);
  for (const f of ["profiles", "teams"])
    move(b.v3.flowCriteria?.[f], old, next);
  move(b.v3.configs, old + "::flow", next + "::flow");
  if (b.v2.selected === old) b.v2.selected = next;
  if (b.v3.team === old) b.v3.team = next;
}
function move(map, old, next) {
  if (old === next) return;
  if (own(map, old)) {
    map[next] = map[old];
    delete map[old];
  }
}
function renameCatalog(b, field, old, next) {
  const d = b.v3,
    item = d[field].find((x) => x.id === old);
  item.id = next;
  if (field === "products") {
    for (const t of b.v2.teams)
      t.productIds = t.productIds.map((id) => (id === old ? next : id));
    if (d.product === old) d.product = next;
  }
  if (field === "services") {
    move(d.legacyArchive?.retiredServiceFields, old, next);
    for (const c of Object.values(d.configs))
      for (const e of Object.values(c.entries))
        if (e.service === old) e.service = next;
    for (const a of d.activities) if (a.service === old) a.service = next;
  }
  if (field === "designCriteria")
    for (const r of Object.values(d.teamDesignAssessments || {}))
      move(r, old, next);
}
function renameName(b, field, id, name) {
  const items = field === "teams" ? b.v2.teams : b.v3[field],
    item = items.find((x) => x.id === id),
    old = item.name;
  item.name = name;
  if (field === "activities")
    for (const c of Object.values(b.v3.configs)) move(c.entries, old, name);
  if (field === "providerRecords") {
    b.v3.providers = b.v3.providers.map((n) => (n === old ? name : n));
    for (const s of b.v3.services) if (s.provider === old) s.provider = name;
    for (const c of Object.values(b.v3.configs))
      for (const e of Object.values(c.entries)) if (e.org === old) e.org = name;
  }
}
function affected(b, field, item) {
  return b.v2.teams.flatMap((t) => {
    const c = b.v3.configs[t.id + "::flow"];
    const uses = Object.entries(c?.entries || {})
      .filter(([name, e]) =>
        field === "services"
          ? e.service === item.id
          : field === "activities"
            ? name === item.name
            : field === "products"
              ? t.productIds.includes(item.id)
              : true,
      )
      .map(([name]) => name);
    return uses.length
      ? [{ team: t.name, teamId: t.id, activities: uses }]
      : [];
  });
}
/** Choices use conflict keys shown by analyze. A complete team is one conflict unit. */
export function analyze(a, b, choices = {}) {
  validate(a);
  validate(b);
  const A = clone(a),
    B = clone(b),
    conflicts = [],
    warnings = [],
    changes = [],
    renames = [];
  const key = (kind, id) => kind + ":" + id;
  // Apply deliberate "both" decisions first, then compare dependent objects.
  for (const field of ["teams", ...catalogs]) {
    const aa = field === "teams" ? A.v2.teams : A.v3[field] || [],
      bb = field === "teams" ? B.v2.teams : B.v3[field] || [],
      used = new Set([...aa, ...bb].map((x) => x.id));
    for (const item of [...bb]) {
      const other = aa.find((x) => x.id === item.id),
        k = key(field, item.id),
        choice = choices[k];
      if (other && choice?.take === "both") {
        if (
          equal(
            field === "teams" ? teamUnit(A, other) : other,
            field === "teams" ? teamUnit(B, item) : item,
          )
        )
          continue;
        // Opaque historical organisation maps may embed identities. Never guess.
        if (Object.keys(B.organisations || {}).length)
          fail(
            "«Beide behalten» ist bei nicht leeren historischen Organisationsdaten nicht sicher möglich. A oder B wählen.",
          );
        const old = item.id,
          next = freshId(old, used);
        field === "teams"
          ? renameTeam(B, old, next)
          : renameCatalog(B, field, old, next);
        renames.push({ kind: field, from: old, to: next });
        const requested = choice.name?.trim();
        if (requested) renameName(B, field, next, requested);
        changes.push({
          kind: field,
          id: next,
          action: "Beide behalten",
          source: "B",
          originalId: old,
        });
        conflicts.push({
          key: k,
          kind: field,
          label: other.name,
          options: ["A", "B", "both"],
          resolved: true,
          choice: clone(choice),
          a: clone(field === "teams" ? teamUnit(A, other) : other),
          b: clone(field === "teams" ? teamUnit(B, item) : item),
          affectedA: affected(A, field, other),
          affectedB: affected(B, field, item),
        });
      }
    }
  }
  // Resolve equal-name / different-ID situations explicitly. RC3 disallows duplicate names.
  for (const field of ["teams", ...catalogs]) {
    const aa = field === "teams" ? A.v2.teams : A.v3[field] || [],
      bb = field === "teams" ? B.v2.teams : B.v3[field] || [];
    const seen = new Map(
      aa
        .filter((x) => choices[key(field, x.id)]?.take !== "B")
        .map((x) => [x.name.trim().toLocaleLowerCase("de-CH"), x]),
    );
    for (const item of bb) {
      if (
        aa.some((x) => x.id === item.id) &&
        choices[key(field, item.id)]?.take === "A"
      )
        continue;
      const same = seen.get(item.name.trim().toLocaleLowerCase("de-CH"));
      if (same && same.id !== item.id) {
        const k = "name:" + field + ":" + item.id,
          c = choices[k];
        let resolved = false;
        if (c?.name?.trim()) {
          const name = c.name.trim();
          if (
            ![...aa, ...bb.filter((x) => x !== item)].some(
              (x) =>
                x.name.trim().toLocaleLowerCase("de-CH") ===
                name.toLocaleLowerCase("de-CH"),
            )
          ) {
            renameName(B, field, item.id, name);
            resolved = true;
            changes.push({
              kind: field,
              id: item.id,
              action: "Umbenannt",
              before: same.name,
              after: name,
              source: "B",
            });
          }
        }
        conflicts.push({
          key: k,
          kind: "name",
          label: field + " · " + same.name,
          options: ["rename"],
          resolved,
          choice: clone(c),
          a: clone(same),
          b: clone(item),
          affectedB: affected(B, field, item),
        });
      }
      seen.set(item.name.trim().toLocaleLowerCase("de-CH"), item);
    }
  }
  const resolve = (k, kind, label, x, y, allowBoth = false, details = {}) => {
    if (x === undefined) {
      changes.push({ kind, id: k, label, action: "Hinzugefügt", source: "B" });
      return clone(y);
    }
    if (y === undefined) {
      changes.push({ kind, id: k, label, action: "Erhalten", source: "A" });
      return clone(x);
    }
    if (equal(x, y)) {
      changes.push({ kind, id: k, label, action: "Identisch", source: "A+B" });
      return clone(x);
    }
    const c = choices[k],
      resolved = ["A", "B"].includes(c?.take);
    conflicts.push({
      key: k,
      kind,
      label,
      options: allowBoth ? ["A", "B", "both"] : ["A", "B"],
      resolved,
      choice: clone(c),
      a: clone(x),
      b: clone(y),
      ...details,
    });
    if (resolved)
      changes.push({
        kind,
        id: k,
        label,
        action: "Konflikt entschieden",
        source: c.take,
      });
    return clone(c?.take === "B" ? y : x);
  };
  const out = clone(A);
  for (const field of catalogs) {
    if (!own(A.v3, field) && !own(B.v3, field)) continue;
    const aa = A.v3[field] || [],
      bb = B.v3[field] || [];
    out.v3[field] = [...new Set([...aa, ...bb].map((x) => x.id))].map((id) => {
      const x = aa.find((x) => x.id === id),
        y = bb.find((x) => x.id === id);
      return resolve(key(field, id), field, (x || y).name, x, y, true, {
        affectedA: x ? affected(A, field, x) : [],
        affectedB: y ? affected(B, field, y) : [],
      });
    });
  }
  // Matrix entries are keyed by activity name, but identity is the catalog ID.
  // Re-key each source in one pass so swaps never overwrite another entry.
  const referenceErrors = [];
  for (const [source, bundle] of [
    ["A", A],
    ["B", B],
  ]) {
    const mapping = new Map(
      bundle.v3.activities.flatMap((activity) => {
        const target = out.v3.activities.find((x) => x.id === activity.id);
        const pending = conflicts.some(
          (c) => c.key === key("activities", activity.id) && !c.resolved,
        );
        return target && !pending && target.name !== activity.name
          ? [[activity.name, target.name]]
          : [];
      }),
    );
    for (const [configKey, config] of Object.entries(bundle.v3.configs)) {
      const entries = Object.entries(config.entries).map(([name, value]) => [
        mapping.get(name) || name,
        value,
      ]);
      if (new Set(entries.map(([name]) => name)).size !== entries.length) {
        referenceErrors.push(
          "Tätigkeitszuordnung in " +
            source +
            " / " +
            configKey +
            " würde Einträge überschreiben. Tätigkeitsentscheidungen prüfen.",
        );
        continue;
      }
      config.entries = Object.fromEntries(entries);
    }
    for (const [from, to] of mapping)
      changes.push({
        kind: "activityReference",
        source,
        action: "Tätigkeitsverweis angepasst",
        before: from,
        after: to,
      });
  }
  out.v2.teams = [];
  out.v3.configs = {};
  for (const f of teamFields) if (own(A.v3, f) || own(B.v3, f)) out.v3[f] = {};
  out.v3.flowCriteria = clone(A.v3.flowCriteria);
  out.v3.flowCriteria.profiles = {};
  out.v3.flowCriteria.teams = {};
  for (const id of new Set([...A.v2.teams, ...B.v2.teams].map((t) => t.id))) {
    const at = A.v2.teams.find((t) => t.id === id),
      bt = B.v2.teams.find((t) => t.id === id),
      u = resolve(
        key("teams", id),
        "teams",
        (at || bt).name,
        at ? teamUnit(A, at) : undefined,
        bt ? teamUnit(B, bt) : undefined,
        true,
      );
    out.v2.teams.push(u.team);
    if (own(u, "configs")) out.v3.configs[id + "::flow"] = u.configs;
    for (const f of teamFields) if (own(u, f)) out.v3[f][id] = u[f];
    for (const f of ["profiles", "teams"])
      if (own(u, "flow:" + f)) out.v3.flowCriteria[f][id] = u["flow:" + f];
  }
  // A product may have exactly one responsible team. Offer an explicit repair.
  for (const product of [...out.v3.products]) {
    const owners = out.v2.teams.filter((t) =>
      t.productIds.includes(product.id),
    );
    if (owners.length < 2) continue;
    const k = "ownership:" + product.id,
      c = choices[k],
      resolved =
        c?.take === "duplicate" || owners.some((t) => t.id === c?.take);
    conflicts.push({
      key: k,
      kind: "ownership",
      label: "Produktverantwortung · " + product.name,
      options: owners.map((t) => t.id).concat("duplicate"),
      owners: owners.map((t) => ({ id: t.id, name: t.name })),
      resolved,
      choice: clone(c),
      a: { product, teams: owners.map((t) => t.name) },
      b: {
        rule: "Genau ein verantwortliches Team pro Produkt. Bei Produktkopien erhält jede weitere Kopie eine neue ID und den Teamnamen als Namenszusatz.",
      },
    });
    if (!resolved) continue;
    const used = new Set(out.v3.products.map((p) => p.id));
    for (const [i, t] of owners.entries()) {
      if (c.take === "duplicate" && i > 0) {
        const next = clone(product);
        next.id = freshId(product.id, used);
        next.name = product.name + " (" + t.name + ")";
        out.v3.products.push(next);
        t.productIds = t.productIds.map((id) =>
          id === product.id ? next.id : id,
        );
        renames.push({
          kind: "products",
          from: product.id,
          to: next.id,
          team: t.id,
          name: next.name,
        });
      } else if (c.take !== "duplicate" && t.id !== c.take)
        t.productIds = t.productIds.filter((id) => id !== product.id);
    }
    changes.push({
      kind: "ownership",
      id: product.id,
      action: "Konflikt entschieden",
      source: c.take,
    });
  }
  const handled = new Set([
    ...catalogs,
    ...teamFields,
    "configs",
    "flowCriteria",
    "legacyArchive",
    "team",
    "product",
    "navigationEpoch",
    "updated",
  ]);
  for (const field of new Set([...Object.keys(A.v3), ...Object.keys(B.v3)])) {
    if (handled.has(field)) continue;
    if (
      ["providers", "embeddings", "interactions", "legacyModels"].includes(
        field,
      )
    )
      out.v3[field] = [
        ...new Set([...(A.v3[field] || []), ...(B.v3[field] || [])]),
      ];
    else if (["embeddingKinds", "migrations"].includes(field)) {
      out.v3[field] = {};
      for (const k of new Set([
        ...Object.keys(A.v3[field] || {}),
        ...Object.keys(B.v3[field] || {}),
      ]))
        out.v3[field][k] = resolve(
          "global:" + field + ":" + k,
          field,
          field + " · " + k,
          A.v3[field]?.[k],
          B.v3[field]?.[k],
        );
    } else
      out.v3[field] = resolve(
        "global:" + field,
        field,
        field,
        A.v3[field],
        B.v3[field],
      );
  }
  for (const field of new Set([
    ...Object.keys(A.v3.flowCriteria),
    ...Object.keys(B.v3.flowCriteria),
  ]))
    if (!["teams", "profiles"].includes(field))
      out.v3.flowCriteria[field] = resolve(
        "flow:" + field,
        "ART-Flow",
        field,
        A.v3.flowCriteria[field],
        B.v3.flowCriteria[field],
      );
  if (A.v3.legacyArchive || B.v3.legacyArchive) {
    out.v3.legacyArchive = {};
    if (
      own(A.v3.legacyArchive, "retiredServiceFields") ||
      own(B.v3.legacyArchive, "retiredServiceFields")
    )
      out.v3.legacyArchive.retiredServiceFields = {};
    const aa = A.v3.legacyArchive?.retiredServiceFields || {},
      bb = B.v3.legacyArchive?.retiredServiceFields || {};
    for (const id of new Set([...Object.keys(aa), ...Object.keys(bb)]))
      out.v3.legacyArchive.retiredServiceFields[id] = resolve(
        "archive:" + id,
        "Historisches Service-Archiv",
        id,
        aa[id],
        bb[id],
      );
  }
  out.organisations = {};
  for (const k of new Set([
    ...Object.keys(A.organisations || {}),
    ...Object.keys(B.organisations || {}),
  ]))
    out.organisations[k] = resolve(
      "organisation:" + k,
      "Organisation",
      k,
      A.organisations?.[k],
      B.organisations?.[k],
    );
  // Explicit navigation/metadata policy: keep A; no claim of merging browser state.
  warnings.push(
    "Navigation und Export-Metadaten stammen aus A. Fehlende Inhalte löschen nichts.",
  );
  if (
    !equal(a.appVersion, b.appVersion) ||
    !equal(a.releaseStage, b.releaseStage)
  )
    warnings.push(
      "Unterschiedliche App-Versionen: bekanntes Schema wird geprüft. Zielversion muss dieses Schema unterstützen.",
    );
  if (Object.keys(out.v3.agreementConfirmations || {}).length)
    warnings.push(
      "Ursprüngliche Statusbestätigungen bleiben erhalten. Geänderte gemeinsame Inhalte können im Konfigurator eine erneute fachliche Bestätigung erfordern.",
    );
  if (renames.length)
    warnings.push(
      "IDs wurden auf ausdrückliche Auswahl geändert. Bestehende Statusbestätigungen können dadurch eine erneute fachliche Bestätigung benötigen.",
    );
  const unresolved = conflicts.filter((c) => !c.resolved),
    errors = [...referenceErrors];
  if (!unresolved.length)
    try {
      validate(out);
    } catch (e) {
      errors.push(e.message);
    }
  // Verify names after all selections as B may introduce a new name by choosing its object.
  return {
    bundle: out,
    conflicts,
    unresolved: unresolved.length,
    errors,
    warnings,
    changes,
    renames,
    ready: !unresolved.length && !errors.length,
  };
}
