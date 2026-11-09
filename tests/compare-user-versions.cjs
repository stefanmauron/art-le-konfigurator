// Direct, offline functional comparison of the user's RC2 file and current bundle.
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto"),
  { pathToFileURL } = require("node:url");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "/Users/stefanmauron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const { generate } = require("./helpers/generate-load-config.cjs");
const root = path.resolve(__dirname, ".."),
  out = process.env.OUTPUT_DIR || "/tmp/utg-rc2-rc3-direct";
fs.mkdirSync(out, { recursive: true });
const files = [
  process.env.REFERENCE_HTML ||
    path.join(
      root,
      "tests/fixtures/reference/UTG-LE_Operating_Model_v3.16_RC2.html",
    ),
  path.join(root, "dist/UTG-LE_Operating_Model_v3.16_RC3.html"),
];
const hash = (b) => crypto.createHash("sha256").update(b).digest("hex"),
  stable = (x) =>
    Array.isArray(x)
      ? x.map(stable)
      : x && typeof x === "object"
        ? Object.fromEntries(
            Object.keys(x)
              .sort()
              .map((k) => [k, stable(x[k])]),
          )
        : x;
const digest = (x) => hash(JSON.stringify(stable(x))),
  steps = [],
  errors = [],
  summary = {
    files: files.map((file) => ({ file, sha256: hash(fs.readFileSync(file)) })),
    steps,
    errors,
  };
const save = () =>
  fs.writeFileSync(
    path.join(out, "comparison.json"),
    JSON.stringify(summary, null, 2) + "\n",
  );
const snapshot = (p) => p.evaluate(() => UTGStorage.snapshot()),
  ready = (p) => p.waitForFunction(() => !!window.UTGFlowStandardUI);
