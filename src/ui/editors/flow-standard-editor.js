export function initialize(app, browser = globalThis) {
  const window = browser;
  (() => {
    "use strict";
    const standard = app.UTGFlowStandard,
      api = app.UTGFlowCriteria,
      key = "gever-art-v3-config",
      clone = (x) => structuredClone(x);
    function comparisonValue(value, scope) {
      if (Array.isArray(value))
        return value.map((item) => comparisonValue(item, scope));
      if (value && typeof value === "object")
        return Object.fromEntries(
          Object.keys(value)
            .sort()
            .filter(
              (key) =>
                !(
                  (key === "contributors" ||
                    (scope === "policy" &&
                      ["interface", "wip"].includes(key))) &&
                  (value[key] === undefined || value[key] === "")
                ),
            )
            .map((key) => [
              key,
              scope === "policy" &&
              key === "wip" &&
              (typeof value[key] === "string" ||
                typeof value[key] === "number") &&
              Number.isSafeInteger(Number(value[key])) &&
              Number(value[key]) > 0
                ? String(Number(value[key]))
                : comparisonValue(value[key], scope),
            ]),
        );
      return value;
    }
    const same = (a, b, scope) =>
      JSON.stringify(comparisonValue(a, scope)) ===
      JSON.stringify(comparisonValue(b, scope));
    const governanceContent = (g) =>
      Object.fromEntries(
        standard.fields.map(([field]) => [
          field,
          typeof g?.[field] === "string" ? g[field].trim() : "",
        ]),
      );
    function plan(input, team = "") {
      const data = api.ensureTeam(clone(input), team),
        fresh = api.defaults(),
        rows = [];
      for (const p of standard.policies()) {
        const current = data.policies?.find((x) => x.name === p.name);
        rows.push({
          id: "policy:" + p.name,
          scope: "ART-weit · alle Teams",
          label: "Mindestvertrag · " + p.name,
          current: clone(current || null),
          next: {
            ...clone(current || {}),
            ...p,
            wip: current?.wip || "",
            interface: current?.interface || "",
          },
        });
      }
      for (const stage of app.UTGFlow.states)
        for (const type of ["Phase", "AC"]) {
          const current = api.typed(data, stage, team, type),
            next = api.typed({ flowCriteria: fresh }, stage, "", type);
          rows.push({
            id: type + ":" + stage,
            scope: team
              ? "Ausgewähltes Team"
              : "Standardvorlage für neue Teams",
            label:
              (type === "Phase" ? "Phasenregeln" : "Feature-AC-Vorlage") +
              " · " +
              stage,
            current,
            next,
          });
        }
      for (const type of ["DoR", "DoD"])
        rows.push({
          id: type,
          scope: team ? "Ausgewähltes Team" : "Standardvorlage für neue Teams",
          label: "Team-" + type,
          current: api.typed(data, "Funnel", team, type),
          next: api.typed({ flowCriteria: fresh }, "Funnel", "", type),
        });
      const g = data.flowGovernance;
      rows.push({
        id: "governance",
        scope: "ART-weit · alle Teams",
        label: "Übergreifende Flow-Steuerung und Qualitätsminima",
        current: g || null,
        next: {
          ...standard.governance(),
          wip: g?.wip || "",
          sle: g?.sle || "",
          decisionRole: g?.decisionRole || "",
          evidence: g?.evidence || "",
        },
      });
      return rows.filter(
        (row) =>
          !same(
            row.current,
            row.next,
            row.id.startsWith("policy:") ? "policy" : undefined,
          ),
      );
    }
    function apply(input, team, ids, knownTeams = []) {
      if (team && !knownTeams.includes(team))
        throw Error("Das ausgewählte Team besteht nicht mehr.");
      if (
        !Array.isArray(ids) ||
        !ids.length ||
        new Set(ids).size !== ids.length
      )
        throw Error("Mindestens eine unterschiedliche Änderung auswählen.");
      const rows = plan(input, team),
        map = new Map(rows.map((row) => [row.id, row]));
      if (ids.some((id) => !map.has(id)))
        throw Error(
          "Die Auswahl ist nicht mehr aktuell. Bitte Vergleich neu öffnen.",
        );
      let next = clone(input);
      api.ensureTeam(next, team);
      for (const id of ids) {
        const row = map.get(id);
        if (id.startsWith("policy:")) {
          next.policies ??= [];
          const index = next.policies.findIndex(
            (p) => p.name === row.next.name,
          );
          if (index < 0) next.policies.push(clone(row.next));
          else next.policies[index] = clone(row.next);
        } else if (id === "governance") next.flowGovernance = clone(row.next);
        else {
          const [type, stage = "Funnel"] = id.split(":");
          next = api.updateTyped(next, stage, team, type, clone(row.next));
        }
      }
      standard.validateGovernance(next.flowGovernance);
      api.validate(next.flowCriteria);
      return next;
    }
    app.UTGFlowStandardAdoption = Object.freeze({ plan, apply });
    const text = (tag, value, parent, className) => {
      const el = document.createElement(tag);
      el.textContent = value;
      if (className) el.className = className;
      parent.append(el);
      return el;
    };
    function commit(next) {
      const bundle = app.UTGStorage.bundle();
      bundle.v3 = next;
      app.UTGStorage.validateBundle(bundle);
      app.UTGStorage.write(key, next);
      window.dispatchEvent(new Event("gever-v3-updated"));
    }
    function drawer(titleText, intro) {
      const trigger = document.activeElement,
        dialog =
          app.UTGEdits?.createDialog?.() ?? document.createElement("dialog");
      dialog.className = "app-drawer";
      const form = document.createElement("form");
      text("h2", titleText, form);
      text("p", intro, form, "muted");
      const content = document.createElement("div");
      form.append(content);
      const error = text("p", "", form, "app-save-error");
      error.setAttribute("role", "alert");
      const actions = document.createElement("div");
      actions.className = "actions";
      const cancel = text("button", "Abbrechen", actions);
      cancel.type = "button";
      cancel.onclick = () => dialog.close();
      const save = text("button", "Speichern", actions);
      save.type = "submit";
      form.append(error, actions);
      dialog.append(form);
      document.body.append(dialog);
      dialog.addEventListener(
        "close",
        () => {
          dialog.remove();
          if (trigger?.isConnected) trigger.focus();
        },
        { once: true },
      );
      return { dialog, form, content, error, save };
    }
    function editGovernance() {
      const data = app.UTGStorage.read(key),
        original = JSON.stringify(data.flowGovernance),
        g = clone(data.flowGovernance || standard.governance());
      const ui = drawer(
        "Übergreifende Flow-Steuerung",
        "ART-weit für alle Teams. Die Vorlage ist ein Vorschlag. «Vereinbart» nur nach tatsächlicher Abstimmung mit Entscheidrolle und Nachweis setzen. Das Speichern bestätigt keine Kriterienerfüllung.",
      );
      const inputs = new Map();
      const statusLabel = document.createElement("label");
      statusLabel.textContent = "Vereinbarungsstand";
      const status = document.createElement("select");
      status.id = "flow-governance-status";
      for (const value of ["Vorschlag", "Vereinbart"]) {
        const o = text("option", value, status);
        o.value = value;
      }
      status.value = g.status;
      statusLabel.append(status);
      ui.content.append(statusLabel);
      for (const [field, label] of standard.fields) {
        const wrap = document.createElement("label");
        wrap.textContent = label;
        const input = document.createElement("textarea");
        input.rows = ["qualityMinimum", "pull", "blocked"].includes(field)
          ? 4
          : 3;
        input.value = g[field];
        input.dataset.governanceField = field;
        if (field === "wip")
          input.placeholder =
            "Konkrete Limits oder gemeinsame Begrenzung mit Geltungsbereich vereinbaren.";
        if (field === "sle")
          input.placeholder =
            "Aus beobachteten Durchlaufzeiten ableiten: Dauer, Wahrscheinlichkeit und Datengrundlage.";
        wrap.append(input);
        ui.content.append(wrap);
        inputs.set(field, input);
      }
      const renewal = document.createElement("label");
      renewal.className = "flow-agreement-renewal";
      renewal.hidden = true;
      const confirmation = document.createElement("input");
      confirmation.type = "checkbox";
      confirmation.id = "flow-governance-confirm";
      renewal.append(
        confirmation,
        document.createTextNode(
          "Die geänderte Vereinbarung ist mit der angegebenen Entscheidrolle und dem Nachweis erneut abgestimmt.",
        ),
      );
      ui.content.append(renewal);
      let manualStatus = false;
      const values = () =>
        Object.fromEntries(
          [...inputs].map(([field, input]) => [field, input.value.trim()]),
        );
      const changed = () => !same(governanceContent(g), values());
      function renewalState() {
        renewal.hidden = !(
          g.status === "Vereinbart" &&
          changed() &&
          status.value === "Vereinbart"
        );
      }
      for (const input of inputs.values())
        input.addEventListener("input", () => {
          if (g.status === "Vereinbart") {
            confirmation.checked = false;
            if (changed()) status.value = "Vorschlag";
            else if (!manualStatus) status.value = g.status;
          }
          renewalState();
        });
      status.addEventListener("change", () => {
        manualStatus = true;
        confirmation.checked = false;
        renewalState();
      });
      ui.form.onsubmit = (event) => {
        event.preventDefault();
        try {
          const next = app.UTGStorage.read(key);
          if (JSON.stringify(next.flowGovernance) !== original)
            throw Error(
              "Die Vereinbarung wurde inzwischen geändert. Bitte neu öffnen.",
            );
          if (
            g.status === "Vereinbart" &&
            changed() &&
            status.value === "Vereinbart" &&
            !confirmation.checked
          )
            throw Error(
              "Die geänderte Vereinbarung bitte ausdrücklich erneut bestätigen oder als Vorschlag speichern.",
            );
          next.flowGovernance = {
            version: 1,
            status: status.value,
            ...values(),
          };
          standard.validateGovernance(next.flowGovernance);
          commit(next);
          app.UTGEdits.closeSaved(ui.dialog);
        } catch (e) {
          ui.error.textContent = "Nicht gespeichert: " + e.message;
        }
      };
      ui.dialog.showModal();
      status.focus();
    }

    function readable(value) {
      if (value === null || value === undefined) return "Noch nicht vorhanden";
      if (Array.isArray(value))
        return value.length
          ? value
              .map((c) =>
                [
                  c.type + " · " + c.description,
                  "Verantwortlich: " + c.owner,
                  c.contributors ? "Beteiligt: " + c.contributors : "",
                  "Nachweis: " + c.evidence,
                ]
                  .filter(Boolean)
                  .join("\n"),
              )
              .join("\n\n")
          : "Keine Einträge";
      return Object.entries(value)
        .filter(([key]) => !["id", "standardRevision", "version"].includes(key))
        .map(
          ([key, value]) =>
            (({
              exit: "Vereinbarung",
              owner: "Entscheidrolle",
              contributors: "Beteiligte Rollen",
              evidence: "Nachweis",
              wip: "WIP",
              type: "Typ",
              scope: "Geltung",
              name: "Phase",
              status: "Stand",
              ...Object.fromEntries(standard.fields),
            })[key] || key) +
            ": " +
            (value || "Noch zu vereinbaren"),
        )
        .join("\n");
    }
    function compare() {
      if (app.UTGEdits && !app.UTGEdits.canNavigate()) return;
      const input = app.UTGStorage.read(key),
        original = JSON.stringify(input),
        teams = app.UTGStorage.snapshot().v2?.teams || [];
      const ui = drawer(
        "Flow-Standards vergleichen · {{release.label}}",
        "Nur ausgewählte Bereiche werden ersetzt. Eigene Einträge im ausgewählten Bereich werden dabei ersetzt oder entfernt; alle anderen Bereiche bleiben erhalten. ART-weite Änderungen betreffen immer alle Teams. Nichts ist vorausgewählt.",
      );
      ui.save.textContent = "Ausgewählte Standards übernehmen";
      const label = document.createElement("label");
      label.textContent = "Ziel für Phasenregeln, DoR, DoD und AC-Vorlagen";
      const select = document.createElement("select");
      select.id = "flow-standard-target";
      text("option", "Standardvorlage für neue Teams", select).value = "";
      for (const team of teams)
        text("option", team.name, select).value = team.id;
      const view = document.getElementById("model-view")?.value || "";
      select.value = view.startsWith("team:") ? view.slice(5) : "";
      label.append(select);
      ui.content.append(label);
      const list = document.createElement("div");
      list.id = "flow-standard-differences";
      ui.content.append(list);
      function render() {
        list.replaceChildren();
        ui.error.textContent = "";
        const rows = plan(input, select.value);
        ui.save.disabled = true;
        if (!rows.length)
          text(
            "p",
            "Für dieses Ziel bestehen keine Unterschiede zu den neuen Flow-Standards.",
            list,
          );
        for (const row of rows) {
          const section = document.createElement("section");
          section.className = "flow-standard-diff";
          const choose = document.createElement("label");
          choose.className = "flow-standard-choice";
          const checkbox = document.createElement("input");
          checkbox.type = "checkbox";
          checkbox.value = row.id;
          checkbox.dataset.standardChoice = row.id;
          checkbox.onchange = () =>
            (ui.save.disabled = !list.querySelector("input:checked"));
          choose.append(checkbox, document.createTextNode(row.label));
          section.append(choose);
          text("p", row.scope, section, "muted");
          const details = document.createElement("details");
          text("summary", "Aktuell und neuer Standard", details);
          text("h3", "Aktuell", details);
          text("pre", readable(row.current), details);
          text("h3", "Neuer Standard", details);
          text("pre", readable(row.next), details);
          section.append(details);
          list.append(section);
        }
      }
      select.onchange = render;
      render();
      ui.form.onsubmit = (event) => {
        event.preventDefault();
        try {
          const data = app.UTGStorage.read(key);
          if (JSON.stringify(data) !== original)
            throw Error(
              "Die Konfiguration wurde inzwischen geändert. Bitte Vergleich neu öffnen.",
            );
          const ids = [...list.querySelectorAll("input:checked")].map(
            (input) => input.value,
          );
          const next = apply(
            data,
            select.value,
            ids,
            (app.UTGStorage.snapshot().v2?.teams || []).map((t) => t.id),
          );
          commit(next);
          app.UTGEdits.closeSaved(ui.dialog);
        } catch (e) {
          ui.error.textContent = "Nicht übernommen: " + e.message;
        }
      };
      ui.dialog.showModal();
      select.focus();
    }
    function render(host, data) {
      host.querySelector(".flow-governance-summary")?.remove();
      const section = document.createElement("section");
      section.className = "flow-governance-summary";
      text("h3", "Übergreifende Flow-Steuerung", section);
      const g = data.flowGovernance;
      text(
        "p",
        g?.status === "Vereinbart"
          ? "Als gemeinsame Vereinbarung erfasst · ART-weit"
          : "Vorschlag · im ART noch zu vereinbaren",
        section,
        "rule-criteria-context",
      );
      text(
        "p",
        "Feature-Fluss, Pull, WIP, Blockaden und gemeinsame Qualitätsminima. Konkrete Feature-AC und Nachweise werden am Arbeitselement geführt. Die App dokumentiert Vereinbarungen; sie erzwingt keine Zustandswechsel.",
        section,
        "rule-section-hint",
      );
      const details = document.createElement("details");
      text("summary", "Vereinbarung und offene Punkte lesen", details);
      const dl = document.createElement("dl");
      for (const [field, label] of standard.fields) {
        text("dt", label, dl);
        text("dd", g?.[field] || "Noch zu vereinbaren", dl);
      }
      details.append(dl);
      section.append(details);
      const actions = document.createElement("div");
      actions.className = "flow-governance-actions";
      const edit = text("button", "Flow-Steuerung bearbeiten", actions);
      edit.id = "rule-edit-governance";
      edit.type = "button";
      edit.onclick = () => app.UTGRuleDetails.edit(editGovernance);
      const adopt = text("button", "Flow-Standards vergleichen", actions);
      adopt.id = "rule-compare-standards";
      adopt.type = "button";
      adopt.onclick = () => app.UTGRuleDetails.edit(compare);
      section.append(actions);
      host.append(section);
    }
    app.UTGFlowStandardUI = Object.freeze({ render, compare, editGovernance });
    const tools = document.querySelector(".utg33-tools");
    if (tools) {
      const button = text("button", "Flow-Standards vergleichen", tools);
      button.type = "button";
      button.onclick = compare;
    }
  })();
}
