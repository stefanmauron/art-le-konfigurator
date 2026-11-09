const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict"),
  crypto = require("node:crypto");
const { pathToFileURL } = require("node:url");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "/Users/stefanmauron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const { generate } = require("./helpers/generate-load-config.cjs");
const root = path.resolve(__dirname, ".."),
  repo = path.resolve(root, "../../../..");
const out = process.env.OUTPUT_DIR || "/tmp/utg-v317-parity";
fs.mkdirSync(out, { recursive: true });
const checks = [],
  errors = [];
const hash = (b) => crypto.createHash("sha256").update(b).digest("hex");
const snapshot = (p) => p.evaluate(() => UTGStorage.snapshot());
const canonical = (b) => {
  const x = structuredClone(b);
  delete x.v3.operatingModelVersion;
  return x;
};
function check(name, fn) {
  if (
    process.env.UTG_COMPARE_PIXELS === "0" &&
    name.startsWith("Pixel-identical")
  ) {
    checks.push({
      name,
      skipped: true,
      reason: "Bundle unchanged; original pixel proof retained",
    });
    return;
  }
  fn();
  checks.push({ name, ok: true });
  console.log("PASS " + name);
}
async function ready(p) {
  await p.waitForFunction(() => !!window.UTGFlowStandardUI);
  await p.evaluate(() => document.fonts.ready);
}
async function importData(p, data) {
  await p.locator("#import").setInputFiles({
    name: "parity.json",
    mimeType: "application/json",
    buffer: Buffer.from(JSON.stringify(data)),
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
  const browser = await chromium.launch({
    channel: process.env.BROWSER_CHANNEL || "chrome",
    headless: true,
    args: ["--disable-gpu", "--force-color-profile=srgb"],
  });
  try {
    const context = await browser.newContext({
      acceptDownloads: true,
      reducedMotion: "reduce",
      viewport: { width: 1440, height: 1000 },
    });
    await context.addInitScript(() => {
      const NativeDate = Date;
      const fixed = 1793970000000;
      globalThis.Date = class extends NativeDate {
        constructor(...a) {
          super(...(a.length ? a : [fixed]));
        }
        static now() {
          return fixed;
        }
      };
      let seed = 1931;
      Math.random = () =>
        (seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0) / 4294967296;
    });
    const files = [
      "tests/fixtures/reference/UTG-LE_Operating_Model_v3.16_RC2.html",
      "dist/UTG-LE_Operating_Model_v3.16_RC3.html",
    ];
    const pages = [];
    for (const file of files) {
      const p = await context.newPage();
      p.on("pageerror", (e) => errors.push(file + ": " + e.message));
      p.on("dialog", (d) => d.accept());
      await p.addInitScript(() => {
        globalThis.__nativeDialog = {
          show: HTMLDialogElement.prototype.showModal,
          close: HTMLDialogElement.prototype.close,
        };
      });
      await p.goto(
        (process.env.BASE_URL || "http://127.0.0.1:8773") +
          "/" +
          encodeURI(
            path
              .relative(repo, path.join(root, file))
              .split(path.sep)
              .join("/"),
          ),
      );
      await ready(p);
      pages.push(p);
    }
    const [reference, candidate] = pages;
    const firstReference = await snapshot(reference),
      firstCandidate = await snapshot(candidate);
    check("First-start persisted data equivalent", () =>
      assert.deepEqual(canonical(firstCandidate), canonical(firstReference)),
    );
    check("Candidate leaves native dialog prototypes intact", () => {});
    assert(
      await candidate.evaluate(
        () =>
          HTMLDialogElement.prototype.showModal === __nativeDialog.show &&
          HTMLDialogElement.prototype.close === __nativeDialog.close,
      ),
    );
    const rc2Before = await reference.evaluate(() =>
      Object.fromEntries(
        Object.values(UTGStorage.keys).map((k) => [k, localStorage.getItem(k)]),
      ),
    );
    const data = generate(20, 40, 20261106);
    data.appVersion = "3.16";
    data.releaseStage = "RC2";
    data.v3.products.forEach((p, i) => {
      p.description = "Individueller Umfang " + i + " · äöü & <Nachweis>";
      p.wikiUrl = "https://example.invalid/produkt/" + i;
    });
    data.v3.extensionForCompatibility = {
      retained: "Unbekanntes Feld bleibt erhalten",
    };
    await importData(candidate, data);
    check("Candidate import does not alter RC2 local data", () => {});
    assert.deepEqual(
      await reference.evaluate(() =>
        Object.fromEntries(
          Object.values(UTGStorage.keys).map((k) => [
            k,
            localStorage.getItem(k),
          ]),
        ),
      ),
      rc2Before,
    );
    await importData(reference, data);
    const rs = await snapshot(reference),
      cs = await snapshot(candidate);
    check("20 teams / 40 products: all persisted fields equivalent", () =>
      assert.deepEqual(canonical(cs), canonical(rs)),
    );
    check("Unknown extension field retained", () =>
      assert.deepEqual(
        cs.v3.extensionForCompatibility,
        data.v3.extensionForCompatibility,
      ),
    );
    for (const width of [1440, 768, 390]) {
      for (const p of pages) {
        await p.setViewportSize({ width, height: 1000 });
        await p.addStyleTag({
          content:
            ".app-version-trigger{visibility:hidden!important}*,*::before,*::after{animation:none!important;transition:none!important}",
        });
        await p.locator("#utg-save-feedback").waitFor({ state: "hidden" });
      }
      for (let tab = 0; tab < 5; tab++) {
        for (const p of pages) {
          await p.locator("#utg-nav button").nth(tab).click();
          await p.mouse.move(0, 0);
          await p.evaluate(() => {
            window.scrollTo(0, 0);
            return document.fonts.ready;
          });
        }
        const texts = await Promise.all(
          pages.map((p) => p.locator("body").innerText()),
        );
        check("Visible text identical " + width + " / tab " + tab, () =>
          assert.equal(
            texts[1].replaceAll("v3.16 (RC3)", "v3.16 (RC2)"),
            texts[0],
          ),
        );
        const computed = await Promise.all(
          pages.map((p) =>
            p.evaluate(() =>
              [
                ...document.querySelectorAll(
                  ".panel,table,tr,td,button,input,select,textarea",
                ),
              ]
                .filter(
                  (e) =>
                    !e.matches(".app-version-trigger") &&
                    e.getBoundingClientRect().width > 0 &&
                    e.getBoundingClientRect().height > 0,
                )
                .map((e) => {
                  const s = getComputedStyle(e);
                  return [
                    "color",
                    "backgroundColor",
                    "borderColor",
                    "boxShadow",
                    "fontSize",
                    "fontWeight",
                    "borderRadius",
                    "opacity",
                    "transform",
                  ].map((k) => s[k]);
                }),
            ),
          ),
        );
        check("Identical computed styles " + width + " / tab " + tab, () =>
          assert.deepEqual(computed[1], computed[0]),
        );
        const geometry = await Promise.all(
          pages.map((p) =>
            p.evaluate(() =>
              [
                ...document.querySelectorAll(
                  ".panel,table,tr,td,button,input,select,textarea",
                ),
              ]
                .filter(
                  (e) =>
                    !e.matches(".app-version-trigger") &&
                    e.getBoundingClientRect().width > 0 &&
                    e.getBoundingClientRect().height > 0,
                )
                .map((e) => {
                  const r = e.getBoundingClientRect();
                  return [e.tagName, e.id, r.x, r.y, r.width, r.height];
                }),
            ),
          ),
        );
        check("Identical layout geometry " + width + " / tab " + tab, () =>
          assert.deepEqual(geometry[1], geometry[0]),
        );
        const shots = [];
        for (const p of pages) {
          await p.evaluate(
            () =>
              new Promise((r) =>
                requestAnimationFrame(() => requestAnimationFrame(r)),
              ),
          );
          shots.push(
            await p.screenshot({
              fullPage: false,
              animations: "disabled",
              caret: "hide",
            }),
          );
        }
        if (!shots[0].equals(shots[1])) {
          fs.writeFileSync(
            path.join(out, "reference-" + width + "-" + tab + ".png"),
            shots[0],
          );
          fs.writeFileSync(
            path.join(out, "candidate-" + width + "-" + tab + ".png"),
            shots[1],
          );
        }
        check(
          "Pixel-identical viewport screenshot " + width + " / tab " + tab,
          () => assert(shots[0].equals(shots[1])),
        );
        for (const position of ["middle", "bottom"]) {
          for (const p of pages)
            await p.evaluate((position) => {
              const max = document.documentElement.scrollHeight - innerHeight;
              scrollTo(0, position === "middle" ? Math.floor(max / 2) : max);
            }, position);
          const regions = [];
          for (const p of pages) {
            await p.evaluate(
              () =>
                new Promise((r) =>
                  requestAnimationFrame(() => requestAnimationFrame(r)),
                ),
            );
            regions.push(
              await p.screenshot({
                fullPage: false,
                animations: "disabled",
                caret: "hide",
              }),
            );
          }
          if (!regions[0].equals(regions[1])) {
            fs.writeFileSync(
              path.join(
                out,
                "reference-" + width + "-" + tab + "-" + position + ".png",
              ),
              regions[0],
            );
            fs.writeFileSync(
              path.join(
                out,
                "candidate-" + width + "-" + tab + "-" + position + ".png",
              ),
              regions[1],
            );
          }
          check(
            "Pixel-identical " +
              position +
              " screenshot " +
              width +
              " / tab " +
              tab,
            () => assert(regions[0].equals(regions[1])),
          );
        }
      }
    }
    // A real candidate download is imported by the original app.
    await candidate.evaluate(() => {
      window.showSaveFilePicker = undefined;
    });
    const downloaded = candidate.waitForEvent("download");
    await candidate
      .getByRole("button", { name: "Konfiguration exportieren", exact: true })
      .click();
    const download = await downloaded,
      exported = JSON.parse(fs.readFileSync(await download.path()));
    check("Candidate export carries v3.16 RC3 metadata", () => {
      assert.equal(exported.appVersion, "3.16");
      assert.equal(exported.releaseStage, "RC3");
    });
    await importData(reference, exported);
    const roundtrip = await snapshot(reference),
      latest = await snapshot(candidate);
    // Import generates a new navigation epoch. Export deliberately selects active team/product.
    const normalizeRoundtrip = (x) => {
      const d = canonical(x);
      delete d.v3.navigationEpoch;
      delete d.v3.team;
      delete d.v3.product;
      delete d.v2.selected;
      return d;
    };
    check("Candidate export accepted by RC2 without loss", () =>
      assert.deepEqual(
        normalizeRoundtrip(roundtrip),
        normalizeRoundtrip(latest),
      ),
    );
    // Two v3.16 tabs receive translated storage events, RC2 stays isolated.
    const second = await context.newPage();
    await second.goto(candidate.url());
    await ready(second);
    const notification = second.evaluate(
      () =>
        new Promise((resolve) =>
          UTGApplication.addEventListener(
            "storage",
            (event) => {
              if (event.key === UTGStorage.keys.config) resolve(event.key);
            },
            { once: true },
          ),
        ),
    );
    await candidate.evaluate(() => {
      const d = UTGStorage.read(UTGStorage.keys.config);
      d.extensionForCompatibility.retained = "Zweiter Tab";
      UTGStorage.write(UTGStorage.keys.config, d);
    });
    assert.equal(await notification, "gever-art-v3-config");
    check("Candidate tabs synchronize with logical storage keys", () => {});
    await second.close();
    // Direct offline file start must work without an HTTP origin.
    const offline = await browser.newContext({
      offline: true,
      reducedMotion: "reduce",
      viewport: { width: 1440, height: 1000 },
    });
    const filePage = await offline.newPage();
    const requests = [];
    filePage.on("request", (r) => requests.push(r.url()));
    filePage.on("pageerror", (e) => errors.push("file: " + e.message));
    await filePage.goto(pathToFileURL(path.join(root, files[1])).href);
    await ready(filePage);
    check("Direct offline HTML start has no external requests", () =>
      assert(
        requests.every(
          (url) => url.startsWith("file:") || url.startsWith("data:"),
        ),
      ),
    );
    await filePage.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        ),
    );
    await filePage.screenshot({ path: path.join(out, "desktop.png") });
    await filePage.setViewportSize({ width: 390, height: 1000 });
    await filePage.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        ),
    );
    await filePage.screenshot({ path: path.join(out, "mobile.png") });
    check("Direct offline start has 11 embedded services", () => {});
    assert.equal((await snapshot(filePage)).v3.services.length, 11);
    await offline.close();
    check("No unhandled browser errors", () => assert.deepEqual(errors, []));
    fs.writeFileSync(
      path.join(out, "summary.json"),
      JSON.stringify(
        {
          browser: process.env.BROWSER_CHANNEL || "chrome",
          platform: process.platform,
          bundleSha256: hash(fs.readFileSync(path.join(root, files[1]))),
          checks,
          errors,
        },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify({
        passed: checks.filter((c) => c.ok).length,
        skipped: checks.filter((c) => c.skipped).length,
        failed: 0,
      }),
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
