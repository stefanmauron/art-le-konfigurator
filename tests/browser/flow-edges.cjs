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
    path.join(root, ".test-output/browser-flow-edges");
fs.mkdirSync(out, { recursive: true });
const url =
    (process.env.BASE_URL || "http://127.0.0.1:8773") +
    "/" +
    encodeURI(
      "dist/UTG-LE_Operating_Model_v3.16_RC3.html",
    ),
  checks = [],
  errors = [];
(async () => {
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    async function test(id, name, fn) {
      const ctx = await browser.newContext({
          viewport: { width: 1440, height: 1000 },
        }),
        p = await ctx.newPage();
      p.setDefaultTimeout(15000);
      p.on("pageerror", (e) => errors.push({ id, message: e.message }));
      p.on("dialog", (d) => d.accept());
      try {
        await p.goto(url);
        await p.locator("#utg-nav button").nth(3).click();
        await fn(p);
        checks.push({ id, name, ok: true });
        console.log("PASS " + id);
      } catch (e) {
        checks.push({ id, name, ok: false, error: e.message });
        console.log("FAIL " + id + " " + e.message);
        await p
          .screenshot({ path: path.join(out, id + ".png") })
          .catch(() => {});
      } finally {
        await ctx.close();
        fs.writeFileSync(
          path.join(out, "checks.json"),
          JSON.stringify(checks, null, 2) + "\n",
        );
      }
    }
    const read = (p) =>
      p.evaluate(() => window.UTGStorage.read("gever-art-v3-config"));
    await test(
      "fresh-compare",
      "fresh current standard must show no adoption changes",
      async (p) => {
        await p
          .getByRole("button", {
            name: "Flow-Standards vergleichen",
            exact: true,
          })
          .click();
        assert.equal(await p.locator(".flow-standard-diff").count(), 0);
      },
    );
    await test(
      "cancel-dirty",
      "Escape dismissal retains unsaved criteria until discard is accepted",
      async (p) => {
        await p.locator('[data-policy="2"]').click();
        await p.locator('[data-edit-flow="DoR"]').click();
        const before = await read(p);
        await p
          .locator("dialog[open] textarea")
          .first()
          .fill("Nicht gespeicherter Entwurf");
        p.removeAllListeners("dialog");
        p.once("dialog", (d) => d.dismiss());
        await p.keyboard.press("Escape");
        assert.equal(
          await p.locator("dialog[open] textarea").first().inputValue(),
          "Nicht gespeicherter Entwurf",
        );
        assert.deepEqual(await read(p), before);
        p.once("dialog", (d) => d.accept());
        await p.keyboard.press("Escape");
        await p.locator("#utg-rule-details[open]").waitFor();
        assert.deepEqual(await read(p), before);
      },
    );
    await test(
      "stale-criteria",
      "concurrent criteria edit is rejected and draft retained",
      async (p) => {
        await p.locator('[data-policy="2"]').click();
        await p.locator('[data-edit-flow="DoR"]').click();
        await p
          .locator("dialog[open] textarea")
          .first()
          .fill("Eigener Entwurf");
        await p.evaluate(() => {
          const d = window.UTGStorage.read("gever-art-v3-config");
          d.flowCriteria.commonDoR[0].description = "Extern geändert";
          window.UTGStorage.write("gever-art-v3-config", d);
        });
        await p
          .getByRole("button", { name: "Kriterien speichern", exact: true })
          .click();
        assert(
          (await p.locator("#flow-save-error").textContent()).includes(
            "inzwischen geändert",
          ),
        );
        assert.equal(
          await p.locator("dialog[open] textarea").first().inputValue(),
          "Eigener Entwurf",
        );
        assert.equal(
          (await read(p)).flowCriteria.commonDoR[0].description,
          "Extern geändert",
        );
      },
    );
    await test(
      "criterion-type",
      "entry moved to execution and back must restore entry gate",
      async (p) => {
        await p.locator('[data-policy="3"]').click();
        await p.locator('[data-edit-flow="Phase"]').click();
        await p
          .locator('[data-id="entry-3"] select')
          .selectOption("Flow-Steuerung");
        await p
          .getByRole("button", { name: "Kriterien speichern", exact: true })
          .click();
        await p.locator("#utg-rule-details[open]").waitFor();
        await p.locator('[data-edit-flow="Phase"]').click();
        await p.locator('[data-id="entry-3"] select').selectOption("Eintritt");
        await p
          .getByRole("button", { name: "Kriterien speichern", exact: true })
          .click();
        await p.locator("#utg-rule-details[open]").waitFor();
        assert(
          (await read(p)).flowCriteria.phaseGates.Implementing.some(
            (c) => c.id === "entry-3" && c.type === "Eintritt",
          ),
          "Visible Eintritt remains in rules rather than phaseGates",
        );
      },
    );
    await test(
      "agreement-status",
      "changed agreement must require renewed explicit agreement",
      async (p) => {
        await p.evaluate(() => {
          const d = window.UTGStorage.read("gever-art-v3-config"),
            g = d.flowGovernance;
          for (const [k] of window.UTGFlowStandard.fields)
            g[k] ||= "Explizit im Test vereinbart";
          g.status = "Vereinbart";
          window.UTGStorage.write("gever-art-v3-config", d);
        });
        await p.locator('[data-policy="0"]').click();
        await p.locator("#rule-edit-governance").click();
        await p
          .locator('[data-governance-field="wip"]')
          .fill("Neue, noch nicht abgestimmte WIP-Regel");
        await p.getByRole("button", { name: "Speichern", exact: true }).click();
        await p.locator("#utg-rule-details[open]").waitFor();
        assert.equal((await read(p)).flowGovernance.status, "Vorschlag");
      },
    );
    await test(
      "escaped-policy",
      "HTML in stored policy is rendered as text",
      async (p) => {
        await p.evaluate(() => {
          const d = window.UTGStorage.read("gever-art-v3-config");
          d.policies[0].exit =
            '<img src=x onerror="window.__auditXss=true"> & «Unicode»';
          window.UTGStorage.write("gever-art-v3-config", d);
          window.dispatchEvent(new Event("gever-v3-updated"));
        });
        await p.locator('[data-policy="0"]').click();
        assert((await p.locator("#utg33exit").textContent()).includes("<img"));
        assert.equal(await p.locator("#utg33exit img").count(), 0);
        assert.equal(await p.evaluate(() => window.__auditXss), undefined);
      },
    );
    await test(
      "narrow-long-text",
      "long rules and evidence do not overflow at 320px",
      async (p) => {
        await p.evaluate(() => {
          const d = window.UTGStorage.read("gever-art-v3-config");
          d.policies[0].exit = "Überprüfung".repeat(150);
          d.policies[0].evidence = "https://example.invalid/" + "a".repeat(400);
          window.UTGStorage.write("gever-art-v3-config", d);
          window.dispatchEvent(new Event("gever-v3-updated"));
        });
        await p.setViewportSize({ width: 320, height: 720 });
        await p.locator('[data-policy="0"]').click();
        assert.equal(
          await p
            .locator("#utg-rule-details")
            .evaluate((e) => e.scrollWidth <= e.clientWidth + 1),
          true,
        );
        const footer = await p.locator("#utg33close").boundingBox();
        assert(footer.y + footer.height <= 720 && footer.y >= 0);
      },
    );
    await test(
      "governance-draft",
      "incomplete draft can save but cannot be marked agreed",
      async (p) => {
        await p.locator('[data-policy="0"]').click();
        await p.locator("#rule-edit-governance").click();
        await p.locator('[data-governance-field="wip"]').fill("");
        await p.locator("#flow-governance-status").selectOption("Vereinbart");
        await p.getByRole("button", { name: "Speichern", exact: true }).click();
        assert(
          (
            await p.locator("dialog[open] .app-save-error").textContent()
          ).includes("fehlen Angaben"),
        );
        await p.locator("#flow-governance-status").selectOption("Vorschlag");
        await p.getByRole("button", { name: "Speichern", exact: true }).click();
        await p.locator("#utg-rule-details[open]").waitFor();
        assert.equal((await read(p)).flowGovernance.status, "Vorschlag");
      },
    );

    async function agreed(p) {
      await p.evaluate(() => {
        const d = window.UTGStorage.read("gever-art-v3-config");
        for (const [field] of window.UTGFlowStandard.fields)
          d.flowGovernance[field] ||= "Im Test vereinbart";
        d.flowGovernance.status = "Vereinbart";
        window.UTGStorage.write("gever-art-v3-config", d);
      });
      await p.locator('[data-policy="0"]').click();
      await p.locator("#rule-edit-governance").click();
    }
    await test(
      "agreement-noop",
      "unchanged agreement retains its agreed state",
      async (p) => {
        await agreed(p);
        const before = await read(p);
        await p.getByRole("button", { name: "Speichern", exact: true }).click();
        await p.locator("#utg-rule-details[open]").waitFor();
        assert.deepEqual((await read(p)).flowGovernance, before.flowGovernance);
      },
    );
    await test(
      "agreement-renewal",
      "changed agreement requires explicit renewal before agreed save",
      async (p) => {
        await agreed(p);
        const before = await read(p);
        await p
          .locator('[data-governance-field="wip"]')
          .fill("Neu abgestimmtes Limit");
        assert.equal(
          await p.locator("#flow-governance-status").inputValue(),
          "Vorschlag",
        );
        await p.locator("#flow-governance-status").selectOption("Vereinbart");
        await p.getByRole("button", { name: "Speichern", exact: true }).click();
        assert(
          (
            await p.locator("dialog[open] .app-save-error").textContent()
          ).includes("erneut bestätigen"),
        );
        assert.deepEqual((await read(p)).flowGovernance, before.flowGovernance);
        await p.locator("#flow-governance-confirm").check();
        await p.getByRole("button", { name: "Speichern", exact: true }).click();
        await p.locator("#utg-rule-details[open]").waitFor();
        assert.equal((await read(p)).flowGovernance.status, "Vereinbart");
        assert.equal(
          (await read(p)).flowGovernance.wip,
          "Neu abgestimmtes Limit",
        );
      },
    );
    await test(
      "agreement-storage-failure",
      "failed draft save preserves old agreed data and can retry",
      async (p) => {
        await agreed(p);
        const before = await read(p);
        await p.locator('[data-governance-field="wip"]').fill("Neuer Entwurf");
        await p.evaluate(() => {
          window.__savedSetItem = Storage.prototype.setItem;
          Storage.prototype.setItem = function (key, value) {
            if (
              key ===
              (window.UTGApplication
                ? "utg-le-v317:gever-art-v3-config"
                : "gever-art-v3-config")
            )
              throw Error("Testquota");
            return window.__savedSetItem.call(this, key, value);
          };
        });
        await p.getByRole("button", { name: "Speichern", exact: true }).click();
        assert(
          (
            await p.locator("dialog[open] .app-save-error").textContent()
          ).includes("Testquota"),
        );
        assert.deepEqual((await read(p)).flowGovernance, before.flowGovernance);
        await p.evaluate(
          () => (Storage.prototype.setItem = window.__savedSetItem),
        );
        await p.getByRole("button", { name: "Speichern", exact: true }).click();
        await p.locator("#utg-rule-details[open]").waitFor();
        assert.equal((await read(p)).flowGovernance.status, "Vorschlag");
      },
    );
    await test(
      "wip-file-import",
      "invalid WIP file is rejected unchanged and positive numeric legacy value imports",
      async (p) => {
        const before = await read(p);
        const bad = await p.evaluate(() => window.UTGStorage.bundle());
        bad.v3.policies[0].wip = { bad: true };
        const file = path.join(out, "wip-import.json");
        fs.writeFileSync(file, JSON.stringify(bad));
        const alert = p.waitForEvent("dialog");
        await p.locator("#import").setInputFiles(file);
        assert((await alert).message().includes("WIP"));
        assert.deepEqual(await read(p), before);
        bad.v3.policies[0].wip = 2;
        fs.writeFileSync(file, JSON.stringify(bad));
        await p.locator("#import").setInputFiles(file);
        await p
          .getByRole("button", {
            name: "Konfiguration importieren",
            exact: true,
          })
          .click();
        await p.waitForLoadState("load");
        await p.waitForFunction(() => !!window.UTGFlowStandardUI);
        assert.equal((await read(p)).policies[0].wip, 2);
      },
    );
    await test(
      "wip-editor",
      "policy editor rejects unsafe WIP and retains draft before valid retry",
      async (p) => {
        await p.locator('[data-policy="0"]').click();
        await p.locator("#rule-edit-art").click();
        await p
          .getByLabel("WIP-Limit (optional)", { exact: true })
          .fill("9007199254740992");
        await p
          .getByRole("button", {
            name: "ART-weite Regel speichern",
            exact: true,
          })
          .click();
        assert(
          (
            await p.locator("dialog[open] .app-save-error").textContent()
          ).includes("WIP"),
        );
        assert.equal((await read(p)).policies[0].wip, "");
        await p.getByLabel("WIP-Limit (optional)", { exact: true }).fill("2");
        await p
          .getByRole("button", {
            name: "ART-weite Regel speichern",
            exact: true,
          })
          .click();
        await p.locator("#utg-rule-details[open]").waitFor();
        assert.equal((await read(p)).policies[0].wip, "2");
      },
    );
    await test(
      "invalid-existing-wip",
      "invalid existing WIP is preserved on reload and can be repaired explicitly",
      async (p) => {
        await p.evaluate(() => {
          const d = window.UTGStorage.read("gever-art-v3-config");
          d.policies[0].wip = { legacyInvalid: true };
          window.UTGStorage.write("gever-art-v3-config", d);
        });
        await p.reload();
        await p.waitForFunction(() => !!window.UTGFlowStandardUI);
        assert.deepEqual((await read(p)).policies[0].wip, {
          legacyInvalid: true,
        });
        assert.equal(
          await p.evaluate(() => window.UTGFiles.save(true)),
          "failed",
        );
        await p.locator("#utg-nav button").nth(3).click();
        await p.locator('[data-policy="0"]').click();
        await p.locator("#rule-edit-art").click();
        await p.getByLabel("WIP-Limit (optional)", { exact: true }).fill("2");
        await p
          .getByRole("button", {
            name: "ART-weite Regel speichern",
            exact: true,
          })
          .click();
        await p.locator("#utg-rule-details[open]").waitFor();
        assert.equal((await read(p)).policies[0].wip, "2");
      },
    );
    await test(
      "agreement-explicit-draft",
      "explicit demotion cannot be silently promoted by a harmless field edit",
      async (p) => {
        await agreed(p);
        const before = await read(p);
        await p.locator("#flow-governance-status").selectOption("Vorschlag");
        await p
          .locator('[data-governance-field="workItem"]')
          .fill(before.flowGovernance.workItem + " ");
        assert.equal(
          await p.locator("#flow-governance-status").inputValue(),
          "Vorschlag",
        );
        await p.getByRole("button", { name: "Speichern", exact: true }).click();
        await p.locator("#utg-rule-details[open]").waitFor();
        assert.equal((await read(p)).flowGovernance.status, "Vorschlag");
      },
    );
    console.log(
      JSON.stringify({
        checks: checks.length,
        passed: checks.filter((c) => c.ok).length,
        failed: checks.filter((c) => !c.ok).length,
        pageErrors: errors,
      }),
    );
    fs.writeFileSync(
      path.join(out, "runtime.json"),
      JSON.stringify({ url, errors }, null, 2),
    );
    if (checks.some((c) => !c.ok) || errors.length) process.exitCode = 1;
  } finally {
    await browser.close();
  }
})().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
