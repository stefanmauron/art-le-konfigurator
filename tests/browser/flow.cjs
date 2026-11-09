const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "/Users/stefanmauron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const assert = require("node:assert/strict"),
  fs = require("node:fs"),
  path = require("node:path");
const appRoot = path.resolve(__dirname, "../.."),
  url =
    (process.env.BASE_URL || "http://127.0.0.1:8773") +
    "/" +
    encodeURI(
      "dist/UTG-LE_Operating_Model_v3.16_RC3.html",
    ),
  key = "gever-art-v3-config";
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  let checks = 0;
  try {
    const page = await browser.newPage({
        viewport: { width: 1440, height: 1050 },
      }),
      errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("dialog", (d) => d.accept());
    await page.goto(url);
    await page.locator("#utg-nav button").nth(3).click();
    const read = () =>
      page.evaluate((k) => JSON.parse(window.UTGStorage.rawGet(k)), key);
    let d = await read();
    assert.equal(d.flowCriteria.standardRevision, 4);
    assert.equal(d.flowGovernance.status, "Vorschlag");
    assert.equal(d.policies.length, 7);
    checks++;
    const before = JSON.stringify(d);
    for (let i = 0; i < 7; i++) {
      await page.locator('[data-policy="' + i + '"]').click();
      await page.locator("#utg-rule-details[open]").waitFor();
      assert.equal(
        await page.locator("#utg-rule-title").textContent(),
        d.policies[i].name,
      );
      assert.equal(
        await page
          .locator('[data-edit-flow="Phase"] span')
          .first()
          .textContent(),
        "Phasenregeln",
      );
      assert.equal(await page.locator(".flow-governance-summary").count(), 1);
      assert.equal(
        await page.locator('[data-edit-flow="DoR"] span').first().textContent(),
        "DoR · Umsetzungsstart",
      );
      assert.equal(
        await page.locator('[data-edit-flow="DoD"] span').first().textContent(),
        "DoD · Ergebnisqualität",
      );
      assert(await page.locator(".flow-catalog-context").textContent());
      for (const type of ["DoR", "DoD"]) {
        const context = await page.evaluate(
          ({ stage, type }) => window.UTGFlowStandard.context(stage, type),
          { stage: d.policies[i].name, type },
        );
        await page.locator('[data-edit-flow="' + type + '"]').click();
        assert(
          (await page.locator("dialog[open]").innerText()).includes(context),
        );
        await page
          .getByRole("button", { name: "Abbrechen", exact: true })
          .click();
        await page.locator("#utg-rule-details[open]").waitFor();
      }
      await page.keyboard.press("Escape");
      await page.waitForFunction(
        (i) => document.activeElement.dataset.policy === String(i),
        i,
      );
    }
    assert.equal(JSON.stringify(await read()), before);
    checks++;
    await page.locator('[data-policy="5"]').click();
    await page.locator('[data-edit-flow="Phase"]').click();
    await page.locator("dialog[open] .flow-criteria-editor").first().waitFor();
    assert.equal(await page.locator("dialog[open] .flow-rule-kind").count(), 4);
    assert(
      (await page.locator("dialog[open]").innerText()).includes(
        "Ausführung / Nachverfolgung",
      ),
    );
    await page.getByRole("button", { name: "Abbrechen", exact: true }).click();
    await page.locator("#utg-rule-details[open]").waitFor();
    checks++;
    await page.locator("#rule-edit-art").click();
    await page
      .locator("dialog[open]")
      .getByLabel("ART-weiter Mindestvertrag", { exact: true })
      .fill("Browsertest Mindestvertrag");
    await page
      .locator("dialog[open]")
      .getByLabel("Verantwortliche Entscheidrolle", { exact: true })
      .fill("Release Lead");
    await page
      .getByRole("button", { name: "ART-weite Regel speichern", exact: true })
      .click();
    await page.locator("#utg-rule-details[open]").waitFor();
    assert.equal(
      await page.locator("#utg33exit").textContent(),
      "Browsertest Mindestvertrag",
    );
    checks++;
    await page.locator("#rule-edit-governance").click();
    await page.locator("#flow-governance-status").selectOption("Vereinbart");
    await page.getByRole("button", { name: "Speichern", exact: true }).click();
    assert(
      (await page.locator("dialog[open] .app-save-error").innerText()).includes(
        "fehlen Angaben",
      ),
    );
    assert.equal((await read()).flowGovernance.status, "Vorschlag");
    for (const [field, value] of [
      [
        "wip",
        "Maximal 2 aktive Features je Team, gesamter Bereich Implementing bis Release.",
      ],
      ["sle", "85% in 12 Tagen; Pilotmessung 2026-11, 20 Features."],
      ["decisionRole", "ART Flow-Verantwortliche"],
      ["evidence", "Workshopprotokoll 2026-11-06"],
    ])
      await page.locator('[data-governance-field="' + field + '"]').fill(value);
    await page.getByRole("button", { name: "Speichern", exact: true }).click();
    await page.locator("#utg-rule-details[open]").waitFor();
    assert.equal((await read()).flowGovernance.status, "Vereinbart");
    checks++;
    // Check spacing and mobile bounds in the actual criteria editor.
    await page.locator('[data-edit-flow="DoR"]').click();
    const spacing = await page
      .locator("dialog[open] .flow-criteria-editor")
      .first()
      .evaluate((e) => {
        const field = e.querySelector('[data-field="evidence"]'),
          button = e.querySelector("[data-remove]");
        return (
          button.getBoundingClientRect().top -
          field.getBoundingClientRect().bottom
        );
      });
    assert(spacing >= 16);
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1050 });
      const box = await page.locator("dialog[open]").boundingBox();
      assert(box.x >= 0 && box.x + box.width <= width + 1);
      assert.equal(
        await page
          .locator("dialog[open]")
          .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
        true,
      );
    }
    await page.getByRole("button", { name: "Abbrechen", exact: true }).click();
    await page.locator("#utg-rule-details[open]").waitFor();
    for (const width of [1440, 390]) {
      await page.setViewportSize({ width, height: 1050 });
      await page
        .locator("#utg-rule-details .ui-drawer-body")
        .evaluate((e) => (e.scrollTop = 0));
      await page.screenshot({ path: "/tmp/utg-v3155-" + width + ".png" });
      const box = await page.locator("#utg-rule-details").boundingBox();
      assert(box.x >= 0 && box.x + box.width <= width + 1);
    }
    checks++;
    // Introduce two existing teams with customized/deleted data; reloading must preserve them.
    await page.locator("#utg33close").click();
    await page.evaluate(() => {
      const b = window.UTGStorage.bundle(),
        d = b.v3;
      for (const id of ["audit-a", "audit-b"]) {
        b.v2.teams.push({
          id,
          name: id,
          description: "Browser regression",
          assignments: {},
          productIds: [],
        });
        window.UTGFlowCriteria.ensureTeam(d, id);
      }
      d.flowCriteria.profiles["audit-a"].phaseGates.Funnel[0].description =
        "Individuelle Eintrittsregel";
      d.flowCriteria.profiles["audit-a"].commonDoD = [];
      d.flowCriteria.profiles["audit-b"].commonDoD[0].description =
        "Zweites Team";
      d.flowCriteria.phaseGates.Funnel[0].description = "Individuelle Vorlage";
      window.UTGStorage.restore(b);
    });
    const customized = await read();
    await page.reload();
    await page.locator("#utg-nav button").nth(3).click();
    assert.deepEqual((await read()).flowCriteria, customized.flowCriteria);
    checks++;
    await page.locator("#model-view").selectOption("team:audit-a");
    await page.locator('[data-policy="0"]').click();
    assert.equal(
      await page.locator(".rule-criteria-context").first().textContent(),
      "audit-a",
    );
    await page.locator("#rule-compare-standards").click();
    await page.locator("#flow-standard-target").waitFor();
    assert.equal(
      await page.locator("#flow-standard-target").inputValue(),
      "audit-a",
    );
    assert.equal(await page.locator("dialog[open] input:checked").count(), 0);
    assert.equal(
      await page
        .getByRole("button", {
          name: "Ausgewählte Standards übernehmen",
          exact: true,
        })
        .isDisabled(),
      true,
    );
    await page.locator('[data-standard-choice="Phase:Funnel"]').check();
    await page
      .getByRole("button", {
        name: "Ausgewählte Standards übernehmen",
        exact: true,
      })
      .click();
    await page.locator("#utg-rule-details[open]").waitFor();
    d = await read();
    assert.notEqual(
      d.flowCriteria.profiles["audit-a"].phaseGates.Funnel[0].description,
      "Individuelle Eintrittsregel",
    );
    assert.deepEqual(d.flowCriteria.profiles["audit-a"].commonDoD, []);
    assert.deepEqual(
      d.flowCriteria.profiles["audit-b"],
      customized.flowCriteria.profiles["audit-b"],
    );
    assert.deepEqual(
      d.flowCriteria.phaseGates,
      customized.flowCriteria.phaseGates,
    );
    assert.deepEqual(d.policies, customized.policies);
    checks++;
    // Concurrency and failed persistence keep the comparison open and do not overwrite new data.
    await page.locator("#rule-compare-standards").click();
    await page.locator('[data-standard-choice="DoD"]').check();
    await page.evaluate(() => {
      const d = window.UTGStorage.read("gever-art-v3-config");
      d.teamContracts = { audit: { business: "External update" } };
      window.UTGStorage.write("gever-art-v3-config", d);
    });
    await page
      .getByRole("button", {
        name: "Ausgewählte Standards übernehmen",
        exact: true,
      })
      .click();
    assert(
      (await page.locator("dialog[open] .app-save-error").innerText()).includes(
        "inzwischen geändert",
      ),
    );
    assert.deepEqual(
      (await read()).flowCriteria.profiles["audit-a"].commonDoD,
      [],
    );
    await page.getByRole("button", { name: "Abbrechen", exact: true }).click();
    await page.locator("#utg-rule-details[open]").waitFor();
    checks++;
    await page.locator("#rule-compare-standards").click();
    await page.locator('[data-standard-choice="DoD"]').check();
    await page.evaluate(() => {
      window.__auditWrite = Storage.prototype.setItem;
      Storage.prototype.setItem = function (key, value) {
        if (
          key ===
          (window.UTGApplication
            ? "utg-le-v317:gever-art-v3-config"
            : "gever-art-v3-config")
        )
          throw Error("Simulierter Speicherfehler");
        return window.__auditWrite.call(this, key, value);
      };
    });
    await page
      .getByRole("button", {
        name: "Ausgewählte Standards übernehmen",
        exact: true,
      })
      .click();
    assert(
      (await page.locator("dialog[open] .app-save-error").innerText()).includes(
        "Simulierter Speicherfehler",
      ),
    );
    assert.deepEqual(
      (await read()).flowCriteria.profiles["audit-a"].commonDoD,
      [],
    );
    await page.evaluate(
      () => (Storage.prototype.setItem = window.__auditWrite),
    );
    await page
      .getByRole("button", {
        name: "Ausgewählte Standards übernehmen",
        exact: true,
      })
      .click();
    await page.locator("#utg-rule-details[open]").waitFor();
    assert.equal(
      (await read()).flowCriteria.profiles["audit-a"].commonDoD.length,
      5,
    );
    checks++;
    const bundle = await page.evaluate(() => {
      const b = window.UTGStorage.bundle();
      window.UTGStorage.validateBundle(JSON.parse(JSON.stringify(b)));
      return b;
    });
    assert.equal(
      bundle.v3.flowGovernance.wip,
      "Maximal 2 aktive Features je Team, gesamter Bereich Implementing bis Release.",
    );
    checks++;
    // Exercise the actual JSON download and import preview, including a historical fixture.
    await page.locator("#utg33close").click();
    const downloadPromise = page.waitForEvent("download");
    assert.equal(
      await page.evaluate(() => window.UTGFiles.save(true)),
      "download",
    );
    const download = await downloadPromise;
    assert.equal(
      download.suggestedFilename(),
      "UTG-LE_Konfiguration_v3.16_RC3.json",
    );
    const downloaded = JSON.parse(
      fs.readFileSync(await download.path(), "utf8"),
    );
    assert.equal(downloaded.appVersion, "3.16");
    assert.deepEqual(downloaded.v3.flowGovernance, bundle.v3.flowGovernance);
    await page.locator("#import").setInputFiles(await download.path());
    await page
      .getByRole("button", { name: "Konfiguration importieren", exact: true })
      .click();
    await page.waitForLoadState("load");
    await page.waitForFunction(() => !!window.UTGFlowStandardUI);
    assert.deepEqual((await read()).flowCriteria, bundle.v3.flowCriteria);
    checks++;
    const legacyPath = path.join(
      appRoot,
      "tests/fixtures/import-compatibility.json",
    );
    await page.locator("#import").setInputFiles(legacyPath);
    await page
      .getByRole("button", { name: "Konfiguration importieren", exact: true })
      .click();
    await page.waitForLoadState("load");
    await page.waitForFunction(() => !!window.UTGFlowStandardUI);
    const legacy = await read();
    assert.equal(legacy.flowGovernance, undefined);
    assert.equal(legacy.flowCriteria.standardRevision, 2);
    assert(
      legacy.flowCriteria.phaseGates[
        "Deploying & Releasing"
      ][1].description.includes("vorbereitet"),
    );
    checks++;
    assert.deepEqual(errors, []);
    console.log(
      "PASS " +
        checks +
        " browser groups: seven states, read-only, editors, governance, spacing, mobile, preservation, adoption, stale writes, failed persistence, export validation; no page errors.",
    );
  } catch (e) {
    throw e;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
