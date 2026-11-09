const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "/Users/stefanmauron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const { generate } = require("./helpers/generate-load-config.cjs");
const root = path.resolve(__dirname, ".."),
  repo = path.resolve(root, "../../../.."),
  out = process.env.OUTPUT_DIR || "/tmp/utg-v317-assessments";
fs.mkdirSync(out, { recursive: true });
const checks = [],
  errors = [];
const normalized = (b) => {
  const d = structuredClone(b);
  delete d.v3.operatingModelVersion;
  delete d.v3.navigationEpoch;
  delete d.v3.team;
  delete d.v3.product;
  delete d.v2.selected;
  return d;
};
const snap = (p) => p.evaluate(() => UTGStorage.snapshot()),
  ready = (p) => p.waitForFunction(() => !!window.UTGFlowStandardUI);
function check(name, fn) {
  fn();
  checks.push({ name, ok: true });
  console.log("PASS " + name);
}
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const context = await browser.newContext({
        acceptDownloads: true,
        reducedMotion: "reduce",
        viewport: { width: 1440, height: 1000 },
      }),
      p = await context.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    p.on("dialog", (d) => d.accept());
    const url = (file) =>
      (process.env.BASE_URL || "http://127.0.0.1:8773") +
      "/" +
      encodeURI(
        path.relative(repo, path.join(root, file)).split(path.sep).join("/"),
      );
    await p.goto(url("dist/UTG-LE_Operating_Model_v3.16_RC3.html"));
    await ready(p);
    await p.evaluate(
      (b) => {
        const defaults = UTGDefaults.baseline();
        b.v3.designCriteria = defaults.v3.designCriteria;
        b.v3.teamDesignCriteria = {};
        b.v3.teamDesignAssessments = {};
        UTGDesignCriteria.ensureTeams(b.v3, b.v2.teams, true);
        for (const [tid, items] of Object.entries(b.v3.teamDesignCriteria))
          items.forEach(
            (c, i) =>
              (c.note =
                "Individuelle Begründung " + tid + " · " + i + " · äöü"),
          );
        UTGStorage.restore(b);
      },
      generate(20, 40, 20261106),
    );
    await p.reload();
    await ready(p);
    const teams = (await snap(p)).v2.teams;
    await p.locator("#utg-nav button").nth(4).click();
    for (const [ti, team] of teams.entries()) {
      await p.locator('button[data-assess-team="' + team.id + '"]').click();
      const selects = p.locator("dialog[open] select");
      assert.equal(await selects.count(), 9);
      for (let i = 0; i < 9; i++)
        await selects
          .nth(i)
          .selectOption((i + ti) % 2 ? "Erfüllt" : "Nicht erfüllt");
      await p
        .getByRole("button", { name: "Beurteilung speichern", exact: true })
        .click();
      await p.locator("dialog[open]").waitFor({ state: "hidden" });
      const s = await snap(p);
      check("9 persisted UI assessments " + team.id, () => {
        assert.equal(s.v3.teamDesignCriteria[team.id].length, 9);
        s.v3.teamDesignCriteria[team.id].forEach((c, i) => {
          assert.equal(
            c.assessmentStatus,
            (i + ti) % 2 ? "Erfüllt" : "Nicht erfüllt",
          );
          assert(c.assessedAt);
          assert(c.note.includes(team.id));
        });
      });
    }
    await p.locator("#utg-nav button").nth(2).click();
    for (const [i, team] of teams.entries()) {
      await p.locator("#v3team").selectOption(team.id);
      await p
        .locator("#v3status")
        .selectOption(i % 2 ? "Freigegeben" : "Abgestimmt");
      const s = await snap(p);
      check("Confirmed UI agreement " + team.id, () => {
        assert.equal(
          s.v3.agreementConfirmations[team.id].status,
          i % 2 ? "Freigegeben" : "Abgestimmt",
        );
        assert(s.v3.agreementConfirmations[team.id].signature);
        assert(s.v3.agreementConfirmations[team.id].categorySignature);
      });
    }
    const before = await snap(p);
    assert.equal(
      Object.values(before.v3.teamDesignCriteria).flat().length,
      180,
    );
    assert.equal(Object.keys(before.v3.agreementConfirmations).length, 20);
    assert(
      await p.evaluate(() => {
        const b = UTGStorage.snapshot();
        return b.v2.teams.every(
          (t) => !UTGAgreement.state(b.v3, t.id, b.v2.teams).changed,
        );
      }),
    );
    check("All 20 confirmations match their assessed data", () => {});
    await p.evaluate(() => {
      window.showSaveFilePicker = undefined;
    });
    const wait = p.waitForEvent("download");
    await p
      .getByRole("button", { name: "Konfiguration exportieren", exact: true })
      .click();
    const download = await wait,
      buffer = fs.readFileSync(await download.path());
    const reference = await context.newPage();
    reference.on("pageerror", (e) => errors.push(e.message));
    reference.on("dialog", (d) => d.accept());
    await reference.goto(
      url("tests/fixtures/reference/UTG-LE_Operating_Model_v3.16_RC2.html"),
    );
    await ready(reference);
    async function importInto(page) {
      await page.locator("#import").setInputFiles({
        name: "assessed.json",
        mimeType: "application/json",
        buffer,
      });
      await Promise.all([
        page.waitForNavigation(),
        page
          .getByRole("button", {
            name: "Konfiguration importieren",
            exact: true,
          })
          .click(),
      ]);
      await ready(page);
    }
    await importInto(reference);
    check(
      "180 assessments / 20 confirmations retained in original RC2",
      () => {},
    );
    assert.deepEqual(normalized(await snap(reference)), normalized(before));
    await p.getByText("Weitere Aktionen", { exact: true }).click();
    await p.locator("#reset").click();
    await Promise.all([
      p.waitForNavigation(),
      p.locator("#utg-reset-confirm").click(),
    ]);
    await ready(p);
    await importInto(p);
    await p.reload();
    await ready(p);
    check(
      "180 assessments / 20 confirmations retained after reset, reimport and reload",
      () => {},
    );
    assert.deepEqual(normalized(await snap(p)), normalized(before));
    check("No unhandled browser errors", () => assert.deepEqual(errors, []));
    fs.writeFileSync(
      path.join(out, "summary.json"),
      JSON.stringify(
        {
          bundleSha256: crypto
            .createHash("sha256")
            .update(
              fs.readFileSync(
                path.join(root, "dist/UTG-LE_Operating_Model_v3.16_RC3.html"),
              ),
            )
            .digest("hex"),
          teams: 20,
          products: 40,
          uiAssessments: 180,
          uiConfirmations: 20,
          checks,
          errors,
        },
        null,
        2,
      ),
    );
    console.log(JSON.stringify({ passed: checks.length, failed: 0 }));
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
