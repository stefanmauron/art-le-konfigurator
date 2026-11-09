export function initialize(app, browser = globalThis) {
  const window = browser;

  (() => {
    "use strict";
    const $ = (id) => document.getElementById(id),
      key = "gever-art-v3-config",
      stages = app.UTGFlow.states;
    const events = [
      [
        "Funnel",
        "Portfolio Board / POM Board",
        "Strategische Einordnung und Priorisierung",
      ],
      [
        "Analyzing",
        "PO Sync / Architecture Sync",
        "Anforderungen, Architektur und Abhängigkeiten klären",
      ],
      [
        "Backlog",
        "PI Planning",
        "Priorisiertes Backlog und LE-Lieferbeiträge abstimmen",
      ],
      [
        "Implementing",
        "ART Sync",
        "Blockaden und teamübergreifende Abhängigkeiten bearbeiten",
      ],
      [
        "Validating",
        "System Demo",
        "Integrierte Ergebnisse und Feedback überprüfen",
      ],
      [
        "Deploying & Releasing",
        "Release Readiness",
        "Freigaben und Betriebsbereitschaft anlassbezogen klären",
      ],
      [
        "Done",
        "Inspect & Adapt",
        "Flow-Probleme analysieren und Vereinbarungen verbessern",
      ],
    ];
    const esc = (s) =>
      String(s ?? "").replace(
        /[&<>"']/g,
        (c) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[c],
      );
    const get = () => {
      try {
        return JSON.parse(app.UTGStorage.rawGet(key) || "{}");
      } catch {
        return {};
      }
    };
    function save(d) {
      app.UTGStorage.rawSet(key, JSON.stringify(d));
      window.dispatchEvent(new Event("gever-v3-updated"));
    }
    function normalize(d) {
      d.policies ??= [];
      stages.forEach((name, i) => {
        let p = d.policies.find((x) => x.name === name);
        if (!p) {
          p = { name, exit: "", wip: "" };
          d.policies.splice(i, 0, p);
        }
        p.id ??= "FP-" + (i + 1);
        p.type ??= i === 6 ? "Abschluss" : "Übergang";
        p.scope ??= "ART";
        p.owner ??= "ART / zuständige Rollen";
        p.interface ??= "";
      });
      return d;
    }
    const model = $("operating-model"),
      content = $("model-content");
    if (!model || !content) return;
    const intro = document.createElement("div");
    intro.innerHTML =
      '<div class="utg33-tools"><button type="button" id="utg33compact" aria-pressed="true">Kompakt</button><button type="button" id="utg33extended" aria-pressed="false">Steuerungsansicht</button><span class="utg33-muted">Policies an Flow-Zuständen auswählen; gemeinsame Regeln und LE-Schnittstellen werden im Kontext angezeigt.</span></div><div id="utg33policybar" class="flow-scroll"></div><div id="utg33detail" class="utg33-detail utg33-hidden"></div><div id="utg33interfaces"></div><div id="utg33events" class="utg33-hidden"></div>';
    content.before(intro);
    let extended = false,
      selected = -1;
    const ruleDialog =
      app.UTGEdits?.createDialog?.() ?? document.createElement("dialog");
    ruleDialog.id = "utg-rule-details";
    ruleDialog.className = "app-drawer";
    ruleDialog.setAttribute("aria-labelledby", "utg-rule-title");
    ruleDialog.dataset.uiDrawer = "true";
    ruleDialog.classList.add("ui-drawer-layout");
    ruleDialog.innerHTML =
      '<div class="ui-drawer-header"><div class="rule-header-copy"><span class="rule-eyebrow">FLOW-REGEL</span><h2 id="utg-rule-title">Gemeinsame Flow-Regel</h2></div><button type="button" class="ui-drawer-close" aria-label="Drawer schliessen">×</button></div><div class="ui-drawer-body"></div>';
    ruleDialog.querySelector(".ui-drawer-body").append($("utg33detail"));
    ruleDialog.querySelector(".ui-drawer-close").onclick = () =>
      ruleDialog.close();
    const footer = document.createElement("div");
    footer.className = "ui-drawer-footer";
    footer.innerHTML =
      '<button type="button" id="utg33close">Schliessen</button>';
    ruleDialog.append(footer);
    footer.querySelector("button").onclick = () => ruleDialog.close();
    document.body.append(ruleDialog);
    let editingRule = false;
    function resetRule() {
      const index = selected;
      selected = -1;
      $("utg33detail").classList.add("utg33-hidden");
      $("utg33policybar")
        .querySelectorAll("[data-policy]")
        .forEach((button) => button.setAttribute("aria-expanded", "false"));
      $("utg33policybar")
        .querySelector('[data-policy="' + index + '"]')
        ?.focus();
    }
    ruleDialog.addEventListener("close", () => {
      if (!editingRule) resetRule();
    });
    app.UTGRuleDetails = {
      edit(open) {
        if (!ruleDialog.open) return open();
        const trigger = document.activeElement,
          action = trigger?.dataset.editFlow,
          triggerId = trigger?.id,
          scroll = ruleDialog.querySelector(".ui-drawer-body").scrollTop;
        let readerClosed = false,
          pendingRestore = false,
          restored = false;
        editingRule = true;
        const restore = () => {
          if (restored) return;
          if (!readerClosed) {
            pendingRestore = true;
            return;
          }
          restored = true;
          editingRule = false;
          if (selected >= 0) {
            detail();
            if (!ruleDialog.open) ruleDialog.showModal();
            queueMicrotask(() => {
              const target = action
                ? ruleDialog.querySelector('[data-edit-flow="' + action + '"]')
                : document.getElementById(triggerId) || $("rule-edit-art");
              target?.focus({ preventScroll: true });
              ruleDialog.querySelector(".ui-drawer-body").scrollTop = scroll;
            });
          }
        };
        const closed = () => {
          readerClosed = true;
          if (pendingRestore) restore();
        };
        ruleDialog.addEventListener("close", closed, { once: true });
        ruleDialog.close();
        if (ruleDialog.open) {
          ruleDialog.removeEventListener("close", closed);
          editingRule = false;
          return false;
        }
        const before = new Set(document.querySelectorAll("dialog[open]"));
        try {
          const result = open(),
            editor = [...document.querySelectorAll("dialog[open]")].find(
              (dialog) => dialog !== ruleDialog && !before.has(dialog),
            );
          if (editor) editor.addEventListener("close", restore, { once: true });
          else restore();
          return result;
        } catch (error) {
          restore();
          app.UTGFeedback?.failure(
            "Der Editor konnte nicht geöffnet werden: " + error.message,
          );
          return false;
        }
      },
    };

    function draw() {
      let d = normalize(get());
      const bar = $("utg33policybar");
      bar.innerHTML =
        '<div class="utg33-policybar">' +
        stages
          .map((name, i) => {
            let p = d.policies.find((x) => x.name === name);
            return (
              '<div class="utg33-slot"><span class="utg33-muted">' +
              "Flow-Regel" +
              " · " +
              esc(p.type) +
              "</span><strong>" +
              esc(name) +
              "</strong><span>" +
              esc(p.exit || "Kriterium noch offen") +
              '</span><div class="utg33-policy-actions"><button type="button" data-policy="' +
              i +
              '" aria-expanded="' +
              (selected === i) +
              '">Regel anzeigen</button></div></div>'
            );
          })
          .join("") +
        "</div>";
      bar.querySelectorAll("[data-policy]").forEach(
        (b) =>
          (b.onclick = () => {
            selected = +b.dataset.policy;
            bar
              .querySelectorAll("[data-policy]")
              .forEach((button) =>
                button.setAttribute("aria-expanded", String(button === b)),
              );
            detail();
            if (!ruleDialog.open) ruleDialog.showModal();
            ruleDialog
              .querySelector(".ui-drawer-close")
              .focus({ preventScroll: true });
          }),
      );
      const view = $("model-view")?.value || "reference",
        tid = view.startsWith("team:") ? view.slice(5) : null,
        teamData = (() => {
          try {
            return JSON.parse(
              app.UTGStorage.rawGet("gever-art-leistungsmatrix-v1") || "{}",
            );
          } catch {
            return {};
          }
        })();
      const team = teamData.teams?.find((t) => t.id === tid);
      let entries = [];
      if (tid) {
        let pid = $("v3product")?.value || d.product;
        entries = Object.entries(
          (d.configs?.[tid + "::flow"] || d.configs?.[tid + "::" + pid])
            ?.entries || {},
        )
          .map(([name, entry]) => [name, app.UTGModels.effective(d, entry)])
          .filter(
            ([_, e]) =>
              e &&
              (app.UTGModels.embeddingKind(
                d,
                app.UTGModels.effective(d, e).embedding,
              ) === "shared" ||
                (e.org &&
                  !["Noch zu klären", "Nicht erforderlich"].includes(e.org) &&
                  app.UTGModels.providerKind(d, e.org) !== "art")),
          )
          .map(([n, e]) => ({
            name: n,
            org: e.org,
            service:
              app.UTGModels.resolveService(d, e.service)?.name || e.service,
          }));
      }
      $("utg33interfaces").innerHTML = extended
        ? "<h3>LE-Schnittstellen und Übergaben</h3>" +
          (tid
            ? '<p class="utg33-muted">Team: ' +
              esc(team?.name || tid) +
              " · Produkt: " +
              esc(
                d.products?.find(
                  (p) => p.id === ($("v3product")?.value || d.product),
                )?.name || "aktuelle Auswahl",
              ) +
              "</p>" +
              (entries.length
                ? entries
                    .map(
                      (e) =>
                        '<div class="utg33-interface"><strong>' +
                        esc(e.name) +
                        "</strong> · " +
                        esc(e.org) +
                        " " +
                        (e.service
                          ? " · Leistungsbaustein: " + esc(e.service)
                          : "") +
                        '<div class="utg33-muted">Lieferobjekte, Übergabekriterien und zuständige Rollen anhand des LE-Katalogs und der Leistungsmatrix vereinbaren.</div></div>',
                    )
                    .join("")
                : '<div class="utg33-interface">Für diese Team-Sicht sind keine externen Leistungszuordnungen hinterlegt.</div>')
            : '<div class="utg33-interface">In der SAFe-Referenz gelten gemeinsame Regeln. Eine Team-Sicht auswählen, um die konkreten LE-Schnittstellen aus der Leistungsmatrix zu sehen.</div>')
        : "";
      $("utg33events").classList.toggle("utg33-hidden", !extended);
      $("utg33events").innerHTML =
        '<h3>SAFe-Events im Wertfluss</h3><p class="utg33-muted">Events unterstützen Koordination und Lernen. Sie sind keine zusätzlichen automatischen Freigabe-Gates.</p><div class="utg33-eventgrid">' +
        events
          .map(
            ([phase, title, description]) =>
              '<div class="utg33-event"><strong>' +
              esc(title) +
              "</strong><span>" +
              esc(phase) +
              "</span><p>" +
              esc(description) +
              "</p></div>",
          )
          .join("") +
        "</div>";
      if (selected >= 0) detail();
    }
    function detail() {
      const d = normalize(get()),
        p = d.policies.find((x) => x.name === stages[selected]),
        el = $("utg33detail");
      if (!p) return;
      $("utg-rule-title").textContent = p.name;
      el.classList.remove("utg33-hidden");
      const value = (text, fallback) =>
        String(text ?? "").trim()
          ? esc(text)
          : '<span class="rule-empty">' + fallback + "</span>";
      el.innerHTML =
        '<section class="rule-summary" aria-labelledby="rule-summary-title"><div class="rule-section-heading"><h3 id="rule-summary-title">ART-weiter Mindestvertrag</h3><span class="rule-type">' +
        esc(p.type) +
        '</span></div><p class="rule-section-hint">Gilt für alle Teams. Team-Regeln konkretisieren diesen Mindestvertrag; sie ersetzen ihn nicht.</p><div class="rule-agreement" id="utg33exit">' +
        value(p.exit, "Noch keine Vereinbarung erfasst.") +
        '</div><dl class="rule-facts"><div><dt>Verantwortliche Entscheidrolle</dt><dd>' +
        value(p.owner, "Noch zu klären") +
        "</dd></div><div><dt>WIP-Limit</dt><dd>" +
        value(p.wip, "Nicht festgelegt") +
        "</dd></div></dl>" +
        '<dl class="rule-facts rule-evidence"><div><dt>Beteiligte Rollen</dt><dd>' +
        value(p.contributors, "Noch zu klären") +
        "</dd></div><div><dt>Erwarteter Nachweis</dt><dd>" +
        value(p.evidence, "Noch zu klären") +
        "</dd></div></dl>" +
        (p.interface
          ? '<div class="rule-interface"><h4>LE-Übergabe / Schnittstelle</h4><p>' +
            value(p.interface, "Nicht festgelegt") +
            "</p></div>"
          : "") +
        (p.scope && p.scope !== "ART"
          ? '<p class="rule-legacy-scope">Hinterlegte Geltungsbeschreibung: ' +
            esc(p.scope) +
            ". Die Regel wird ART-weit gespeichert.</p>"
          : "") +
        '<button type="button" id="rule-edit-art">ART-weite Regel bearbeiten</button></section><div id="rule-criteria-slot"></div>';
      $("rule-edit-art").onclick = () =>
        app.UTGRuleDetails.edit(() => app.UTGPolicyEditor.open(p.name));
      app.UTGFlowStandardUI?.render(el, d);
    }
    function setMode(v) {
      extended = v;
      $("utg33compact").setAttribute("aria-pressed", String(!v));
      $("utg33extended").setAttribute("aria-pressed", String(v));
      draw();
    }
    $("utg33compact").onclick = () => setMode(false);
    $("utg33extended").onclick = () => setMode(true);
    $("model-view")?.addEventListener("change", () => draw());
    $("v3product")?.addEventListener("change", () => draw());
    app.addEventListener("gever-v3-updated", () => draw());
    app.addEventListener("storage", (event) => {
      if (
        event.key === null ||
        ["gever-art-v3-config", "gever-art-leistungsmatrix-v1"].includes(
          event.key,
        )
      )
        draw();
    });
    draw();
  })();
}
