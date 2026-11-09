// Real CRUD, matrix change handlers, criteria drawers, download, standard reset and import.
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "/Users/stefanmauron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const { appRoot, repoRoot, appFile } = require("../helpers/paths.cjs");
const out =
  process.env.OUTPUT_DIR ||
  path.join(appRoot, ".test-output/browser-roundtrip");
fs.mkdirSync(out, { recursive: true });
const checks = [],
  errors = [],
  expected = {
    seed: 20261106,
    products: [],
    teams: [],
    matrix: {},
    criteria: [],
  };
let seed = expected.seed;
const rand = () =>
  (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
const shuffle = (a) => {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};
const canonical = (x) =>
  Array.isArray(x)
    ? x.map(canonical)
    : x && typeof x === "object"
      ? Object.fromEntries(
          Object.keys(x)
            .sort()
            .map((k) => [k, canonical(x[k])]),
        )
      : x;
const hash = (x) =>
  crypto
    .createHash("sha256")
    .update(JSON.stringify(canonical(x)))
    .digest("hex");
const payload = (b) => ({ v2: b.v2, v3: b.v3, organisations: b.organisations });
// These four fields are UI context, not team/product records or agreements. Keep
// raw snapshots and explicit context values; compare every other persisted field.
const dataPayload = (b) => {
  const d = structuredClone(payload(b));
  delete d.v2.selected;
  for (const k of ["team", "product", "navigationEpoch"]) delete d.v3[k];
  return d;
};
const navigation = (b) => ({
  selected: b.v2.selected,
  team: b.v3.team,
  product: b.v3.product,
  navigationEpoch: b.v3.navigationEpoch,
});
const write = (name, data) =>
  fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 2) + "\n");
