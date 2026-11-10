const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  { performance } = require("node:perf_hooks"),
  { pathToFileURL } = require("node:url");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "/Users/stefanmauron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const { generate } = require("./helpers/generate-load-config.cjs");
const root = path.resolve(__dirname, ".."),
  out = process.env.OUTPUT_DIR || "/tmp/utg-v317-performance";
fs.mkdirSync(out, { recursive: true });
const targets = {
    reference: "tests/fixtures/reference/UTG-LE_Operating_Model_v3.16_RC2.html",
    candidate: "dist/UTG-LE_Operating_Model_v3.16_RC4.html",
  },
  results = { reference: [], candidate: [] };
const ready = (p) => p.waitForFunction(() => !!window.UTGFlowStandardUI);
const payload = generate(20, 40, 20261106);
payload.appVersion = "3.16";
payload.releaseStage = "RC2";
const buffer = Buffer.from(JSON.stringify(payload));
const median = (xs) => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)];
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (let run = -1; run < 5; run++)
      for (const name of run % 2 === 0
        ? ["candidate", "reference"]
        : ["reference", "candidate"]) {
        const context = await browser.newContext({
            acceptDownloads: true,
            reducedMotion: "reduce",
            viewport: { width: 1440, height: 1000 },
          }),
          p = await context.newPage();
        p.on("dialog", (d) => d.accept());
        const errors = [];
        p.on("pageerror", (e) => errors.push(e.message));
        await p.goto(pathToFileURL(path.join(root, targets[name])).href);
        await ready(p);
        await p.evaluate((b) => UTGStorage.restore(b), payload);
        await p.reload();
        await ready(p);
        const times = {};
        async function measure(key, fn) {
          const start = performance.now();
          await fn();
          times[key] = performance.now() - start;
        }
        await measure("start", async () => {
          await p.reload();
          await ready(p);
        });
        await p.locator("#utg-nav button").nth(2).click();
        const teams = await p
          .locator("#v3team option")
          .evaluateAll((es) => es.map((e) => e.value));
        await measure("teamSwitch", async () => {
          await p.locator("#v3team").selectOption(teams[1]);
          assert.equal(await p.locator("#v3team").inputValue(), teams[1]);
        });
        const note = p.locator('#v3rows [data-f="note"] input').first();
        await measure("save", async () => {
          await note.fill("Messung " + run);
          await note.press("Tab");
          await p.waitForFunction(
            (value) =>
              Object.values(UTGStorage.snapshot().v3.configs).some((c) =>
                Object.values(c.entries || {}).some((e) => e.note === value),
              ),
            "Messung " + run,
          );
        });
        await p.locator("#utg-nav button").nth(1).click();
        await measure("openEditor", async () => {
          await p.locator("#crud-add-team").click();
          await p.locator("#crud-name").waitFor({ state: "visible" });
        });
        await p.locator("#crud-cancel").click();
        await measure("export", async () => {
          await p.evaluate(() => {
            window.showSaveFilePicker = undefined;
          });
          const wait = p.waitForEvent("download");
          await p
            .getByRole("button", {
              name: "Konfiguration exportieren",
              exact: true,
            })
            .click();
          await (await wait).path();
        });
        await p.locator("#import").setInputFiles({
          name: "measurement.json",
          mimeType: "application/json",
          buffer,
        });
        await measure("import", async () => {
          await Promise.all([
            p.waitForNavigation(),
            p
              .getByRole("button", {
                name: "Konfiguration importieren",
                exact: true,
              })
              .click(),
          ]);
          await ready(p);
        });
        assert.deepEqual(errors, []);
        if (run >= 0) results[name].push(times);
        await context.close();
        console.log(name + " round " + run + " " + JSON.stringify(times));
      }
    const comparisons = Object.keys(results.reference[0]).map((action) => {
      const reference = median(results.reference.map((x) => x[action])),
        candidate = median(results.candidate.map((x) => x[action])),
        tolerance = Math.max(100, reference * 0.2);
      return {
        action,
        referenceMedianMs: reference,
        candidateMedianMs: candidate,
        toleranceMs: tolerance,
        passed: candidate <= reference + tolerance,
      };
    });
    const summary = {
      rounds: 5,
      warmupRounds: 1,
      teams: 20,
      products: 40,
      protocol: "file:",
      platform: process.platform,
      browser: browser.version(),
      results,
      comparisons,
      passed: comparisons.every((x) => x.passed),
    };
    fs.writeFileSync(
      path.join(out, "summary.json"),
      JSON.stringify(summary, null, 2) + "\n",
    );
    console.log(JSON.stringify(comparisons));
    assert(
      summary.passed,
      "Performance regression exceeds predefined tolerance",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