const normalize = (x) => {
  const d = structuredClone(x);
  delete d.v2.selected;
  delete d.v3.team;
  delete d.v3.product;
  delete d.v3.navigationEpoch;
  return d;
};
async function importData(p, b) {
  await p
    .locator("#import")
    .setInputFiles({
      name: "comparison.json",
      mimeType: "application/json",
      buffer: Buffer.from(JSON.stringify(b)),
    });
  await Promise.all([
    p.waitForNavigation(),
    p
      .getByRole("button", { name: "Konfiguration importieren", exact: true })
      .click(),
  ]);
  await ready(p);
}
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const contexts = [];
  try {
    const pages = [];
    for (const [index, file] of files.entries()) {
      const c = await browser.newContext({
        offline: true,
        acceptDownloads: true,
        reducedMotion: "reduce",
        viewport: { width: 1440, height: 1000 },
      });
      contexts.push(c);
      await c.addInitScript(() => {
        const Native = Date;
        globalThis.Date = class extends Native {
          constructor(...a) {
            super(...(a.length ? a : [1793970000000]));
          }
          static now() {
            return 1793970000000;
          }
        };
        let seed = 1931;
        Math.random = () =>
          (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
      });
      const p = await c.newPage();
      p.setDefaultTimeout(12000);
      p.on("dialog", (d) => d.accept());
      p.on("pageerror", (e) =>
        errors.push({ version: index, message: e.message }),
      );
      await p.goto(pathToFileURL(file).href);
      await ready(p);
      pages.push(p);
    }
    async function compare(name, action) {
      if (action)
        for (const [index, p] of pages.entries()) {
          try {
            await action(p);
          } catch (e) {
            summary.actionFailure = {
              name,
              version: index,
              url: p.url(),
              openDialogs: await p.locator("dialog[open]").allTextContents(),
              snapshot: await snapshot(p),
            };
            await p.screenshot({
              path: path.join(out, "failure-" + index + ".png"),
            });
            save();
            throw e;
          }
        }
      const values = await Promise.all(pages.map(snapshot));
      const record = {
        name,
        referenceHash: digest(values[0]),
        candidateHash: digest(values[1]),
        rawEqual:
          JSON.stringify(stable(values[0])) ===
          JSON.stringify(stable(values[1])),
        functionalEqual:
          digest(normalize(values[0])) === digest(normalize(values[1])),
      };
      steps.push(record);
      save();
      if (!record.functionalEqual) {
        fs.writeFileSync(
          path.join(out, "difference-reference.json"),
          JSON.stringify(values[0], null, 2),
        );
        fs.writeFileSync(
          path.join(out, "difference-candidate.json"),
          JSON.stringify(values[1], null, 2),
        );
      }
      assert.deepEqual(values[1], values[0], name);
      console.log("PASS " + name);
    }
    await compare("Initial defaults");
    const data = generate(20, 40, 20261106);
    data.appVersion = "3.16";
    data.releaseStage = "RC2";
    data.v3.extensionForAudit = {
      retained: "Äöü <Nachweis> & individuelle Erweiterung",
    };
    data.v3.products[0].description =
      "Individueller Produktumfang\nmit Umlauten äöü & <Nachweis>";
    await compare("Import 20 teams / 40 products with all matrix fields", (p) =>
      importData(p, data),
    );
    const team = (await snapshot(pages[0])).v2.teams[1];
    await compare("Select team in matrix", async (p) => {
      await p.locator("#utg-nav button").nth(2).click();
      await p.locator("#v3team").selectOption(team.id);
    });
    await compare("Change matrix note", async (p) => {
      const input = p.locator('#v3rows [data-f="note"] input').first();
      await input.fill("Individuelle Übergabe\nÄöü & Nachweis");
      await input.press("Tab");
    });
    await compare("Change technical responsibility", async (p) => {
      const input = p.locator('#v3rows [data-f="technical"] input').first();
      await input.fill("Vergleich: Tech Lead");
      await input.press("Tab");
    });
    await compare("Explicit execution: not required", async (p) =>
      p
        .locator('#v3rows [data-f="org"] select')
        .first()
        .selectOption("Nicht erforderlich"),
    );
    await compare("Restore inherited execution", async (p) =>
      p.locator('#v3rows [data-f="org"] select').first().selectOption(""),
    );
    await compare("Confirm agreement", async (p) =>
      p.locator("#v3status").selectOption("Abgestimmt"),
    );
    await compare("Change ART rule after confirmation", async (p) => {
      await p.locator("#utg-nav button").nth(3).click();
      await p.locator("#model-view").selectOption("team:" + team.id);
      await p.locator('[data-policy="0"]').click();
      await p.locator("#rule-edit-art").click();
      await p
        .locator("dialog[open]")
        .getByRole("textbox", {
          name: "ART-weiter Mindestvertrag",
          exact: true,
        })
        .fill("Vergleich: Mindestvertrag mit individuellem Nachweis");
      await p
        .locator("dialog[open]")
        .getByRole("textbox", {
          name: "Verantwortliche Entscheidrolle",
          exact: true,
        })
        .fill("Product Management");
      await p
        .locator("dialog[open]")
        .getByRole("textbox", { name: "Beteiligte Rollen", exact: true })
        .fill("Team und Leistungserbringer");
      await p
        .locator("dialog[open]")
        .getByRole("textbox", {
          name: "Erwarteter Nachweis / Referenz",
          exact: true,
        })
        .fill("Vergleichsprotokoll");
      await p
        .getByRole("button", { name: "ART-weite Regel speichern", exact: true })
        .click();
      await p.locator("#utg-rule-details[open]").waitFor();
    });
    await compare("Change shared team DoD", async (p) => {
      await p.locator('[data-edit-flow="DoD"]').click();
      await p
        .locator("dialog[open] textarea")
        .first()
        .fill("Vergleich: Ergebnisqualität ausdrücklich nachweisen");
      await p
        .getByRole("button", { name: "Kriterien speichern", exact: true })
        .click();
      await p.locator("#utg-rule-details[open]").waitFor();
      await p.locator("#utg33close").click();
    });
    await compare("Assess team criterion", async (p) => {
      await p.locator("#utg-nav button").nth(4).click();
      await p.locator('[data-assess-team="' + team.id + '"]').click();
      await p
        .locator("dialog[open] select")
        .first()
        .selectOption("Nicht erfüllt");
      await p
        .getByRole("button", { name: "Beurteilung speichern", exact: true })
        .click();
      await p.locator("dialog[open]").waitFor({ state: "hidden" });
    });
    await compare("Create individual product through UI", async (p) => {
      await p.locator("#utg-nav button").nth(1).click();
      await p.locator("#crud-add-product").click();
      await p.locator("#crud-name").fill("Vergleich Produkt");
      await p.locator("#crud-description").fill("Individuell äöü <Nachweis>");
      await p.locator("#crud-wiki").fill("https://example.invalid/vergleich");
      await Promise.all([
        p.waitForNavigation(),
        p.getByRole("button", { name: "Übernehmen", exact: true }).click(),
      ]);
      await ready(p);
    });
    await compare("Create team and assign product through UI", async (p) => {
      const b = await snapshot(p),
        pid = b.v3.products.find((x) => x.name === "Vergleich Produkt").id;
      await p.locator("#crud-add-team").click();
      await p.locator("#crud-name").fill("Vergleich Team");
      await p.locator('#crud-memberships input[value="' + pid + '"]').check();
      await Promise.all([
        p.waitForNavigation(),
        p.getByRole("button", { name: "Übernehmen", exact: true }).click(),
      ]);
      await ready(p);
    });
    await compare("Rename activity and edit description", async (p) => {
      const row = p.locator("#utg-activity-rows tr").first();
      await row.locator('[data-action="rename"]').click();
      await p.locator("#utg-name-drawer-input").fill("Vergleich Tätigkeit");
      await p
        .locator("#utg-activity-description")
        .fill("Geänderter Umfang\nÄöü & <Nachweis>");
      await p.getByRole("button", { name: "Übernehmen", exact: true }).click();
      await p.locator("dialog[open]").waitFor({ state: "hidden" });
    });
    await compare("Delete created team through UI", async (p) => {
      const row = p
        .locator("#crud-teams .crud-entry")
        .filter({ has: p.getByText("Vergleich Team", { exact: true }) });
      await Promise.all([
        p.waitForNavigation(),
        row.getByRole("button", { name: "Löschen", exact: true }).click(),
      ]);
      await ready(p);
    });
    await compare("Delete created product through UI", async (p) => {
      const row = p
        .locator("#crud-products .crud-entry")
        .filter({ has: p.getByText("Vergleich Produkt", { exact: true }) });
      await Promise.all([
        p.waitForNavigation(),
        row.getByRole("button", { name: "Löschen", exact: true }).click(),
      ]);
      await ready(p);
    });
    await compare("Reload retains all functional data", async (p) => {
      await p.reload();
      await ready(p);
    });
    const exports = [];
    for (const [index, p] of pages.entries()) {
      const wait = p.waitForEvent("download");
      await p.evaluate(() => UTGFiles.save(true));
      const download = await wait,
        bytes = fs.readFileSync(await download.path()),
        body = JSON.parse(bytes);
      fs.writeFileSync(path.join(out, "export-" + index + ".json"), bytes);
      exports.push({
        filename: download.suggestedFilename(),
        body,
        sha256: hash(bytes),
      });
    }
    const payload = (x) => ({
      v2: x.v2,
      v3: x.v3,
      organisations: x.organisations,
    });
    assert.deepEqual(payload(exports[1].body), payload(exports[0].body));
    summary.exports = exports.map((x) => ({
      filename: x.filename,
      sha256: x.sha256,
      format: x.body.format,
      version: x.body.version,
      appVersion: x.body.appVersion,
      releaseStage: x.body.releaseStage,
      exported: x.body.exported,
      functionalHash: digest(normalize(payload(x.body))),
    }));
    const left = structuredClone(exports[0].body),
      right = structuredClone(exports[1].body);
    delete left.releaseStage;
    delete right.releaseStage;
    assert.deepEqual(right, left);
    summary.exportDifferences = [
      {
        path: "$.releaseStage",
        reference: exports[0].body.releaseStage,
        candidate: exports[1].body.releaseStage,
      },
    ];
    console.log("PASS Actual exported functional contents equal");
    await compare("RC3 export imported by both versions", (p) =>
      importData(p, exports[1].body),
    );
    await compare("RC2 export imported by both versions", (p) =>
      importData(p, exports[0].body),
    );
    await compare("Reset defaults through UI", async (p) => {
      await p.getByText("Weitere Aktionen", { exact: true }).click();
      await p.locator("#reset").click();
      await Promise.all([
        p.waitForNavigation(),
        p.locator("#utg-reset-confirm").click(),
      ]);
      await ready(p);
    });
    await compare("Restore edited export after reset", (p) =>
      importData(p, exports[1].body),
    );
    summary.storageKeys = await Promise.all(
      pages.map((p) => p.evaluate(() => Object.keys(localStorage).sort())),
    );
    summary.browser = browser.version();
    summary.platform = process.platform;
    summary.success = true;
    assert.deepEqual(errors, []);
    save();
    console.log(
      JSON.stringify({
        operations: steps.length,
        functionalEqual: true,
        errors: 0,
      }),
    );
  } catch (e) {
    summary.success = false;
    summary.failure = e.message;
    save();
    throw e;
  } finally {
    for (const c of contexts) await c.close();
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
