// Exact sort order, persistence, mouse cancellation and scrolling, keyboard boundaries.
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { pathToFileURL } = require("node:url");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "/Users/stefanmauron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const root = path.resolve(__dirname, "..");
const release = JSON.parse(fs.readFileSync(path.join(root, "release.json")));
const out =
  process.env.OUTPUT_DIR || path.join(root, ".test-output/activities");
fs.mkdirSync(out, { recursive: true });
const checks = [],
  errors = [];
function check(name, fn) {
  fn();
  checks.push({ name, ok: true });
  console.log("PASS " + name);
}
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    const context = await browser.newContext({
      offline: true,
      acceptDownloads: true,
      viewport: { width: 1600, height: 1000 },
    });
    const p = await context.newPage();
    p.on("pageerror", (e) => errors.push(e.message));
    await p.goto(
      pathToFileURL(
        path.join(
          root,
          `dist/UTG-LE_Operating_Model_v${release.version}_${release.stage}.html`,
        ),
      ).href,
    );
    const snap = () => p.evaluate(() => UTGStorage.snapshot());
    await p.evaluate(() => {
      const d = UTGStorage.snapshot();
      d.v3.products = [{ id: "test-product", name: "Testprodukt" }];
      d.v3.team = "test-team";
      d.v3.product = "test-product";
      d.v2 = {
        selected: "test-team",
        teams: [
          { id: "test-team", name: "Testteam", productIds: ["test-product"] },
        ],
      };
      UTGStorage.restore(d);
    });
    await p.reload();
    await p.locator("#utg-nav button").nth(1).click();
    const rows = p.locator("#utg-activity-rows tr"),
      handles = rows.locator(".activity-drag-handle");
    await handles.first().scrollIntoViewIfNeeded();
    let current = (await snap()).v3.activities;
    check(
      "32 accessible draggable handles; form controls are not draggable",
      () => assert.equal(current.length, 32),
    );
    assert.equal(await handles.count(), 32);
    assert.equal(await handles.first().getAttribute("draggable"), "true");
    assert(
      (await handles.first().getAttribute("aria-label")).includes(
        current[0].name,
      ),
    );
    assert.equal(
      await rows
        .locator('select[draggable="true"],input[draggable="true"]')
        .count(),
      0,
    );
    async function drag(from, to, after) {
      const before = await snap();
      const expected = structuredClone(before.v3.activities);
      const targetId = expected[to].id;
      const [item] = expected.splice(from, 1);
      expected.splice(
        expected.findIndex((a) => a.id === targetId) + (after ? 1 : 0),
        0,
        item,
      );
      await rows.first().scrollIntoViewIfNeeded();
      const box = await rows.nth(to).boundingBox();
      await handles.nth(from).dragTo(rows.nth(to), {
        targetPosition: { x: 20, y: after ? box.height - 5 : 5 },
      });
      const actual = await snap();
      check(
        `Mouse ${from} to ${after ? "after" : "before"} ${to}: exact order and unchanged content`,
        () => assert.deepEqual(actual.v3.activities, expected),
      );
      const baseline = structuredClone(before);
      baseline.v3.activities = expected;
      assert.deepEqual(
        actual,
        baseline,
        "Sorting must only change the activity array",
      );
      current = expected;
    }
    await drag(0, 2, true);
    await drag(2, 0, false);
    async function key(index, key, target) {
      const before = await snap();
      const expected = structuredClone(before.v3.activities);
      if (target !== index) {
        const [item] = expected.splice(index, 1);
        expected.splice(target, 0, item);
      }
      await handles.nth(index).focus();
      await p.keyboard.press(key);
      const after = await snap();
      check(`Keyboard ${key} at ${index}: exact order`, () =>
        assert.deepEqual(after.v3.activities, expected),
      );
      const baseline = structuredClone(before);
      baseline.v3.activities = expected;
      assert.deepEqual(after, baseline);
      current = expected;
    }
    await key(0, "ArrowUp", 0);
    await key(0, "ArrowDown", 1);
    await key(1, "ArrowUp", 0);
    await key(31, "ArrowDown", 31);
    await key(31, "ArrowUp", 30);
    await key(30, "ArrowDown", 31);
    await p.reload();
    await p.locator("#utg-nav button").nth(1).click();
    const reloaded = await snap();
    check("Reload retains exact order", () =>
      assert.deepEqual(reloaded.v3.activities, current),
    );
    // Real native drag: hold at the lower viewport edge, verify page scrolls, then cancel.
    await handles.first().scrollIntoViewIfNeeded();
    const beforeCancel = await snap();
    const start = await handles.first().boundingBox();
    await p.mouse.move(start.x + start.width / 2, start.y + start.height / 2);
    await p.mouse.down();
    await p.mouse.move(
      start.x + start.width / 2,
      start.y + start.height / 2 + 15,
      { steps: 5 },
    );
    const scrollBefore = await p.evaluate(() => scrollY);
    await p.mouse.move(start.x + start.width / 2, 980, { steps: 12 });
    await p.mouse.move(start.x + start.width / 2, 979);
    await p.waitForFunction((y) => scrollY > y + 30, scrollBefore, {
      timeout: 4000,
    });
    await p.keyboard.press("Escape");
    await p.mouse.up();
    const cancelled = await snap();
    check(
      "Native drag scrolls at lower edge and Escape cancels without data changes",
      () => assert.deepEqual(cancelled, beforeCancel),
    );
    assert.equal(
      await p.locator(".activity-drop-before,.activity-drop-after").count(),
      0,
    );
    await p.locator("#utg-nav button").nth(2).click();
    const names = await p
      .locator("#v3rows tr[data-i] td:nth-child(2)")
      .allTextContents();
    check("Matrix follows exact catalog order", () =>
      assert.deepEqual(
        names,
        current.map((x) => x.name),
      ),
    );
    const note = p.locator('#v3rows [data-f="note"] input').first();
    await note.fill("Bestehende Zuordnung äöü & <Nachweis>");
    await note.press("Tab");
    const populated = await snap();
    await p.locator("#utg-nav button").nth(1).click();
    await p.locator("#utg-activity-add").click();
    await p
      .locator("#utg-name-drawer-input")
      .fill("Zusätzliche Tätigkeit mit bestehender Matrix");
    await p
      .locator("#utg-activity-description")
      .fill("Beschreibung äöü & <Nachweis>\nZweite Zeile");
    await p.getByRole("button", { name: "Übernehmen", exact: true }).click();
    const extended = await snap();
    check(
      "Adding an activity preserves existing populated team assignments",
      () => assert.deepEqual(extended.v3.configs, populated.v3.configs),
    );
    assert.deepEqual(extended.v3.activities.slice(0, -1), current);
    current = extended.v3.activities;
    // New activities also participate in keyboard ordering.
    await handles.last().focus();
    await p.keyboard.press("ArrowUp");
    const newActivity = current.pop();
    current.splice(current.length - 1, 0, newActivity);
    const movedNew = await snap();
    check(
      "New activity can be moved without changing existing assignments",
      () => assert.deepEqual(movedNew.v3.activities, current),
    );
    assert.deepEqual(movedNew.v3.configs, populated.v3.configs);
    const beforeExport = await snap();
    const download = p.waitForEvent("download");
    await p.evaluate(() => UTGFiles.save(true));
    const d = await download;
    const data = JSON.parse(fs.readFileSync(await d.path()));
    check("Actual JSON download preserves catalog order", () =>
      assert.deepEqual(data.v3.activities, current),
    );
    assert.deepEqual(await snap(), beforeExport);
    await p.locator("#utg-nav button").nth(1).click();
    await handles.first().scrollIntoViewIfNeeded();
    await p.screenshot({ path: path.join(out, "activities.png") });
    check("No unhandled browser errors", () => assert.deepEqual(errors, []));
    fs.writeFileSync(
      path.join(out, "summary.json"),
      JSON.stringify(
        { release, checks, errors, passed: checks.length, failed: 0 },
        null,
        2,
      ) + "\n",
    );
  } finally {
    await browser.close();
  }
})().catch((e) => {
  fs.writeFileSync(
    path.join(out, "failure.json"),
    JSON.stringify({ checks, errors, failure: e.message }, null, 2),
  );
  console.error(e);
  process.exitCode = 1;
});