function check(name, fn) {
  fn();
  checks.push({ name, ok: true });
  write("checks.json", checks);
  console.log("PASS " + name);
}
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const context = await browser.newContext({
        acceptDownloads: true,
        viewport: { width: 1440, height: 1000 },
      }),
      p = await context.newPage();
    p.setDefaultTimeout(15000);
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("dialog", (d) => d.accept());
    const snap = () => p.evaluate(() => UTGStorage.snapshot());
    const ready = () =>
      p.waitForFunction(
        () => !!window.UTGFlowStandardUI && !!window.UTGRuleDetails,
      );
    const tab = async (i) => {
      await p.locator("#utg-nav button").nth(i).click();
    };
    async function saveCrud() {
      await p.getByRole("button", { name: "Übernehmen", exact: true }).click();
      await p.waitForLoadState("load");
      await ready();
    }
    await p.goto(
      (process.env.BASE_URL || "http://127.0.0.1:8773") +
        "/" +
        encodeURI(
          path
            .relative(
              repoRoot,
              appFile("dist/UTG-LE_Operating_Model_v3.16_RC3.html"),
            )
            .split(path.sep)
            .join("/"),
        ),
    );
    await ready();
    let teams;
    if (!process.env.UTG_ROUNDTRIP_CHECKPOINT) {
      // Empty synthetic scaffold only; every requested record is created through the real UI.
      await p.evaluate(() => {
        const b = UTGDefaults.baseline();
        b.v2 = { teams: [], selected: "" };
        b.v3.products = [];
        b.v3.configs = {};
        b.v3.team = "";
        b.v3.product = "";
        for (const key of [
          "teamDesignCriteria",
          "teamDesignAssessments",
          "teamContracts",
          "agreementConfirmations",
        ])
          b.v3[key] = {};
        b.v3.flowCriteria.profiles = {};
        b.v3.flowCriteria.teams = {};
        UTGStorage.restore(b);
      });
      await p.reload();
      await ready();
      await tab(1);
      for (let i = 0; i < 40; i++) {
        const product = {
          name: "Roundtrip-Produkt " + String(i + 1).padStart(2, "0"),
          description:
            "Produkt " +
            (i + 1) +
            " unterstützt die Geschäftsführung. Freitext mit Umlauten äöü, «Nachweis», & sowie Zeilenumbruch.\nEigener Umfang " +
            (i + 1) +
            ".",
          wikiUrl:
            "https://example.invalid/produkte/" +
            (i + 1) +
            "?sprache=de&kontext=roundtrip#nachweis",
        };
        await p.locator("#crud-add-product").click();
        await p.locator("#crud-name").fill(product.name);
        await p.locator("#crud-description").fill(product.description);
        await p.locator("#crud-wiki").fill(product.wikiUrl);
        await saveCrud();
        expected.products.push(product);
        console.log("PRODUCT " + (i + 1));
      }
      const products = (await snap()).v3.products,
        assignment = shuffle(products.map((x) => x.id));
      for (let i = 0; i < 20; i++) {
        const team = {
          name: "Roundtrip-Team " + String(i + 1).padStart(2, "0"),
          productIds: assignment.slice(i * 2, i * 2 + 2),
        };
        await p.locator("#crud-add-team").click();
        await p.locator("#crud-name").fill(team.name);
        for (const id of team.productIds)
          await p
            .locator("#crud-memberships input")
            .filter({ visible: true })
            .evaluateAll((es, id) => {
              const e = es.find((x) => x.value === id);
              if (!e) throw Error("Produkt fehlt " + id);
              e.click();
            }, id);
        await saveCrud();
        expected.teams.push(team);
        console.log("TEAM " + (i + 1));
      }
      let s = await snap();
      teams = s.v2.teams;
      check("20 Teams und 40 Produkte über CRUD angelegt", () => {
        assert.equal(teams.length, 20);
        assert.equal(s.v3.products.length, 40);
        assert.equal(new Set(teams.flatMap((t) => t.productIds)).size, 40);
        assert.equal(teams.flatMap((t) => t.productIds).length, 40);
        for (const t of teams)
          assert.deepEqual(
            [...t.productIds].sort(),
            [
              ...expected.teams.find((x) => x.name === t.name).productIds,
            ].sort(),
          );
        for (const product of s.v3.products)
          assert.deepEqual(
            {
              name: product.name,
              description: product.description,
              wikiUrl: product.wikiUrl,
            },
            expected.products.find((x) => x.name === product.name),
          );
      });
      const template = structuredClone(s.v3.flowCriteria),
        policies = structuredClone(s.v3.policies);
      await tab(2);
      for (const [ti, t] of teams.entries()) {
        await p.locator("#v3team").selectOption(t.id);
        const n = await p.locator("#v3rows tr[data-i]").count();
        assert.equal(n, 32);
        const indices = shuffle(Array.from({ length: n }, (_, i) => i));
        const isc = new Set(indices.slice(0, 5)),
          bit = indices[5];
        // DOM events invoke the same handlers as manual editing. Each save rerenders the table,
        // so query the current control anew for every field; never mutate stored matrix data.
        const plan = await p.evaluate(
          ({ ti, isc, bit }) =>
            Array.from(document.querySelectorAll("#v3rows tr[data-i]")).map(
              (row, ri) => {
                const fields = {};
                for (const f of [
                  "org",
                  "embedding",
                  "interaction",
                  "business",
                  "technical",
                  "operations",
                  "service",
                  "note",
                ]) {
                  const el = row.querySelector(
                    '[data-f="' + f + '"] input,[data-f="' + f + '"] select',
                  );
                  if (f === "org")
                    fields[f] = isc.includes(ri)
                      ? "ISCeco"
                      : ri === bit
                        ? "BIT"
                        : "UTG-ART";
                  else if (el.tagName === "SELECT") {
                    const options = [...el.options].filter(
                      (o) =>
                        o.value &&
                        !/Noch zu klären|Nicht erforderlich/.test(o.value),
                    );
                    if (f === "service") {
                      const provider = fields.org;
                      const services = UTGStorage.snapshot().v3.services;
                      const match = options.find((o) =>
                        services.some(
                          (s) =>
                            s.id === o.value &&
                            (s.provider === provider || s.org === provider),
                        ),
                      );
                      fields[f] = match?.value || options[0]?.value || "";
                    } else
                      fields[f] =
                        options[(ti + ri) % options.length]?.value || "";
                  } else
                    fields[f] =
                      "Team " +
                      (ti + 1) +
                      " · " +
                      row.cells[1].textContent +
                      " · " +
                      f +
                      " · äöü & Nachweis";
                }
                return { name: row.cells[1].textContent, fields };
              },
            ),
          { ti, isc: [...isc], bit },
        );
        await p.evaluate((plan) => {
          for (const [ri, item] of plan.entries())
            for (const [field, value] of Object.entries(item.fields)) {
              const el = document
                .querySelectorAll("#v3rows tr[data-i]")
                [
                  ri
                ].querySelector('[data-f="' + field + '"] input,[data-f="' + field + '"] select');
              el.value = value;
              el.dispatchEvent(new Event("change", { bubbles: true }));
              if (document.querySelector('[aria-invalid="true"]'))
                throw Error("Speicherfehler " + field);
            }
        }, plan);
        expected.matrix[t.id] = plan;
        const saved = (await snap()).v3.configs[t.id + "::flow"].entries;
        check("Vollständige Matrix und 5 ISCeco / 1 BIT · " + t.name, () => {
          assert.equal(Object.keys(saved).length, 32);
          assert.equal(
            Object.values(saved).filter((e) => e.org === "ISCeco").length,
            5,
          );
          assert.equal(
            Object.values(saved).filter((e) => e.org === "BIT").length,
            1,
          );
          for (const item of plan)
            for (const [field, value] of Object.entries(item.fields)) {
              assert.equal(saved[item.name][field], value);
              assert(value, "Leeres Matrixfeld " + field);
            }
        });
        console.log("MATRIX " + (ti + 1));
      }
      await tab(3);
      const stages = await p.evaluate(() => UTGFlow.states);
      for (const [ti, t] of teams.slice(0, 10).entries()) {
        await p.locator("#model-view").selectOption("team:" + t.id);
        for (const [si, stage] of stages.entries()) {
          await p.locator('[data-policy="' + si + '"]').click();
          await p.locator("#utg-rule-details[open]").waitFor();
          for (const type of si === 0
            ? ["Phase", "AC", "DoR", "DoD"]
            : ["Phase", "AC"]) {
            await p.locator('[data-edit-flow="' + type + '"]').click();
            if (
              (await p
                .locator("#flow-criteria-fields .flow-criteria-editor")
                .count()) === 0
            )
              await p.locator("#flow-add").click();
            const changed = await p
              .locator("#flow-criteria-fields .flow-criteria-editor")
              .evaluateAll(
                (rows, { ti, stage, type }) =>
                  rows.map((row, i) => {
                    const item = {
                      id: row.dataset.id,
                      type: row.querySelector('[data-field="type"]').value,
                    };
                    for (const field of [
                      "description",
                      "owner",
                      "contributors",
                      "evidence",
                    ]) {
                      const value =
                        "Team " +
                        (ti + 1) +
                        " · " +
                        stage +
                        " · " +
                        type +
                        " · Kriterium " +
                        (i + 1) +
                        " · " +
                        field +
                        " äöü";
                      row.querySelector('[data-field="' + field + '"]').value =
                        value;
                      item[field] = value;
                    }
                    return item;
                  }),
                { ti, stage, type },
              );
            await p
              .getByRole("button", { name: "Kriterien speichern", exact: true })
              .click();
            await p.locator("#utg-rule-details[open]").waitFor();
            expected.criteria.push({ team: t.id, stage, type, items: changed });
          }
          await p.locator("#utg33close").click();
          await p
            .locator("#utg-rule-details[open]")
            .waitFor({ state: "hidden" });
        }
        console.log("FLOW " + (ti + 1));
      }
      const criteriaDiffs = await p.evaluate((records) => {
        const d = UTGStorage.snapshot().v3;
        return records.flatMap((record) => {
          const actual = UTGFlowCriteria.typed(
            d,
            record.stage,
            record.team,
            record.type,
          );
          return record.items.flatMap((item) => {
            const a = actual.find((x) => x.id === item.id);
            return Object.entries(item)
              .filter(([k, v]) => a?.[k] !== v)
              .map(([field]) => ({
                team: record.team,
                stage: record.stage,
                type: record.type,
                id: item.id,
                field,
              }));
          });
        });
      }, expected.criteria);
      check(
        "10 Teams: alle 7 Phasen mit individuellen Phasenregeln und AC sowie Team-DoR/DoD",
        () => {
          assert.equal(expected.criteria.length, 160);
          assert.deepEqual(criteriaDiffs, []);
        },
      );
      s = await snap();
      check(
        "ART-Regeln, Standardvorlage und übrige 10 Teamprofile unverändert",
        () => {
          assert.deepEqual(s.v3.policies, policies);
          for (const k of ["commonDoR", "commonDoD", "phaseGates", "phaseAC"])
            assert.deepEqual(s.v3.flowCriteria[k], template[k]);
          for (const t of teams.slice(10))
            assert.deepEqual(
              s.v3.flowCriteria.profiles[t.id],
              template.profiles[t.id],
            );
        },
      );
    } else {
      const checkpoint = path.resolve(process.env.UTG_ROUNDTRIP_CHECKPOINT);
      Object.assign(
        expected,
        JSON.parse(
          fs.readFileSync(path.join(checkpoint, "expected-inputs.json")),
        ),
      );
      const original = JSON.parse(
        fs.readFileSync(path.join(checkpoint, "before-export.json")),
      );
      const previousChecks = JSON.parse(
        fs.readFileSync(path.join(checkpoint, "checks.json")),
      );
      assert.equal(
        previousChecks.filter((x) => x.ok).length,
        23,
        "Verified setup checkpoint required",
      );
      const file = path.join(checkpoint, "configuration-export.json");
      await p.locator("#import").setInputFiles(file);
      await p
        .getByRole("button", { name: "Konfiguration importieren", exact: true })
        .click();
      await p.waitForLoadState("load");
      await ready();
      const loaded = await snap();
      teams = loaded.v2.teams;
      assert.deepEqual(dataPayload(loaded), dataPayload(original));
      for (const product of loaded.v3.products)
        assert.deepEqual(
          {
            name: product.name,
            description: product.description,
            wikiUrl: product.wikiUrl,
          },
          expected.products.find((x) => x.name === product.name),
        );
      for (const t of teams) {
        assert.deepEqual(
          [...t.productIds].sort(),
          [...expected.teams.find((x) => x.name === t.name).productIds].sort(),
        );
        const entries = loaded.v3.configs[t.id + "::flow"].entries;
        for (const item of expected.matrix[t.id])
          for (const [field, value] of Object.entries(item.fields))
            assert.equal(entries[item.name][field], value);
      }
      const diffs = await p.evaluate((records) => {
        const d = UTGStorage.snapshot().v3;
        return records.flatMap((r) =>
          r.items.flatMap((item) => {
            const a = UTGFlowCriteria.typed(d, r.stage, r.team, r.type).find(
              (x) => x.id === item.id,
            );
            return Object.entries(item)
              .filter(([k, v]) => a?.[k] !== v)
              .map(([field]) => ({ team: r.team, stage: r.stage, field }));
          }),
        );
      }, expected.criteria);
      assert.deepEqual(diffs, []);
      checks.push(...previousChecks.filter((x) => x.ok));
      check(
        "Verifizierten UI-Aufbau aus Checkpoint vollständig wiederhergestellt",
        () => {
          assert.equal(teams.length, 20);
          assert.equal(loaded.v3.products.length, 40);
          assert.equal(expected.criteria.length, 160);
        },
      );
      write("setup-checkpoint.json", {
        path: checkpoint,
        previousSetupChecks: 23,
        payloadHash: hash(dataPayload(original)),
        loadedPayloadHash: hash(dataPayload(loaded)),
      });
    }
    // Freeze navigation before the baseline. Compare complete stored payload, not just edited fields.
    await p.reload();
    await ready();
    const before = await snap();
    write("before-export.json", before);
    write("expected-inputs.json", expected);
    await p.evaluate(() => {
      window.showSaveFilePicker = undefined;
    });
    const download = p.waitForEvent("download");
    await p
      .getByRole("button", { name: "Konfiguration exportieren", exact: true })
      .click();
    const d = await download;
    const file = path.join(out, "configuration-export.json");
    await d.saveAs(file);
    assert.equal(await d.failure(), null);
    const exported = JSON.parse(fs.readFileSync(file));
    const afterExport = await snap();
    write("after-export.json", afterExport);
    check(
      "Exportdatei enthält den vollständigen gespeicherten Datenbestand",
      () => assert.deepEqual(dataPayload(exported), dataPayload(before)),
    );
    check("Export verändert keinen gespeicherten Wert", () =>
      assert.deepEqual(afterExport, before),
    );
    const activeTeam = await p.evaluate(() => UTGFlowUX.getTeam());
    check("Exportierter Navigationskontext entspricht dem aktiven Team", () => {
      assert.equal(exported.v2.selected, activeTeam);
      assert.equal(exported.v3.team, activeTeam);
      assert.equal(
        exported.v3.product,
        exported.v2.teams.find((t) => t.id === activeTeam).productIds[0],
      );
    });
    await p.getByText("Weitere Aktionen", { exact: true }).click();
    await p.locator("#reset").click();
    await p.locator("#utg-reset-confirm").click();
    await p.waitForLoadState("load");
    await ready();
    const reset = await snap();
    write("after-standard-reset.json", reset);
    const baseline = await p.evaluate(() => UTGDefaults.baseline());
    check("Tatsächlicher Standard-Reset entfernt alle Szenariodaten", () => {
      assert.deepEqual(reset.v2, baseline.v2);
      assert.deepEqual(reset.v3.products, baseline.v3.products);
      assert(!reset.v2.teams.some((t) => teams.some((old) => old.id === t.id)));
      assert.notEqual(hash(reset), hash(before));
    });
    await p.locator("#import").setInputFiles(file);
    await p
      .getByRole("button", { name: "Konfiguration importieren", exact: true })
      .click();
    await p.waitForLoadState("load");
    await ready();
    const imported = await snap();
    write("after-import.json", imported);
    check("Nach Reimport: alle fachlichen Daten exakt wie vor Export", () => {
      assert.deepEqual(dataPayload(imported), dataPayload(before));
      assert.equal(typeof imported.v3.navigationEpoch, "string");
      assert.notEqual(imported.v3.navigationEpoch, before.v3.navigationEpoch);
      assert.equal(imported.v2.selected, exported.v2.selected);
      assert.equal(imported.v3.team, exported.v3.team);
      assert.equal(imported.v3.product, exported.v3.product);
    });
    await p.reload();
    await ready();
    const reloaded = await snap();
    write("after-import-reload.json", reloaded);
    check("Nach zusätzlichem Reload weiterhin vollständige Gleichheit", () => {
      assert.deepEqual(dataPayload(reloaded), dataPayload(before));
      assert.deepEqual(reloaded, imported);
    });
    // Check persisted records also through freshly rendered UI after import.
    await tab(2);
    for (const t of teams) {
      await p.locator("#v3team").selectOption(t.id);
      const actual = await p.locator("#v3rows tr[data-i]").evaluateAll((rows) =>
        rows.map((row) => ({
          name: row.cells[1].textContent,
          fields: Object.fromEntries(
            [...row.querySelectorAll("[data-f] input,[data-f] select")].map(
              (el) => [el.closest("[data-f]").dataset.f, el.value],
            ),
          ),
        })),
      );
      check("Reimportierte Matrix sichtbar · " + t.name, () =>
        assert.deepEqual(actual, expected.matrix[t.id]),
      );
    }
    check("Keine unbehandelten Browserfehler", () =>
      assert.deepEqual(errors, []),
    );
    write("navigation-context.json", {
      beforeExport: navigation(before),
      exportFile: navigation(exported),
      afterExport: navigation(afterExport),
      afterImport: navigation(imported),
      afterImportReload: navigation(reloaded),
    });
    write("manifest.json", {
      testSha256: crypto
        .createHash("sha256")
        .update(fs.readFileSync(__filename))
        .digest("hex"),
      resumedSetup: !!process.env.UTG_ROUNDTRIP_CHECKPOINT,
      rawPayloadHashes: {
        beforeExport: hash(before),
        exportFile: hash(payload(exported)),
        afterExport: hash(afterExport),
        afterImport: hash(imported),
        afterImportReload: hash(reloaded),
      },
      excludedContextFields: [
        "v2.selected",
        "v3.team",
        "v3.product",
        "v3.navigationEpoch",
      ],
      appVersion: "3.16",
      appSha256: crypto
        .createHash("sha256")
        .update(
          fs.readFileSync(
            appFile("dist/UTG-LE_Operating_Model_v3.16_RC3.html"),
          ),
        )
        .digest("hex"),
      seed: expected.seed,
      teams: 20,
      products: 40,
      activitiesPerTeam: 32,
      matrixFields: 5120,
      changedTeamProfiles: 10,
      changedPhases: 70,
      criteriaEditorsSaved: 160,
      checks: checks.length,
      failed: 0,
      payloadHashes: {
        beforeExport: hash(dataPayload(before)),
        exportFile: hash(dataPayload(exported)),
        afterExport: hash(dataPayload(afterExport)),
        afterReset: hash(dataPayload(reset)),
        afterImport: hash(dataPayload(imported)),
        afterImportReload: hash(dataPayload(reloaded)),
      },
      errors,
    });
    console.log("COMPLETE " + checks.length + " checks");
    await context.close();
  } finally {
    write("runtime.json", { errors });
    await browser.close();
  }
})().catch((e) => {
  checks.push({ name: "Szenario abgeschlossen", ok: false, error: e.message });
  write("checks.json", checks);
  console.error(e);
  process.exitCode = 1;
});
