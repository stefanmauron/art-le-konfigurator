// Actual browser behaviour: no copied UI implementation, no personal profile, no production writes.
const fs = require("node:fs"),
  path = require("node:path"),
  assert = require("node:assert/strict");
const { chromium } = require(
  process.env.PLAYWRIGHT_MODULE ||
    "/Users/stefanmauron/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright",
);
const root = path.resolve(__dirname, "../.."),
  out =
    process.env.OUTPUT_DIR ||
    path.join(root, ".test-output/browser-flow-control");
fs.mkdirSync(out, { recursive: true });
const stages = [
    "Funnel",
    "Analyzing",
    "Backlog",
    "Implementing",
    "Validating",
    "Deploying & Releasing",
    "Done",
  ],
  url =
    (process.env.BASE_URL || "http://127.0.0.1:8773") +
    "/" +
    encodeURI(
      "dist/UTG-LE_Operating_Model_v3.16_RC3.html",
    ),
  checks = [],
  errors = [];
const read = (p) => p.evaluate(() => window.UTGStorage.snapshot());
const waitRule = (p) => p.locator("#utg-rule-details[open]").waitFor();
const closeRule = async (p) => {
  await p.locator("#utg33close").click();
  await p.locator("#utg-rule-details[open]").waitFor({ state: "hidden" });
  await p.waitForFunction(
    () => !document.querySelector('[data-policy][aria-expanded="true"]'),
  );
};
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    async function record(id, fn, p) {
      try {
        await fn();
        checks.push({ id, ok: true });
        console.log("PASS " + id);
      } catch (e) {
        checks.push({ id, ok: false, error: e.message, stack: e.stack });
        console.log("FAIL " + id + " " + e.message);
        if (p)
          await p
            .screenshot({
              path: path.join(out, id.replace(/[^a-zA-Z0-9_-]/g, "_") + ".png"),
            })
            .catch(() => {});
      }
      fs.writeFileSync(
        path.join(out, "checks.json"),
        JSON.stringify(checks, null, 2) + "\n",
      );
    }
    async function setup() {
      const context = await browser.newContext({
          viewport: { width: 1440, height: 1050 },
        }),
        p = await context.newPage();
      p.setDefaultTimeout(8000);
      p.on("pageerror", (e) => errors.push(e.message));
      p.on("dialog", (d) => d.accept());
      await p.goto(url);
      await p.evaluate(() => {
        const b = window.UTGDefaults.baseline();
        b.v2.teams = [
          { id: "flow-a", name: "Team A", productIds: ["pa"], assignments: {} },
          { id: "flow-b", name: "Team B", productIds: ["pb"], assignments: {} },
        ];
        b.v2.selected = "flow-a";
        b.v3.products = [
          { id: "pa", name: "Produkt A" },
          { id: "pb", name: "Produkt B" },
        ];
        b.v3.team = "flow-a";
        b.v3.product = "pa";
        b.v3.configs = {
          "flow-a::flow": { status: "Entwurf", entries: {} },
          "flow-b::flow": { status: "Entwurf", entries: {} },
        };
        for (const [i, policy] of b.v3.policies.entries())
          Object.assign(policy, {
            exit: "Regel " + policy.name,
            owner: "Entscheidrolle " + i,
            contributors: "Beteiligte " + i,
            evidence: "Nachweis " + i,
            wip: String(i + 1),
          });
        for (const t of b.v2.teams) {
          window.UTGFlowCriteria.ensureTeam(b.v3, t.id);
          b.v3.flowCriteria.profiles[t.id].commonDoR[0].description =
            "Bereitschaft " + t.name;
          b.v3.flowCriteria.profiles[t.id].phaseGates.Funnel[0].description =
            "Eintritt " + t.name;
        }
        window.UTGStorage.restore(b);
      });
      await p.reload();
      await p.waitForFunction(() => !!window.UTGFlowStandardUI);
      await p.locator("#utg-nav button").nth(3).click();
      return { context, p };
    }
    async function isolated(id, fn) {
      const { context, p } = await setup();
      try {
        await record(id, () => fn(p, context), p);
      } finally {
        await context.close();
      }
    }
    for (const view of ["reference", "team:flow-a", "team:flow-b", "all"]) {
      const { context, p } = await setup();
      try {
        await p.locator("#model-view").selectOption(view);
        const before = await read(p);
        for (const [i, stage] of stages.entries()) {
          await record(
            "display:" + view + ":" + stage,
            async () => {
              await p.locator('[data-policy="' + i + '"]').click();
              await waitRule(p);
              assert.equal(
                await p.locator("#utg-rule-title").textContent(),
                stage,
              );
              assert.equal(
                await p.locator("#utg33exit").textContent(),
                "Regel " + stage,
              );
              assert.equal(
                await p.locator(".rule-summary .rule-type").textContent(),
                i === 6 ? "Abschluss" : "Übergang",
              );
              assert.deepEqual(
                await p
                  .locator(".rule-summary .rule-facts dd")
                  .allTextContents(),
                [
                  "Entscheidrolle " + i,
                  String(i + 1),
                  "Beteiligte " + i,
                  "Nachweis " + i,
                ],
              );
              assert.equal(
                await p.locator(".rule-criteria-context").first().textContent(),
                view === "team:flow-a"
                  ? "Team A"
                  : view === "team:flow-b"
                    ? "Team B"
                    : "Standardvorlage für neue Teams",
              );
              assert.equal(
                await p.locator('[data-policy][aria-expanded="true"]').count(),
                1,
              );
              const counts = await p.evaluate(
                ({ stage, view }) =>
                  Object.fromEntries(
                    ["Phase", "AC", "DoR", "DoD"].map((type) => [
                      type,
                      window.UTGFlowCriteria.typed(
                        window.UTGStorage.read("gever-art-v3-config"),
                        stage,
                        view.startsWith("team:") ? view.slice(5) : "",
                        type,
                      ).length,
                    ]),
                  ),
                { stage, view },
              );
              for (const [type, count] of Object.entries(counts))
                assert.equal(
                  await p
                    .locator(
                      '[data-edit-flow="' + type + '"] .flow-criteria-count',
                    )
                    .textContent(),
                  String(count),
                );
              await closeRule(p);
              await p.waitForFunction(
                (i) => document.activeElement.dataset.policy === String(i),
                i,
              );
              assert.equal(
                await p.locator('[data-policy][aria-expanded="true"]').count(),
                0,
              );
            },
            p,
          );
          if (await p.locator("#utg-rule-details[open]").count())
            await closeRule(p);
        }
        await record(
          "read-only:" + view,
          async () => {
            const after = await read(p);
            assert.deepEqual(after.v3.policies, before.v3.policies);
            assert.deepEqual(after.v3.flowCriteria, before.v3.flowCriteria);
            assert.deepEqual(after.v3.configs, before.v3.configs);
          },
          p,
        );
      } finally {
        await context.close();
      }
    }
    for (const [i, stage] of stages.entries())
      await isolated("art-edit:" + stage, async (p) => {
        await p.locator("#model-view").selectOption("team:flow-a");
        const before = await read(p);
        await p.locator('[data-policy="' + i + '"]').click();
        await p.locator("#rule-edit-art").click();
        await p
          .locator("dialog[open]")
          .getByRole("textbox", {
            name: "ART-weiter Mindestvertrag",
            exact: true,
          })
          .fill("Neue ART-Regel " + stage);
        await p
          .getByRole("button", {
            name: "ART-weite Regel speichern",
            exact: true,
          })
          .click();
        await waitRule(p);
        assert.equal(
          await p.locator("#utg33exit").textContent(),
          "Neue ART-Regel " + stage,
        );
        await closeRule(p);
        for (const view of ["team:flow-b", "reference", "all"]) {
          await p.locator("#model-view").selectOption(view);
          await p.locator('[data-policy="' + i + '"]').click();
          assert.equal(
            await p.locator("#utg33exit").textContent(),
            "Neue ART-Regel " + stage,
          );
          await closeRule(p);
        }
        const after = await read(p);
        assert.deepEqual(after.v3.flowCriteria, before.v3.flowCriteria);
        assert.deepEqual(after.v3.configs, before.v3.configs);
        assert.equal(after.v3.agreementConfirmations, undefined);
        assert.deepEqual(
          after.v3.policies.filter((p) => p.name !== stage),
          before.v3.policies.filter((p) => p.name !== stage),
        );
        assert.equal(
          await p
            .locator("#utg33policybar .utg33-slot")
            .nth(i)
            .locator(":scope > span")
            .last()
            .textContent(),
          "Neue ART-Regel " + stage,
        );
        assert.equal(
          await p
            .locator(
              "#model-content .flow-grid:not(.utg-secondary-grid) .flow-quality .app-description-text",
            )
            .nth(i)
            .textContent(),
          "Neue ART-Regel " + stage,
        );
      });
    await isolated("team-dor-isolation", async (p) => {
      const before = await read(p);
      await p.locator("#model-view").selectOption("team:flow-a");
      await p.locator('[data-policy="0"]').click();
      await p.locator('[data-edit-flow="DoR"]').click();
      await p
        .locator("dialog[open] textarea")
        .first()
        .fill("Neue Bereitschaft Team A");
      await p
        .getByRole("button", { name: "Kriterien speichern", exact: true })
        .click();
      await waitRule(p);
      await closeRule(p);
      await p.locator('[data-policy="6"]').click();
      await p.locator('[data-edit-flow="DoR"]').click();
      assert.equal(
        await p.locator("dialog[open] textarea").first().inputValue(),
        "Neue Bereitschaft Team A",
      );
      await p.getByRole("button", { name: "Abbrechen", exact: true }).click();
      await waitRule(p);
      await closeRule(p);
      await p.locator("#model-view").selectOption("team:flow-b");
      await p.locator('[data-policy="0"]').click();
      await p.locator('[data-edit-flow="DoR"]').click();
      assert.equal(
        await p.locator("dialog[open] textarea").first().inputValue(),
        "Bereitschaft Team B",
      );
      const after = await read(p);
      assert.deepEqual(after.v3.policies, before.v3.policies);
      assert.deepEqual(
        after.v3.flowCriteria.profiles["flow-b"],
        before.v3.flowCriteria.profiles["flow-b"],
      );
      assert.deepEqual(
        after.v3.flowCriteria.commonDoR,
        before.v3.flowCriteria.commonDoR,
      );
    });
    await isolated("template-existing-new-team", async (p) => {
      const before = await read(p);
      await p.locator("#model-view").selectOption("reference");
      await p.locator('[data-policy="2"]').click();
      await p.locator('[data-edit-flow="Phase"]').click();
      await p
        .locator("dialog[open] textarea")
        .first()
        .fill("Neue Vorlage Backlog");
      await p
        .getByRole("button", { name: "Kriterien speichern", exact: true })
        .click();
      await waitRule(p);
      await closeRule(p);
      assert.deepEqual(
        (await read(p)).v3.flowCriteria.profiles,
        before.v3.flowCriteria.profiles,
      );
      await p.locator("#utg-nav button").nth(1).click();
      await p.locator("#crud-add-team").click();
      await p.locator("#crud-name").fill("Team C – neue Vorlage");
      await p.getByRole("button", { name: "Übernehmen", exact: true }).click();
      await p.waitForLoadState("load");
      await p.waitForFunction(() => !!window.UTGFlowCriteria);
      const after = await read(p),
        id = after.v2.teams.find((t) => t.name === "Team C – neue Vorlage").id;
      assert.equal(
        after.v3.flowCriteria.profiles[id].phaseGates.Backlog[0].description,
        "Neue Vorlage Backlog",
      );
      assert.deepEqual(
        after.v3.flowCriteria.profiles["flow-a"],
        before.v3.flowCriteria.profiles["flow-a"],
      );
    });
    await isolated("mode-no-data-mutation", async (p) => {
      const before = await read(p);
      await p.locator("#utg33extended").click();
      assert.equal(
        await p.locator("#utg33extended").getAttribute("aria-pressed"),
        "true",
      );
      assert(await p.locator("#utg33events").isVisible());
      assert.equal(await p.locator("#utg33events .utg33-event").count(), 7);
      await p.locator("#utg33compact").click();
      assert.equal(
        await p.locator("#utg33compact").getAttribute("aria-pressed"),
        "true",
      );
      assert.equal(await p.locator("#utg33events").isVisible(), false);
      assert.deepEqual((await read(p)).v3, before.v3);
    });
    await isolated("same-window-live-update", async (p) => {
      await p.locator('[data-policy="2"]').click();
      await p.evaluate(() => {
        const d = window.UTGStorage.read("gever-art-v3-config");
        d.policies[2].exit = "Aktuelle Backlog-Regel";
        window.UTGStorage.write("gever-art-v3-config", d);
        window.dispatchEvent(new Event("gever-v3-updated"));
      });
      assert.equal(
        await p.locator("#utg33exit").textContent(),
        "Aktuelle Backlog-Regel",
      );
      assert.equal(
        await p
          .locator("#utg33policybar .utg33-slot")
          .nth(2)
          .locator(":scope > span")
          .last()
          .textContent(),
        "Aktuelle Backlog-Regel",
      );
      assert.equal(
        await p
          .locator(
            "#model-content .flow-grid:not(.utg-secondary-grid) .flow-quality .app-description-text",
          )
          .nth(2)
          .textContent(),
        "Aktuelle Backlog-Regel",
      );
    });
    await isolated("scroll-and-focus-after-editor", async (p) => {
      await p.locator('[data-policy="4"]').click();
      const action = p.locator('[data-edit-flow="DoD"]');
      await action.scrollIntoViewIfNeeded();
      const scroll = await p
        .locator("#utg-rule-details .ui-drawer-body")
        .evaluate((e) => e.scrollTop);
      await action.click();
      assert.equal(await p.locator("dialog[open]").count(), 1);
      await p.getByRole("button", { name: "Abbrechen", exact: true }).click();
      await waitRule(p);
      await p.waitForFunction(
        () => document.activeElement.dataset.editFlow === "DoD",
      );
      assert(
        Math.abs(
          (await p
            .locator("#utg-rule-details .ui-drawer-body")
            .evaluate((e) => e.scrollTop)) - scroll,
        ) <= 1,
      );
    });
    await isolated("policy-concurrent-edit", async (p) => {
      await p.locator('[data-policy="1"]').click();
      await p.locator("#rule-edit-art").click();
      await p
        .locator("dialog[open]")
        .getByRole("textbox", {
          name: "ART-weiter Mindestvertrag",
          exact: true,
        })
        .fill("Eigener Entwurf");
      await p.evaluate(() => {
        const d = window.UTGStorage.read("gever-art-v3-config");
        d.policies[1].exit = "Extern aktualisiert";
        window.UTGStorage.write("gever-art-v3-config", d);
      });
      await p
        .getByRole("button", { name: "ART-weite Regel speichern", exact: true })
        .click();
      assert(
        (
          await p.locator("dialog[open] .app-save-error").textContent()
        ).includes("inzwischen geändert"),
      );
      assert.equal(
        await p
          .locator("dialog[open]")
          .getByRole("textbox", {
            name: "ART-weiter Mindestvertrag",
            exact: true,
          })
          .inputValue(),
        "Eigener Entwurf",
      );
      assert.equal((await read(p)).v3.policies[1].exit, "Extern aktualisiert");
    });
    await isolated("policy-save-failure-retry", async (p) => {
      const before = await read(p);
      await p.locator('[data-policy="5"]').click();
      await p.locator("#rule-edit-art").click();
      await p
        .locator("dialog[open]")
        .getByRole("textbox", {
          name: "ART-weiter Mindestvertrag",
          exact: true,
        })
        .fill("Neuer Release-Vertrag");
      await p.evaluate(() => {
        window.__originalSet = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (
            key ===
            (window.UTGApplication
              ? "utg-le-v317:gever-art-v3-config"
              : "gever-art-v3-config")
          )
            throw Error("Test-Schreibfehler");
          return window.__originalSet.call(this, key, value);
        };
      });
      await p
        .getByRole("button", { name: "ART-weite Regel speichern", exact: true })
        .click();
      assert(
        (
          await p.locator("dialog[open] .app-save-error").textContent()
        ).includes("Test-Schreibfehler"),
      );
      assert.deepEqual((await read(p)).v3.policies, before.v3.policies);
      await p.evaluate(
        () => (Storage.prototype.setItem = window.__originalSet),
      );
      await p
        .getByRole("button", { name: "ART-weite Regel speichern", exact: true })
        .click();
      await waitRule(p);
      assert.equal(
        await p.locator("#utg33exit").textContent(),
        "Neuer Release-Vertrag",
      );
    });
    await isolated("missing-rule-repair", async (p) => {
      await p.evaluate(() => {
        const d = window.UTGStorage.read("gever-art-v3-config");
        d.policies = d.policies.filter((p) => p.name !== "Validating");
        window.UTGStorage.write("gever-art-v3-config", d);
        window.dispatchEvent(new Event("gever-v3-updated"));
      });
      await p.locator('[data-policy="4"]').click();
      assert.equal(
        await p.locator("#utg33exit").textContent(),
        "Noch keine Vereinbarung erfasst.",
      );
      await p.locator("#rule-edit-art").click();
      await p
        .getByRole("heading", {
          name: /ART-weite Regel (bearbeiten|erfassen) · Validating/,
        })
        .waitFor({ timeout: 1500 });
    });
    {
      const { context, p } = await setup();
      try {
        await p.locator('[data-policy="2"]').click();
        await p.evaluate(() => {
          window.__flowStorageEvents = 0;
          window.addEventListener(
            "storage",
            () => window.__flowStorageEvents++,
          );
        });
        const writer = await context.newPage();
        await writer.goto(url);
        await writer.evaluate(() => {
          const d = window.UTGStorage.read("gever-art-v3-config");
          d.policies[2].exit = "Regel aus zweitem Testtab";
          window.UTGStorage.write("gever-art-v3-config", d);
        });
        await p.waitForFunction(() => window.__flowStorageEvents > 0);
        for (const [id, selector] of [
          [
            "storage-card",
            "#utg33policybar .utg33-slot:nth-child(3) > span:last-of-type",
          ],
          [
            "storage-grid",
            "#model-content .flow-grid:not(.utg-secondary-grid) .flow-col:nth-child(3) .app-description-text",
          ],
          ["storage-drawer", "#utg33exit"],
        ])
          await record(
            id,
            async () =>
              assert.equal(
                await p.locator(selector).textContent(),
                "Regel aus zweitem Testtab",
              ),
            p,
          );
        await record(
          "storage-reopen-fresh",
          async () => {
            await closeRule(p);
            await p.locator('[data-policy="2"]').click();
            assert.equal(
              await p.locator("#utg33exit").textContent(),
              "Regel aus zweitem Testtab",
            );
          },
          p,
        );
      } finally {
        await context.close();
      }
    }

    async function removePolicy(p, stage) {
      await p.evaluate((stage) => {
        const d = window.UTGStorage.read("gever-art-v3-config");
        d.policies = d.policies.filter((policy) => policy.name !== stage);
        window.UTGStorage.write("gever-art-v3-config", d);
        window.dispatchEvent(new Event("gever-v3-updated"));
      }, stage);
    }
    async function openMissing(p, i) {
      await p.locator('[data-policy="' + i + '"]').click();
      await p.locator("#rule-edit-art").click();
      await p
        .getByRole("heading", {
          name: "ART-weite Regel erfassen · " + stages[i],
          exact: true,
        })
        .waitFor();
    }
    async function fillNew(p, text) {
      const editor = p.locator("dialog[open]");
      await editor
        .getByRole("textbox", {
          name: "Verantwortliche Entscheidrolle",
          exact: true,
        })
        .fill("Test-Entscheidrolle");
      await editor
        .getByRole("textbox", {
          name: "Erwarteter Nachweis / Referenz",
          exact: true,
        })
        .fill("Synthetischer Erfassungsnachweis");
      await editor
        .getByRole("textbox", {
          name: "ART-weiter Mindestvertrag",
          exact: true,
        })
        .fill(text);
    }
    for (const [i, stage] of stages.entries())
      await isolated("create-missing:" + stage, async (p) => {
        await removePolicy(p, stage);
        const before = await read(p);
        await openMissing(p, i);
        assert.deepEqual((await read(p)).v3, before.v3);
        assert.equal(
          await p
            .locator("dialog[open]")
            .getByRole("combobox", { name: /Policy-Typ/ })
            .inputValue(),
          i === 6 ? "Abschluss" : "Übergang",
        );
        await fillNew(p, "Erfasste Regel " + stage);
        await p
          .getByRole("button", {
            name: "ART-weite Regel erstellen",
            exact: true,
          })
          .click();
        await waitRule(p);
        assert.equal(
          await p.locator("#utg33exit").textContent(),
          "Erfasste Regel " + stage,
        );
        const after = await read(p);
        assert.equal(after.v3.policies.length, 7);
        assert.equal(
          after.v3.policies.filter((policy) => policy.name === stage).length,
          1,
        );
        assert.deepEqual(after.v3.flowCriteria, before.v3.flowCriteria);
        assert.deepEqual(
          after.v3.policies.filter((policy) => policy.name !== stage),
          before.v3.policies,
        );
        await closeRule(p);
        await p.locator('[data-policy="' + i + '"]').click();
        assert.equal(
          await p.locator("#utg33exit").textContent(),
          "Erfasste Regel " + stage,
        );
      });
    await isolated("create-cancel-no-write", async (p) => {
      await removePolicy(p, "Validating");
      const before = await read(p);
      await openMissing(p, 4);
      await fillNew(p, "Verworfener Entwurf");
      await p.getByRole("button", { name: "Abbrechen", exact: true }).click();
      await waitRule(p);
      assert.equal(
        await p.locator("#utg33exit").textContent(),
        "Noch keine Vereinbarung erfasst.",
      );
      assert.deepEqual((await read(p)).v3, before.v3);
    });
    await isolated("create-retry-no-duplicate", async (p) => {
      await removePolicy(p, "Validating");
      const before = await read(p);
      await openMissing(p, 4);
      await fillNew(p, "Erfassung nach Wiederholung");
      await p.evaluate(() => {
        window.__originalSet = Storage.prototype.setItem;
        Storage.prototype.setItem = function (key, value) {
          if (
            key ===
            (window.UTGApplication
              ? "utg-le-v317:gever-art-v3-config"
              : "gever-art-v3-config")
          )
            throw Error("Anlage-Schreibfehler");
          return window.__originalSet.call(this, key, value);
        };
      });
      await p
        .getByRole("button", { name: "ART-weite Regel erstellen", exact: true })
        .click();
      assert(
        (
          await p.locator("dialog[open] .app-save-error").textContent()
        ).includes("Anlage-Schreibfehler"),
      );
      assert.deepEqual((await read(p)).v3, before.v3);
      await p.evaluate(
        () => (Storage.prototype.setItem = window.__originalSet),
      );
      await p
        .getByRole("button", { name: "ART-weite Regel erstellen", exact: true })
        .click();
      await waitRule(p);
      assert.equal(
        (await read(p)).v3.policies.filter(
          (policy) => policy.name === "Validating",
        ).length,
        1,
      );
    });
    await isolated("create-without-policy-catalogue", async (p) => {
      await p.evaluate(() => {
        const d = window.UTGStorage.read("gever-art-v3-config");
        delete d.policies;
        window.UTGStorage.write("gever-art-v3-config", d);
        window.dispatchEvent(new Event("gever-v3-updated"));
      });
      await openMissing(p, 0);
      assert.equal((await read(p)).v3.policies, undefined);
      await fillNew(p, "Erste ausdrücklich erfasste Regel");
      await p
        .getByRole("button", { name: "ART-weite Regel erstellen", exact: true })
        .click();
      await waitRule(p);
      assert.equal((await read(p)).v3.policies.length, 1);
    });
    await isolated("create-id-collision", async (p) => {
      await p.evaluate(() => {
        const d = window.UTGStorage.read("gever-art-v3-config");
        d.policies[0].id = "FP-5";
        window.UTGStorage.write("gever-art-v3-config", d);
      });
      await removePolicy(p, "Validating");
      await openMissing(p, 4);
      await fillNew(p, "Regel mit eigenständiger Kennung");
      await p
        .getByRole("button", { name: "ART-weite Regel erstellen", exact: true })
        .click();
      await waitRule(p);
      const policies = (await read(p)).v3.policies;
      assert.equal(
        policies.find((policy) => policy.name === "Funnel").id,
        "FP-5",
      );
      assert.notEqual(
        policies.find((policy) => policy.name === "Validating").id,
        "FP-5",
      );
    });
    await isolated("concurrent-create-conflict", async (p, context) => {
      await removePolicy(p, "Validating");
      await openMissing(p, 4);
      await fillNew(p, "Eigene neue Regel");
      const writer = await context.newPage();
      await writer.goto(url);
      await writer.locator("#utg-nav button").nth(3).click();
      await openMissing(writer, 4);
      await fillNew(writer, "Regel des zweiten Testtabs");
      await writer
        .getByRole("button", { name: "ART-weite Regel erstellen", exact: true })
        .click();
      await waitRule(writer);
      await p
        .getByRole("button", { name: "ART-weite Regel erstellen", exact: true })
        .click();
      assert(
        (
          await p.locator("dialog[open] .app-save-error").textContent()
        ).includes("inzwischen angelegt"),
      );
      assert.equal(
        await p
          .locator("dialog[open]")
          .getByRole("textbox", {
            name: "ART-weiter Mindestvertrag",
            exact: true,
          })
          .inputValue(),
        "Eigene neue Regel",
      );
      const policies = (await read(p)).v3.policies.filter(
        (policy) => policy.name === "Validating",
      );
      assert.equal(policies.length, 1);
      assert.equal(policies[0].exit, "Regel des zweiten Testtabs");
    });
    for (const mode of ["return", "throw", "reuse"])
      await isolated("handoff:" + mode, async (p) => {
        const before = await read(p);
        await p.locator('[data-policy="3"]').click();
        await p.evaluate((mode) => {
          if (mode === "return") window.UTGPolicyEditor.open = () => undefined;
          else if (mode === "throw")
            window.UTGPolicyEditor.open = () => {
              throw Error("Test-Editorfehler");
            };
          else {
            const d = document.createElement("dialog");
            d.id = "reused-test-editor";
            d.className = "app-drawer";
            d.innerHTML =
              '<h2>Wiederverwendeter Testeditor</h2><button type="button">Testeditor schliessen</button>';
            d.querySelector("button").onclick = () => d.close();
            document.body.append(d);
            window.UTGPolicyEditor.open = () => d.showModal();
          }
        }, mode);
        await p.locator("#rule-edit-art").click();
        if (mode === "reuse") {
          await p.locator("#reused-test-editor[open]").waitFor();
          assert.equal(await p.locator("dialog[open]").count(), 1);
          await p
            .getByRole("button", { name: "Testeditor schliessen", exact: true })
            .click();
        }
        await waitRule(p);
        await p.waitForFunction(
          () =>
            document
              .getElementById("utg33detail")
              .classList.contains("utg33-hidden") === false,
        );
        assert.equal(
          await p.locator("#utg33exit").textContent(),
          "Regel Implementing",
        );
        assert.equal(await p.locator("dialog[open]").count(), 1);
        assert.deepEqual((await read(p)).v3, before.v3);
      });
    await isolated("storage-dirty-policy-conflict", async (p, context) => {
      await p.locator('[data-policy="2"]').click();
      await p.locator("#rule-edit-art").click();
      await p
        .locator("dialog[open]")
        .getByRole("textbox", {
          name: "ART-weiter Mindestvertrag",
          exact: true,
        })
        .fill("Nicht gespeicherter eigener Entwurf");
      const dialogs = [];
      p.on("dialog", (d) => dialogs.push(d.message()));
      const writer = await context.newPage();
      await writer.goto(url);
      await writer.evaluate(() => {
        const d = window.UTGStorage.read("gever-art-v3-config");
        d.policies[2].exit = "Extern aktualisierter Mindestvertrag";
        window.UTGStorage.write("gever-art-v3-config", d);
      });
      await p.waitForFunction(
        () =>
          document.querySelector(
            "#utg33policybar .utg33-slot:nth-child(3) > span:last-of-type",
          ).textContent === "Extern aktualisierter Mindestvertrag",
      );
      assert.equal(
        await p
          .locator("dialog[open]")
          .getByRole("textbox", {
            name: "ART-weiter Mindestvertrag",
            exact: true,
          })
          .inputValue(),
        "Nicht gespeicherter eigener Entwurf",
      );
      assert.deepEqual(dialogs, []);
      await p
        .getByRole("button", { name: "ART-weite Regel speichern", exact: true })
        .click();
      assert(
        (
          await p.locator("dialog[open] .app-save-error").textContent()
        ).includes("inzwischen geändert"),
      );
      assert.equal(
        (await read(p)).v3.policies[2].exit,
        "Extern aktualisierter Mindestvertrag",
      );
    });
    await isolated("storage-other-team-draft-preserved", async (p, context) => {
      await p.locator("#model-view").selectOption("team:flow-a");
      await p.locator('[data-policy="0"]').click();
      await p.locator('[data-edit-flow="DoR"]').click();
      await p
        .locator("dialog[open] textarea")
        .first()
        .fill("Eigene Bereitschaft A");
      const writer = await context.newPage();
      await writer.goto(url);
      await writer.evaluate(() => {
        const d = window.UTGStorage.read("gever-art-v3-config");
        d.flowCriteria.profiles["flow-b"].commonDoR[0].description =
          "Externe Bereitschaft B";
        window.UTGStorage.write("gever-art-v3-config", d);
      });
      await p
        .getByRole("button", { name: "Kriterien speichern", exact: true })
        .click();
      await waitRule(p);
      const d = (await read(p)).v3;
      assert.equal(
        d.flowCriteria.profiles["flow-a"].commonDoR[0].description,
        "Eigene Bereitschaft A",
      );
      assert.equal(
        d.flowCriteria.profiles["flow-b"].commonDoR[0].description,
        "Externe Bereitschaft B",
      );
    });
    await isolated("storage-unrelated-key", async (p, context) => {
      await p.locator('[data-policy="1"]').click();
      const before = await read(p),
        node = await p.locator("#utg33exit").elementHandle();
      await p.evaluate(() => {
        window.__unrelatedEvent = false;
        window.addEventListener("storage", (event) => {
          if (event.key === "unrelated-test") window.__unrelatedEvent = true;
        });
      });
      const writer = await context.newPage();
      await writer.goto(url);
      await writer.evaluate(() =>
        localStorage.setItem("unrelated-test", "Synthetischer Test"),
      );
      await p.waitForFunction(() => window.__unrelatedEvent);
      assert(
        await p.evaluate(
          (old) => document.getElementById("utg33exit") === old,
          node,
        ),
      );
      assert.deepEqual((await read(p)).v3, before.v3);
    });
    await isolated("storage-team-removed-with-draft", async (p, context) => {
      await p.locator("#model-view").selectOption("team:flow-b");
      await p.locator('[data-policy="0"]').click();
      await p.locator('[data-edit-flow="DoR"]').click();
      await p
        .locator("dialog[open] textarea")
        .first()
        .fill("Entwurf des entfernten Teams");
      const writer = await context.newPage();
      await writer.goto(url);
      await writer.evaluate(() => {
        const b = window.UTGStorage.bundle();
        b.v2.teams = b.v2.teams.filter((t) => t.id !== "flow-b");
        delete b.v3.flowCriteria.profiles["flow-b"];
        delete b.v3.configs["flow-b::flow"];
        window.UTGStorage.restore(b);
      });
      await p.waitForFunction(
        () => document.getElementById("model-view").value !== "team:flow-b",
      );
      assert.equal(
        await p.locator('#model-view option[value="team:flow-b"]').count(),
        0,
      );
      assert.equal(
        await p.locator("dialog[open] textarea").first().inputValue(),
        "Entwurf des entfernten Teams",
      );
      await p
        .getByRole("button", { name: "Kriterien speichern", exact: true })
        .click();
      assert(
        (await p.locator("#flow-save-error").textContent()).includes(
          "inzwischen entfernt",
        ),
      );
      assert.equal(
        (await read(p)).v3.flowCriteria.profiles["flow-b"],
        undefined,
      );
    });
    await record("no-unhandled-page-errors", async () =>
      assert.deepEqual(errors, []),
    );
    fs.writeFileSync(
      path.join(out, "runtime.json"),
      JSON.stringify(
        {
          url,
          errors,
          browser: browser.version(),
          sourceSha256: require("node:crypto")
            .createHash("sha256")
            .update(
              fs.readFileSync(
                path.join(root, "dist/UTG-LE_Operating_Model_v3.16_RC3.html"),
              ),
            )
            .digest("hex"),
        },
        null,
        2,
      ),
    );
    console.log(
      JSON.stringify({
        checks: checks.length,
        passed: checks.filter((c) => c.ok).length,
        failed: checks.filter((c) => !c.ok).length,
      }),
    );
    if (checks.some((c) => !c.ok) || errors.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
