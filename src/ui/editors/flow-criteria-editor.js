export function initialize(app, browser = globalThis) {
  const window = browser;

  (() => {
    "use strict";
    const api = app.UTGFlowCriteria,
      key = "gever-art-v3-config",
      host = document.getElementById("utg33detail");
    if (!host) return;
    const esc = (x) =>
      String(x ?? "").replace(
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
    const get = () => JSON.parse(app.UTGStorage.rawGet(key) || "{}");
    const team = () => {
      const v = document.getElementById("model-view").value;
      return v.startsWith("team:") ? v.slice(5) : "";
    };
    const stage = () => {
      const b = document.querySelector(
        '#utg33policybar button[aria-expanded="true"]',
      );
      return b ? app.UTGFlow.states[Number(b.dataset.policy)] : null;
    };
    function persist(data) {
      const bundle = app.UTGStorage.bundle();
      bundle.v3 = data;
      app.UTGStorage.validateBundle(bundle);
      app.UTGStorage.rawSet(key, JSON.stringify(data));
      window.dispatchEvent(new Event("gever-v3-updated"));
    }
    function render() {
      if (host.classList.contains("utg33-hidden")) return;
      const name = stage();
      if (!name || host.querySelector(".flow-criteria-panel")) return;
      const tid = team(),
        panel = document.createElement("section");
      panel.className = "flow-criteria-panel";
      const action = (type) =>
        '<button type="button" ' +
        "" +
        'data-edit-flow="' +
        type +
        '" aria-label="' +
        {
          Phase: "Phasenregeln",
          DoD: "Gemeinsame Ergebnisqualität: Definition of Done",
          DoR: "Gemeinsamer Umsetzungsstart: Definition of Ready",
          AC: "Vorlage für Feature-AC",
        }[type] +
        " bearbeiten · " +
        api.typed(get(), name, tid, type).length +
        ' hinterlegte Kriterien"><span>' +
        {
          Phase: "Phasenregeln",
          DoD: "DoD · Ergebnisqualität",
          DoR: "DoR · Umsetzungsstart",
          AC: "Vorlage für Feature-AC",
        }[type] +
        '</span><span class="flow-criteria-count" aria-hidden="true">' +
        api.typed(get(), name, tid, type).length +
        "</span></button>";
      const teamName = tid
        ? app.UTGStorage.snapshot().v2?.teams.find((t) => t.id === tid)?.name ||
          "Team"
        : "Standardvorlage für neue Teams";
      panel.innerHTML =
        '<div class="rule-section-heading"><h3>Kriterien bearbeiten</h3></div><p class="rule-criteria-context">' +
        esc(teamName) +
        '</p><p class="rule-section-hint">' +
        (tid
          ? "Änderungen gelten nur für dieses Team."
          : "Änderungen an der Vorlage gelten für neue Teams. Bestehende Team-Kriterien bleiben erhalten.") +
        '</p><div class="flow-criteria-group"><h4>Für diese Phase</h4><div class="utg33-tools" aria-label="Kriterien dieser Phase">' +
        action("Phase") +
        action("AC") +
        '</div></div><div class="flow-criteria-group flow-team-agreements"><h4>Über alle Phasen</h4><div class="utg33-tools" aria-label="Gemeinsame Team-Vereinbarungen">' +
        action("DoR") +
        action("DoD") +
        '</div><p class="rule-section-hint flow-catalog-context">' +
        esc(app.UTGFlowStandard.context(name, "DoR")) +
        " " +
        esc(app.UTGFlowStandard.context(name, "DoD")) +
        "</p></div>";
      (host.querySelector("#rule-criteria-slot") || host).append(panel);
      panel
        .querySelectorAll("[data-edit-flow]")
        .forEach(
          (button) =>
            (button.onclick = () =>
              app.UTGRuleDetails.edit(() =>
                edit(name, tid, button.dataset.editFlow, button),
              )),
        );
    }
    function edit(name, tid, type, trigger) {
      const data = api.ensureTeam(structuredClone(get()), tid),
        f = tid ? data.flowCriteria.profiles[tid] : data.flowCriteria;
      let items = api.typed(data, name, tid, type);
      const originalCriteria = JSON.stringify(items);
      const title = {
        Phase: "Phasenregeln",
        DoD: "DoD · Ergebnisqualität",
        DoR: "DoR · Umsetzungsstart",
        AC: "Vorlage für Feature-AC",
      }[type];
      const dialog =
        app.UTGEdits?.createDialog?.() ?? document.createElement("dialog");
      dialog.className = "app-drawer";
      dialog.innerHTML =
        "<form><h2>" +
        esc(title) +
        " · " +
        esc(
          (tid
            ? app.UTGStorage.snapshot().v2?.teams.find((t) => t.id === tid)
                ?.name || "Team"
            : "Standardvorlage für neue Teams") +
            (["Phase", "AC"].includes(type) ? " · " + name : ""),
        ) +
        '</h2><p class="muted">' +
        (tid
          ? "Änderungen gelten für das ausgewählte Team."
          : "Du bearbeitest die Standardvorlage für neue Teams.") +
        (type === "Phase"
          ? " Eintritt, Übergang bzw. Abschluss und Ausführungsregeln sind getrennt gekennzeichnet. Verantwortliche Entscheidrolle und beteiligte Rollen unterscheiden."
          : type === "DoD"
            ? " Gemeinsamer Katalog für alle Zustände dieses Teams bzw. dieser Vorlage. " +
              app.UTGFlowStandard.context(name, "DoD")
            : type === "DoR"
              ? " Gemeinsamer Katalog für alle Zustände dieses Teams bzw. dieser Vorlage. " +
                app.UTGFlowStandard.context(name, "DoR")
              : " Diese Leitlinien helfen beim Formulieren konkreter Feature-AC. Die tatsächlichen AC und Testergebnisse werden am Feature im Backlog-Werkzeug referenziert.") +
        '</p><div id="flow-criteria-fields"></div>' +
        '<button type="button" id="flow-add">Kriterium hinzufügen</button><p role="alert" id="flow-save-error" class="app-save-error"></p><div class="utg33-tools"><button type="button" id="flow-cancel">Abbrechen</button><button type="submit">Kriterien speichern</button></div></form>';
      document.body.append(dialog);
      const fields = dialog.querySelector("#flow-criteria-fields");
      function collect() {
        items = Array.from(
          fields.querySelectorAll(".flow-criteria-editor"),
        ).map((row) => ({
          id: row.dataset.id,
          ...(row.dataset.source ? { _source: row.dataset.source } : {}),
          ...Object.fromEntries(
            ["type", "description", "owner", "contributors", "evidence"].map(
              (k) => [k, row.querySelector('[data-field="' + k + '"]').value],
            ),
          ),
        }));
      }
      function draw() {
        fields.innerHTML = items
          .map(
            (c, i) =>
              '<section class="flow-criteria-editor" data-id="' +
              esc(c.id) +
              '" data-source="' +
              esc(c._source || "") +
              '">' +
              (type === "Phase"
                ? '<p class="flow-rule-kind">' +
                  esc(
                    ["Eintritt", "Übergang", "Abschluss"].includes(c.type)
                      ? c.type
                      : "Ausführung / Nachverfolgung",
                  ) +
                  "</p>"
                : "") +
              '<label for="fc-type-' +
              i +
              '">Kriterienart</label><select data-field="type" id="fc-type-' +
              i +
              '">' +
              (type === "Phase"
                ? api.types.filter((t) => !["AC", "DoR", "DoD"].includes(t))
                : [type]
              )
                .map(
                  (t) =>
                    "<option " +
                    (t === c.type ? "selected" : "") +
                    ">" +
                    esc(t) +
                    "</option>",
                )
                .join("") +
              "</select>" +
              [
                ["description", "Beschreibung"],
                [
                  "owner",
                  type === "Phase"
                    ? "Verantwortliche Entscheidrolle"
                    : "Verantwortliche Rolle",
                ],
                ["contributors", "Beteiligte Rollen"],
                ["evidence", "Erwarteter Nachweis / Referenz"],
              ]
                .map(
                  ([k, label]) =>
                    '<label for="fc-' +
                    k +
                    "-" +
                    i +
                    '">' +
                    label +
                    "</label><" +
                    (k === "description" ? "textarea" : "input") +
                    ' data-field="' +
                    k +
                    '" id="fc-' +
                    k +
                    "-" +
                    i +
                    '" ' +
                    (k === "description"
                      ? "required>" + esc(c[k] || "") + "</textarea>"
                      : 'value="' + esc(c[k] || "") + '">'),
                )
                .join("") +
              '<button type="button" data-remove="' +
              i +
              '">Kriterium löschen</button></section>',
          )
          .join("");
        fields.querySelectorAll('[data-field="type"]').forEach(
          (input) =>
            (input.onchange = () => {
              const heading = input
                .closest(".flow-criteria-editor")
                .querySelector(".flow-rule-kind");
              if (heading)
                heading.textContent = [
                  "Eintritt",
                  "Übergang",
                  "Abschluss",
                ].includes(input.value)
                  ? input.value
                  : "Ausführung / Nachverfolgung";
            }),
        );
        fields.querySelectorAll("[data-remove]").forEach(
          (b) =>
            (b.onclick = () => {
              collect();
              items.splice(Number(b.dataset.remove), 1);
              draw();
            }),
        );
      }
      draw();
      dialog.querySelector("#flow-add").onclick = () => {
        collect();
        items.push({
          id:
            "criterion-" +
            Date.now() +
            "-" +
            Math.random().toString(36).slice(2),
          type: type === "Phase" ? "Eintritt" : type,
          description: "",
          owner: "",
          contributors: "",
          evidence: "",
        });
        draw();
        fields.lastElementChild.querySelector("textarea").focus();
      };
      dialog.querySelector("#flow-cancel").onclick = () => dialog.close();
      dialog.querySelector("form").onsubmit = (event) => {
        event.preventDefault();
        collect();
        try {
          if (
            tid &&
            !app.UTGStorage.snapshot().v2?.teams.some((t) => t.id === tid)
          )
            throw Error("Dieses Team wurde inzwischen entfernt.");
          const latest = get();
          if (
            JSON.stringify(api.typed(latest, name, tid, type)) !==
            originalCriteria
          )
            throw Error(
              "Diese Kriterien wurden inzwischen geändert. Bitte neu öffnen.",
            );
          persist(api.updateTyped(latest, name, tid, type, items));
          app.UTGEdits.closeSaved(dialog);
          host.querySelector(".flow-criteria-panel")?.remove();
          render();
          host.querySelector('[data-edit-flow="' + type + '"]')?.focus();
        } catch (error) {
          dialog.querySelector("#flow-save-error").textContent =
            "Speichern fehlgeschlagen: " + error.message;
        }
      };
      dialog.addEventListener("close", () => {
        dialog.remove();
        if (trigger?.isConnected) trigger.focus();
      });
      (
        dialog.querySelector("textarea") || dialog.querySelector("#flow-add")
      ).autofocus = true;
      dialog.showModal();
    }
    app.UTGFlowCriteriaUI = Object.freeze({
      open(stage, team, type) {
        app.UTGRuleDetails.edit(() =>
          edit(
            stage,
            team,
            type,
            host.querySelector('[data-edit-flow="' + type + '"]'),
          ),
        );
      },
    });
    new MutationObserver(render).observe(host, { childList: true });
    document.getElementById("model-view").addEventListener("change", () => {
      host.querySelector(".flow-criteria-panel")?.remove();
      render();
    });
    try {
      const d = get(),
        before = JSON.stringify(d);
      api.initialize(d);
      for (const t of app.UTGStorage.snapshot().v2?.teams || [])
        api.ensureTeam(d, t.id);
      if (JSON.stringify(d) !== before) persist(d);
    } catch (error) {
      console.warn("Flow-Kriterien konnten nicht initialisiert werden", error);
    }
    render();
  })();
}
