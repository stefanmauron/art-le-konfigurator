import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequire } from "node:module";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import http from "node:http";
import { analyze, validate, stable } from "../src/merge.js";
const require = createRequire(import.meta.url);
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "/Users/stefanmauron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const root = fileURLToPath(new URL("../../", import.meta.url)),
  tool = fileURLToPath(new URL("../", import.meta.url));
const out = process.env.OUTPUT_DIR || path.join(root, ".test-output/merge");
const fixtures = path.join(out, "fixtures");
await fs.mkdir(fixtures, { recursive: true });
await fs.mkdir(out, { recursive: true });
const results = [],
  errors = [];
const check = async (name, fn) => {
  await fn();
  results.push({ name, passed: true });
  console.log("PASS " + name);
};
const save = (file, data) =>
  fs.writeFile(file, JSON.stringify(data, null, 2) + "\n");
const sha = (text) => crypto.createHash("sha256").update(text).digest("hex");
const functional = (x) => {
  const b = structuredClone(x);
  for (const k of ["selected"]) delete b.v2[k];
  for (const k of ["team", "product", "navigationEpoch", "updated"])
    delete b.v3[k];
  return { v2: b.v2, v3: b.v3, organisations: b.organisations };
};
const appURL = pathToFileURL(
  path.join(
    root,
    process.env.UTG_TEST_APP || "dist/UTG-LE_Operating_Model_v3.16_RC4.html",
  ),
).href;
const toolFile = path.join(
  root,
  "dist/UTG-LE_Konfiguration_zusammenfuehren_v1.0.1.html",
);
const browser = await chromium.launch({ channel: "chrome", headless: true });
const server = http.createServer(async (req, res) => {
  try {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.end(await fs.readFile(toolFile));
  } catch {
    res.statusCode = 500;
    res.end();
  }
});
await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
const toolURL = "http://127.0.0.1:" + server.address().port;
const contexts = [];
async function page(url, viewport = { width: 1440, height: 1000 }) {
  const c = await browser.newContext({ acceptDownloads: true, viewport });
  contexts.push(c);
  await c.addInitScript(() => {
    window.showSaveFilePicker = undefined;
  });
  const p = await c.newPage();
  p.setDefaultTimeout(15000);
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("dialog", (d) => d.accept());
  await p.goto(url);
  if (url === appURL) await p.waitForFunction(() => !!window.UTGFlowStandardUI);
  return p;
}
async function imported(p, b) {
  await p.locator("#import").setInputFiles({
    name: "test.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(b)),
  });
  await Promise.all([
    p.waitForNavigation(),
    p
      .getByRole("button", { name: "Konfiguration importieren", exact: true })
      .click(),
  ]);
  await p.waitForFunction(() => !!window.UTGFlowStandardUI);
}
async function exported(p) {
  const wait = p.waitForEvent("download");
  await p.locator("#save").click();
  const d = await wait;
  const file = await d.path();
  return JSON.parse(await fs.readFile(file, "utf8"));
}
function random(seed) {
  return () =>
    (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
}
function makeInput(base, start, seed) {
  const b = structuredClone(base),
    d = b.v3,
    rand = random(seed),
    pick = (xs) => xs[Math.floor(rand() * xs.length)];
  const f = d.flowCriteria,
    profile = Object.fromEntries(
      ["rules", "phaseGates", "commonDoR", "commonDoD"].map((k) => [
        k,
        structuredClone(f[k]),
      ]),
    );
  b.v2.teams = [];
  d.products = [];
  d.configs = {};
  d.teamContracts = {};
  d.teamDesignCriteria = {};
  d.teamDesignAssessments = {};
  d.agreementConfirmations = {};
  f.profiles = {};
  f.teams = {};
  for (let n = start; n < start + 2; n++) {
    const id = "merge-team-" + n,
      pid = "merge-product-" + n;
    b.v2.teams.push({
      id,
      name: "Team " + n,
      description: "Synthetisches Team " + n + " · Seed " + seed,
      productIds: [pid],
      assignments: {},
    });
    d.products.push({
      id: pid,
      name: "Produkt " + n,
      description:
        "Eigenständiger Auftrag " + n + " · " + Math.floor(rand() * 100000),
      wikiUrl: "https://example.invalid/produkt/" + n,
    });
    d.configs[id + "::flow"] = {
      status: "Entwurf",
      entries: Object.fromEntries(
        d.activities.map((a) => [
          a.name,
          {
            org: pick(d.providers),
            orgSource: "explicit",
            embedding: pick(d.embeddings),
            interaction: pick(d.interactions),
            business: "PO " + n + " · " + Math.floor(rand() * 1000),
            technical: "Tech " + n,
            operations: "Betrieb " + n,
            service: rand() < 0.7 ? pick(d.services).id : "",
            note: "Zufall " + Math.floor(rand() * 1000000) + " · " + a.id,
          },
        ]),
      ),
    };
    d.teamContracts[id] = {
      business: "Fach " + n,
      technical: "Technik " + n,
      operations: "Betrieb " + n,
      release: "Release " + n,
      escalation: "Eskalation " + Math.floor(rand() * 1000),
    };
    d.teamDesignCriteria[id] = d.designCriteria.map((c) => ({
      ...structuredClone(c),
      fulfilled: false,
      assessmentStatus: pick([
        "Nicht beurteilt",
        "Teilweise erfüllt",
        "Nicht erfüllt",
      ]),
      note: "Beurteilung " + n + " · " + Math.floor(rand() * 10000),
      needsReview: false,
    }));
    f.profiles[id] = structuredClone(profile);
    f.profiles[id].commonDoD[0].description +=
      " Team " + n + " prüft Stichprobe " + Math.floor(rand() * 10000) + ".";
    f.profiles[id].commonDoR[0].owner = "PO " + n;
    f.profiles[id].rules.Implementing.criteria[0].evidence =
      "Testnachweis " + n;
    f.teams[id] = {};
  }
  b.v2.selected = b.v2.teams[0].id;
  d.team = b.v2.selected;
  d.product = b.v2.teams[0].productIds[0];
  return b;
}
let A, B, merged;
try {
  await check(
    "Zwei echte RC3-Exporte mit Team 1–4, Produkt 1–4 und zufälligen Matrizen erzeugt",
    async () => {
      const p = await page(appURL),
        base = await exported(p);
      for (const [i, start, seed] of [
        [0, 1, 20261108],
        [1, 3, 193107],
      ]) {
        const input = makeInput(base, start, seed);
        await imported(p, input);
        const actual = await exported(p);
        validate(actual);
        // Production export must preserve all explicitly provided domain values.
        assert.equal(stable(functional(actual)), stable(functional(input)));
        await save(path.join(fixtures, "Laptop-" + (i + 1) + ".json"), actual);
        if (i === 0) A = actual;
        else B = actual;
      }
      assert.notEqual(stable(A.v3.configs), stable(B.v3.configs));
    },
  );
  await check(
    "Zusammenführung erhält jeden fachlichen Wert beider Exporte",
    () => {
      const before = [stable(A), stable(B)],
        r = analyze(A, B);
      assert.equal(r.ready, true, JSON.stringify(r.errors));
      assert.equal(r.conflicts.length, 0);
      merged = r.bundle;
      assert.equal(merged.v2.teams.length, 4);
      assert.equal(merged.v3.products.length, 4);
      for (const b of [A, B]) {
        for (const t of b.v2.teams) {
          assert.deepEqual(
            merged.v2.teams.find((x) => x.id === t.id),
            t,
          );
          assert.deepEqual(
            merged.v3.configs[t.id + "::flow"],
            b.v3.configs[t.id + "::flow"],
          );
        }
        for (const f of [
          "teamContracts",
          "teamDesignCriteria",
          "teamDesignAssessments",
          "agreementConfirmations",
        ])
          for (const [id, value] of Object.entries(b.v3[f] || {}))
            assert.deepEqual(merged.v3[f][id], value);
        for (const f of ["teams", "profiles"])
          for (const [id, value] of Object.entries(b.v3.flowCriteria[f]))
            assert.deepEqual(merged.v3.flowCriteria[f][id], value);
        for (const f of [
          "products",
          "services",
          "activities",
          "designCriteria",
          "providerRecords",
        ])
          for (const v of b.v3[f] || [])
            assert.deepEqual(
              merged.v3[f].find((x) => x.id === v.id),
              v,
            );
      }
      assert.deepEqual([stable(A), stable(B)], before);
    },
  );
  await check(
    "HTML offline: Dateien auswählen, Vorschau und tatsächliche JSON-/Bericht-Downloads",
    async () => {
      const p = await page(pathToFileURL(toolFile).href),
        requests = [];
      p.on("request", (r) => requests.push(r.url()));
      await p
        .locator("#file-a")
        .setInputFiles(path.join(fixtures, "Laptop-1.json"));
      await p.locator("#state-0").filter({ hasText: "2 Teams" }).waitFor();
      await p
        .locator("#file-b")
        .setInputFiles(path.join(fixtures, "Laptop-2.json"));
      await p.locator("#download:not([disabled])").waitFor();
      const wait = p.waitForEvent("download");
      await p.locator("#download").click();
      const d = await wait;
      const raw = await fs.readFile(await d.path(), "utf8");
      assert.deepEqual(JSON.parse(raw), merged);
      await fs.writeFile(path.join(fixtures, "Zusammengefuehrt.json"), raw);
      const rw = p.waitForEvent("download");
      await p.locator("#report").click();
      const report = JSON.parse(
        await fs.readFile(await (await rw).path(), "utf8"),
      );
      assert.equal(report.ready, true);
      assert.equal(
        report.inputs[0].sha256,
        sha(await fs.readFile(path.join(fixtures, "Laptop-1.json"), "utf8")),
      );
      await save(path.join(out, "zusammenfuehrungsbericht.json"), report);
      assert.equal(requests.length, 0);
      await p.screenshot({
        path: path.join(out, "desktop.png"),
        fullPage: true,
      });
    },
  );
  await check(
    "Tatsächlicher Import → Export → erneuter Import ohne fachliche Änderungen",
    async () => {
      const p = await page(appURL);
      await imported(p, merged);
      const first = await exported(p);
      assert.equal(stable(functional(first)), stable(functional(merged)));
      await save(path.join(out, "nach-import-export.json"), first);
      await save(path.join(out, "datenvergleich.json"), {
        inputDomainSha256: sha(stable(functional(merged))),
        afterImportExportDomainSha256: sha(stable(functional(first))),
        domainEqual: stable(functional(merged)) === stable(functional(first)),
        excludedTechnicalFields: [
          "exported",
          "appVersion",
          "releaseStage",
          "v2.selected",
          "v3.team",
          "v3.product",
          "v3.navigationEpoch",
          "v3.updated",
        ],
        teams: first.v2.teams.map((t) => ({
          id: t.id,
          name: t.name,
          products: t.productIds,
          matrixEntries: Object.keys(first.v3.configs[t.id + "::flow"].entries)
            .length,
        })),
      });
      await imported(p, first);
      const second = await exported(p);
      assert.equal(stable(functional(first)), stable(functional(second)));
      const teams = await p.evaluate(() =>
        UTGStorage.snapshot().v2.teams.map((t) => t.name),
      );
      assert.deepEqual(teams, ["Team 1", "Team 2", "Team 3", "Team 4"]);
      await p.screenshot({
        path: path.join(out, "konfigurator-nach-import.png"),
        fullPage: true,
      });
    },
  );
  await check(
    "Keine Duplikate beim wiederholten Zusammenführen und umgekehrte Eingabereihenfolge",
    () => {
      const same = analyze(A, A);
      assert.equal(same.ready, true);
      assert.equal(stable(functional(same.bundle)), stable(functional(A)));
      const repeated = analyze(merged, B);
      assert.equal(repeated.ready, true);
      assert.equal(
        stable(functional(repeated.bundle)),
        stable(functional(merged)),
      );
      const reversed = analyze(B, A);
      assert.equal(reversed.ready, true);
      assert.deepEqual(
        [...reversed.bundle.v2.teams].sort((a, b) => a.id.localeCompare(b.id)),
        [...merged.v2.teams].sort((a, b) => a.id.localeCompare(b.id)),
      );
    },
  );
  async function upload(p, a, b) {
    for (const [id, value] of [
      ["file-a", a],
      ["file-b", b],
    ]) {
      await p.locator("#" + id).setInputFiles({
        name: id + ".json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(value)),
      });
      await p
        .locator("#state-" + (id === "file-a" ? 0 : 1))
        .filter({ hasText: "Teams" })
        .waitFor();
    }
  }
  async function downloadMerged(p) {
    const wait = p.waitForEvent("download");
    await p.locator("#download").click();
    return JSON.parse(await fs.readFile(await (await wait).path(), "utf8"));
  }
  await check(
    "Browser: Teamkonflikt A/B, blockierter Download und unveränderte gewählte Team-Einheit",
    async () => {
      const b = structuredClone(A),
        id = A.v2.teams[0].id;
      b.v3.teamContracts[id].business = "Abweichende Rolle";
      const p = await page(toolURL);
      await upload(p, A, b);
      await p.locator('select[data-key="teams:' + id + '"]').waitFor();
      assert.equal(await p.locator("#download").isDisabled(), true);
      await p.locator('select[data-key="teams:' + id + '"]').selectOption("B");
      await p.locator("#download:not([disabled])").waitFor();
      const combined = await downloadMerged(p);
      assert.deepEqual(combined.v3.teamContracts[id], b.v3.teamContracts[id]);
      const target = await page(appURL);
      await imported(target, combined);
      const roundtrip = await exported(target);
      assert.equal(stable(functional(roundtrip)), stable(functional(combined)));
      await p.screenshot({
        path: path.join(out, "teamkonflikt.png"),
        fullPage: true,
      });
    },
  );
  await check(
    "Browser: beide Teams, neue ID, Namensklärung und Produktkopie tatsächlich importiert",
    async () => {
      const b = structuredClone(A),
        id = A.v2.teams[0].id;
      b.v3.teamContracts[id].business = "Eigenständiges Team";
      const p = await page(toolURL);
      await upload(p, A, b);
      await p
        .locator('select[data-key="teams:' + id + '"]')
        .selectOption("both");
      const name = p.locator('input[data-key^="name:teams:"]');
      await name.fill("Eigenständiges Team B");
      await name.press("Tab");
      await p
        .locator('select[data-key^="ownership:"]')
        .selectOption("duplicate");
      await p.locator("#download:not([disabled])").waitFor();
      const combined = await downloadMerged(p);
      assert.equal(combined.v2.teams.length, 3);
      assert.equal(combined.v3.products.length, 3);
      const target = await page(appURL);
      await imported(target, combined);
      const roundtrip = await exported(target);
      assert.equal(stable(functional(roundtrip)), stable(functional(combined)));
      await save(path.join(out, "beide-teams-import-export.json"), roundtrip);
    },
  );
  await check(
    "Browser: beide LE-Services, neue ID und alle Verweise korrekt nach Import",
    async () => {
      const b = structuredClone(B),
        id = b.v3.services[0].id;
      b.v3.services[0].provider = "BIT";
      const p = await page(toolURL);
      await upload(p, A, b);
      await p
        .locator('select[data-key="services:' + id + '"]')
        .selectOption("both");
      const name = p.locator('input[data-key^="name:services:"]');
      await name.fill("Zusätzlicher Service Laptop 2");
      await name.press("Tab");
      await p.locator("#download:not([disabled])").waitFor();
      const combined = await downloadMerged(p);
      const target = await page(appURL);
      await imported(target, combined);
      const roundtrip = await exported(target);
      assert.equal(stable(functional(roundtrip)), stable(functional(combined)));
    },
  );
  await check(
    "Browser: beide Tätigkeiten mit umbenannten Matrixschlüsseln verlustfrei importiert",
    async () => {
      const b = structuredClone(B),
        activity = b.v3.activities[0];
      activity.description = "Abweichende Tätigkeit B";
      let choices = { ["activities:" + activity.id]: { take: "both" } };
      let r = analyze(A, b, choices);
      choices[r.conflicts.find((c) => c.kind === "name").key] = {
        name: "Eigenständige Tätigkeit B",
      };
      r = analyze(A, b, choices);
      assert.equal(r.ready, true);
      const target = await page(appURL);
      await imported(target, r.bundle);
      const roundtrip = await exported(target);
      assert.equal(stable(functional(roundtrip)), stable(functional(r.bundle)));
    },
  );
  await check(
    "Browser: beide Produkte mit neuen IDs erhalten Produktzuordnungen und Texte",
    async () => {
      const b = structuredClone(B),
        p1 = A.v3.products[0],
        old = b.v3.products[0].id;
      b.v3.products[0] = {
        ...structuredClone(p1),
        description: "Eigenständiger Auftrag B",
      };
      b.v2.teams[0].productIds[0] = p1.id;
      b.v3.product = p1.id;
      let choices = { ["products:" + p1.id]: { take: "both" } };
      let r = analyze(A, b, choices);
      choices[r.conflicts.find((c) => c.kind === "name").key] = {
        name: "Eigenständiges Produkt B",
      };
      r = analyze(A, b, choices);
      assert.equal(r.ready, true);
      const target = await page(appURL);
      await imported(target, r.bundle);
      assert.equal(
        stable(functional(await exported(target))),
        stable(functional(r.bundle)),
      );
      assert.notEqual(old, p1.id);
    },
  );
  await check(
    "Browser: bestehende Freigabebestätigung bleibt als ursprünglicher Nachweis unverändert",
    async () => {
      const a = structuredClone(A),
        id = a.v2.teams[0].id,
        target = await page(appURL);
      await imported(target, a);
      const confirmation = await target.evaluate((id) => {
        const s = UTGStorage.snapshot();
        return {
          status: "Freigegeben",
          signature: UTGAgreement.signature(s.v3, id, s.v2.teams),
          categorySignature: UTGAgreement.categorySignature(s.v3, id),
          confirmedAt: "2026-11-08T12:00:00.000Z",
        };
      }, id);
      a.v3.configs[id + "::flow"].status = "Freigegeben";
      a.v3.agreementConfirmations[id] = confirmation;
      const r = analyze(a, B);
      assert.equal(r.ready, true);
      await imported(target, r.bundle);
      const roundtrip = await exported(target);
      assert.deepEqual(roundtrip.v3.agreementConfirmations[id], confirmation);
      assert.equal(stable(functional(roundtrip)), stable(functional(r.bundle)));
    },
  );
  await check(
    "Browser: beschädigte Datei und Dateiaustausch entfernen altes Ergebnis und Entscheidungen",
    async () => {
      const p = await page(toolURL);
      await upload(p, A, B);
      await p.locator("#download:not([disabled])").waitFor();
      await p.locator("#file-b").setInputFiles({
        name: "broken.json",
        mimeType: "application/json",
        buffer: Buffer.from("{broken"),
      });
      await p.locator("#error:not([hidden])").waitFor();
      assert.equal(await p.locator("#download").isDisabled(), true);
      assert.equal(await p.locator("#report").isDisabled(), true);
      const b = structuredClone(A);
      b.v3.teamContracts[b.v2.teams[0].id].business = "Changed";
      await upload(p, A, b);
      assert.equal(await p.locator("#download").isDisabled(), true);
      await p.locator("select").selectOption("A");
      await p.locator("#download:not([disabled])").waitFor();
      await p.locator("#file-b").setInputFiles([]);
      assert.equal(await p.locator("#download").isDisabled(), true);
      assert.equal(await p.locator("select").count(), 0);
    },
  );
  await check(
    "Browser: RC3-Import abbrechen oder ungültige Datei laden erhält bisherigen Speicher",
    async () => {
      const p = await page(appURL);
      await imported(p, A);
      const before = await p.evaluate(() => UTGStorage.snapshot());
      await p.locator("#import").setInputFiles({
        name: "B.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(B)),
      });
      await p.getByRole("button", { name: "Abbrechen", exact: true }).click();
      assert.deepEqual(await p.evaluate(() => UTGStorage.snapshot()), before);
      const broken = structuredClone(B);
      broken.v3.products[0].wikiUrl = "javascript:alert(1)";
      await p.locator("#import").setInputFiles({
        name: "bad.json",
        mimeType: "application/json",
        buffer: Buffer.from(JSON.stringify(broken)),
      });
      await p
        .locator("#status")
        .filter({ hasText: "Import fehlgeschlagen" })
        .waitFor();
      assert.deepEqual(await p.evaluate(() => UTGStorage.snapshot()), before);
    },
  );
  await check(
    "Browser: 390px und 1440px, keine horizontale Seitenüberbreite, keine Serverabhängigkeit",
    async () => {
      for (const width of [390, 1440]) {
        const p = await page(toolURL, { width, height: 900 });
        await upload(p, A, B);
        await p.locator("#download:not([disabled])").waitFor();
        assert.ok(
          await p.evaluate(
            () => document.documentElement.scrollWidth <= innerWidth,
          ),
        );
        await p.screenshot({
          path: path.join(out, "layout-" + width + ".png"),
          fullPage: true,
        });
      }
    },
  );
  const extraRoundtrips = [];
  async function verifyRoundtrip(target, bundle, label) {
    const before = stable(functional(bundle));
    await imported(target, bundle);
    const actual = await exported(target);
    assert.equal(stable(functional(actual)), before, label);
    extraRoundtrips.push({
      label,
      teams: bundle.v2.teams.length,
      products: bundle.v3.products.length,
      expectedSha256: sha(before),
      actualSha256: sha(stable(functional(actual))),
      equal: true,
    });
    return actual;
  }
  function decide(a, b, mode) {
    const choices = {};
    for (let pass = 0; pass < 20; pass++) {
      const r = analyze(a, b, choices);
      if (r.ready) return r;
      const pending = r.conflicts.filter((c) => !c.resolved);
      assert.ok(pending.length, JSON.stringify(r.errors));
      for (const c of pending) {
        if (c.kind === "name")
          choices[c.key] = { name: c.b.name + " · Zusatz " + pass };
        else if (c.kind === "ownership") choices[c.key] = { take: "duplicate" };
        else
          choices[c.key] = {
            take:
              mode === "both"
                ? c.options.includes("both")
                  ? "both"
                  : "A"
                : mode,
          };
      }
    }
    throw Error("Konflikte nicht konvergiert");
  }
  await check(
    "Zusatz: umbenannte Tätigkeit mit gleicher ID, A und B via Oberfläche gewählt und importiert",
    async () => {
      const b = structuredClone(B),
        a = b.v3.activities[0],
        old = a.name;
      a.name = "Umbenannte Tätigkeit Laptop 2";
      for (const c of Object.values(b.v3.configs)) {
        c.entries[a.name] = c.entries[old];
        delete c.entries[old];
      }
      const target = await page(appURL);
      for (const take of ["A", "B"]) {
        const p = await page(toolURL);
        await upload(p, A, b);
        await p
          .locator('select[data-key="activities:' + a.id + '"]')
          .selectOption(take);
        await p.locator("#download:not([disabled])").waitFor();
        const combined = await downloadMerged(p);
        await verifyRoundtrip(
          target,
          combined,
          "Tätigkeit umbenannt / " + take,
        );
        assert.equal(
          combined.v3.activities.find((x) => x.id === a.id).name,
          take === "A" ? old : a.name,
        );
      }
    },
  );
  await check(
    "Zusatz: vertauschte Tätigkeitsnamen ohne falsche Namenskonflikte oder verlorene Matrixwerte",
    async () => {
      const b = structuredClone(B),
        names = b.v3.activities.slice(0, 2).map((a) => a.name);
      for (const c of Object.values(b.v3.configs)) {
        const first = c.entries[names[0]],
          second = c.entries[names[1]];
        c.entries[names[0]] = second;
        c.entries[names[1]] = first;
      }
      b.v3.activities[0].name = names[1];
      b.v3.activities[1].name = names[0];
      const p = await page(toolURL);
      await upload(p, A, b);
      for (const a of b.v3.activities.slice(0, 2))
        await p
          .locator('select[data-key="activities:' + a.id + '"]')
          .selectOption("B");
      await p.locator("#download:not([disabled])").waitFor();
      assert.equal(await p.locator('input[data-key^="name:"]').count(), 0);
      const combined = await downloadMerged(p),
        target = await page(appURL);
      await verifyRoundtrip(target, combined, "Vertauschte Tätigkeitsnamen");
      for (const t of A.v2.teams) {
        const e = combined.v3.configs[t.id + "::flow"].entries;
        assert.deepEqual(
          e[names[1]],
          A.v3.configs[t.id + "::flow"].entries[names[0]],
        );
      }
    },
  );
  await check(
    "Zusatz: mehrere Team-, Produkt- und Servicekonflikte gleichzeitig vollständig importiert",
    async () => {
      const b = structuredClone(A);
      for (const t of b.v2.teams)
        b.v3.teamContracts[t.id].business += " Variante B";
      for (const p of b.v3.products) p.description += " Variante B";
      for (const service of b.v3.services.slice(0, 3)) service.provider = "BIT";
      const r = decide(A, b, "both"),
        target = await page(appURL);
      assert.equal(r.bundle.v2.teams.length, 4);
      assert.equal(r.bundle.v3.products.length, 4);
      await verifyRoundtrip(
        target,
        r.bundle,
        "Mehrere gleichzeitige Konflikte / beide",
      );
      await verifyRoundtrip(
        target,
        decide(A, b, "B").bundle,
        "Mehrere gleichzeitige Konflikte / B",
      );
    },
  );
  await check(
    "Zusatz: 15 weitere Zufallszusammenführungen im tatsächlichen RC3-Import-/Export-Roundtrip",
    async () => {
      const target = await page(appURL);
      for (let seed = 0; seed < 15; seed++) {
        const a = structuredClone(A),
          b = structuredClone(B),
          rand = random(92000 + seed);
        for (const x of [a, b])
          for (const config of Object.values(x.v3.configs))
            for (const entry of Object.values(config.entries)) {
              entry.note =
                "Zufall " + Math.floor(rand() * 1000000) + " · Äöü 🧭";
              entry.business = "Rolle " + Math.floor(rand() * 10000);
              entry.service =
                rand() < 0.8
                  ? x.v3.services[Math.floor(rand() * x.v3.services.length)].id
                  : "";
            }
        const r = analyze(a, b);
        assert.equal(r.ready, true);
        await verifyRoundtrip(target, r.bundle, "Zufalls-Roundtrip " + seed);
      }
    },
  );
  await check(
    "Zusatz: zehn Exporte sukzessive zu 20 Teams / 20 Produkten / 640 Matrixeinträgen kombiniert",
    async () => {
      const base = structuredClone(A);
      let combined;
      for (let i = 0; i < 10; i++) {
        const next = makeInput(base, 10 + i * 2, 71000 + i);
        if (!combined) combined = next;
        else {
          const r = analyze(combined, next);
          assert.equal(r.ready, true);
          combined = r.bundle;
        }
      }
      assert.equal(combined.v2.teams.length, 20);
      assert.equal(combined.v3.products.length, 20);
      assert.equal(
        Object.values(combined.v3.configs).reduce(
          (n, c) => n + Object.keys(c.entries).length,
          0,
        ),
        640,
      );
      const target = await page(appURL);
      const actual = await verifyRoundtrip(
        target,
        combined,
        "20 Teams / 20 Produkte / 640 Matrixeinträge",
      );
      const repeated = analyze(actual, makeInput(base, 28, 71009));
      assert.equal(repeated.ready, true);
      assert.equal(repeated.bundle.v2.teams.length, 20);
    },
  );
  await save(path.join(out, "additional-roundtrips.json"), {
    passed: extraRoundtrips.length,
    results: extraRoundtrips,
  });
  await save(path.join(out, "browser-tests.json"), {
    passed: results.length,
    results,
    errors,
    inputs: await Promise.all(
      ["Laptop-1.json", "Laptop-2.json", "Zusammengefuehrt.json"].map(
        async (name) => ({
          name,
          sha256: sha(await fs.readFile(path.join(fixtures, name))),
        }),
      ),
    ),
  });
} catch (e) {
  await save(path.join(out, "browser-failure.json"), {
    error: e.stack,
    results,
    errors,
  });
  throw e;
} finally {
  await Promise.all(contexts.map((c) => c.close()));
  await browser.close();
  await new Promise((resolve) => server.close(resolve));
}
assert.deepEqual(errors, []);
console.log("Browserprüfungen abgeschlossen.");
