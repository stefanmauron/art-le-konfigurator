export function initialize(app, browser = globalThis) {
  const window = browser;

  (() => {
    "use strict";
    const KEY = "gever-art-v3-config",
      TEAM = "gever-art-leistungsmatrix-v1";
    const page = document.getElementById("utg-page-2"),
      overview = document.getElementById("v3overview");
    if (!page || !overview) return;
    const read = (k) => {
      try {
        return JSON.parse(app.UTGStorage.rawGet(k) || "{}");
      } catch {
        return {};
      }
    };
    const valid = (v) =>
      !!String(v || "").trim() &&
      !/^(Noch zu klären|Noch zu vereinbaren|Nicht definiert)$/i.test(
        String(v).trim(),
      );
    const root = document.createElement("section");
    root.className = "panel";
    root.id = "utg-responsibilities";
    root.innerHTML =
      '<h2>Verantwortungs- und Entscheidungsmodell je Team</h2><p class="hint">Ausführung einer Tätigkeit, Ergebnisverantwortung und Entscheidungsrecht sind getrennt. Die Vereinbarung gilt für den gemeinsamen Team-Flow; sie ersetzt nicht die fachliche und technische Zuständigkeit in der Leistungsmatrix.</p><label for="utg-contract-team">Team auswählen</label> <select id="utg-contract-team"></select><div id="utg-contract-form" class="utg-contract-form"></div><p class="hint" id="utg-contract-status"></p>';
    page.append(root);
    const report = document.createElement("section");
    report.className = "panel";
    report.id = "utg-contract-report";
    report.innerHTML =
      '<h2>Ergebnisverantwortung und Entscheidungsrechte</h2><p class="hint">Teambezogene Verantwortlichkeiten werden unabhängig von LE-Services geprüft. «Angaben erfasst» bestätigt nur vollständige Eingaben; fehlende Angaben sind Klärungsbedarf, keine automatischen Freigabegates.</p><div class="v3scroll"><table><thead><tr><th>Team</th><th>Fachliches Ergebnis</th><th>Technische Qualität</th><th>Betrieb</th><th>Releaseentscheid</th><th>Eskalation</th><th>Angabenstand</th><th>Aktionen</th></tr></thead><tbody id="utg-contract-rows"></tbody></table></div>';
    overview.append(report);
    const fields = [
      [
        "business",
        "Fachliche Ergebnisverantwortung",
        "z. B. Product Management / Product Owner",
      ],
      [
        "technical",
        "Technische Ergebnisverantwortung",
        "z. B. verantwortliches ART-Team",
      ],
      ["operations", "Betriebsverantwortung", "z. B. ISCeco / BIT"],
      [
        "release",
        "Release-Entscheidungsrecht",
        "z. B. definierte Produkt-/Betriebsrolle",
      ],
      [
        "escalation",
        "Eskalation bei LE-Blockaden",
        "z. B. ART Sync / Serviceverantwortliche",
      ],
    ];
    const selector = document.getElementById("utg-contract-team"),
      form = document.getElementById("utg-contract-form");
    function teams() {
      return read(TEAM).teams || [];
    }
    function draw() {
      const d = read(KEY),
        ts = teams(),
        selected = selector.value;
      selector.replaceChildren();
      for (const t of ts) {
        const opt = document.createElement("option");
        opt.value = t.id;
        opt.textContent = t.name || t.id;
        selector.append(opt);
      }
      if (ts.some((t) => t.id === selected)) selector.value = selected;
      form.replaceChildren();
      const id = selector.value;
      const status = document.getElementById("utg-contract-status");
      if (!id) {
        status.textContent = "Noch kein Team vorhanden.";
        return;
      }
      const contract = d.teamContracts?.[id] || {},
        list = document.createElement("dl");
      for (const [key, label] of fields) {
        const term = document.createElement("dt"),
          value = document.createElement("dd");
        term.textContent = label;
        value.textContent = contract[key] || "Offen";
        list.append(term, value);
      }
      const edit = document.createElement("button");
      edit.type = "button";
      edit.textContent = "Team-Vereinbarung bearbeiten";
      edit.onclick = () => editContract(id);
      form.append(list, edit);
      status.textContent = "Bearbeitung im Drawer · Speichern oder Abbrechen.";
      reportRender();
    }
    function reportRender() {
      const d = read(KEY),
        ts = teams(),
        body = document.getElementById("utg-contract-rows");
      body.replaceChildren();
      for (const t of ts) {
        const c = d.teamContracts?.[t.id] || {},
          tr = document.createElement("tr");
        for (const value of [t.name, ...fields.map(([k]) => c[k] || "Offen")]) {
          const td = document.createElement("td");
          td.textContent = value;
          if (value === "Offen") td.classList.add("app-open-value");
          tr.append(td);
        }
        const status = document.createElement("td");
        const missing = fields
          .filter(([key]) => !valid(c[key]))
          .map(([, label]) => label + " offen");
        const note = document.createElement("p");
        note.className = missing.length ? "app-open-value" : "utg-ok";
        note.textContent = missing.length
          ? fields.length -
            missing.length +
            " / " +
            fields.length +
            " Angaben erfasst"
          : "Alle Angaben erfasst";
        note.title = missing.join(" · ");
        const edit = document.createElement("button");
        edit.type = "button";
        edit.textContent = "Bearbeiten";
        edit.setAttribute(
          "aria-label",
          "Verantwortung für " + t.name + " bearbeiten",
        );
        edit.dataset.contractTeam = t.id;
        edit.onclick = () => editContract(t.id);
        status.append(note);
        const actions = document.createElement("td");
        actions.className = "utg-overview-actions";
        actions.append(edit);
        tr.append(status, actions);
        body.append(tr);
      }
      if (!ts.length) {
        const tr = document.createElement("tr"),
          td = document.createElement("td");
        td.colSpan = 8;
        td.textContent = "Noch keine Teams erfasst.";
        tr.append(td);
        body.append(tr);
      }
    }
    function editContract(teamId, trigger = document.activeElement) {
      app.UTGFlowUX?.setTeam(teamId);
      const team = teams().find((t) => t.id === teamId);
      if (!team) return;
      const current = read(KEY).teamContracts?.[teamId] || {},
        original = JSON.stringify(current),
        drawer =
          app.UTGEdits?.createDialog?.() ?? document.createElement("dialog");
      drawer.className = "app-drawer";
      drawer.setAttribute("aria-labelledby", "utg-contract-drawer-title");
      const editor = document.createElement("form"),
        title = document.createElement("h2");
      title.id = "utg-contract-drawer-title";
      title.textContent = "Team-Vereinbarung · " + team.name;
      editor.append(title);
      const inputs = [];
      for (const [key, label, placeholder] of fields) {
        const wrap = document.createElement("label"),
          input = document.createElement("input");
        wrap.textContent = label;
        input.value = current[key] || "";
        input.placeholder = placeholder;
        input.dataset.field = key;
        wrap.append(input);
        editor.append(wrap);
        inputs.push({ key, input });
      }
      const error = document.createElement("p");
      error.className = "app-save-error";
      error.setAttribute("role", "alert");
      const actions = document.createElement("div");
      actions.className = "actions";
      const cancel = document.createElement("button");
      cancel.type = "button";
      cancel.textContent = "Abbrechen";
      cancel.onclick = () => drawer.close();
      const accept = document.createElement("button");
      accept.type = "submit";
      accept.textContent = "Vereinbarung speichern";
      accept.className = "primary";
      actions.append(cancel, accept);
      editor.append(error, actions);
      editor.onsubmit = (event) => {
        event.preventDefault();
        try {
          if (!teams().some((t) => t.id === teamId))
            throw Error("Dieses Team wurde inzwischen entfernt.");
          const data = read(KEY);
          if (JSON.stringify(data.teamContracts?.[teamId] || {}) !== original)
            throw Error(
              "Die Vereinbarung wurde inzwischen geändert. Bitte neu öffnen.",
            );
          data.teamContracts ??= {};
          data.teamContracts[teamId] = {
            ...current,
            ...Object.fromEntries(
              inputs.map(({ key, input }) => [key, input.value.trim()]),
            ),
          };
          app.UTGStorage.write(KEY, data);
          window.dispatchEvent(new Event("gever-v3-updated"));
          app.UTGEdits.closeSaved(drawer);
          draw();
        } catch (e) {
          error.textContent = "Nicht gespeichert: " + e.message;
        }
      };
      drawer.append(editor);
      document.body.append(drawer);
      drawer.addEventListener(
        "close",
        () => {
          drawer.remove();
          if (trigger?.isConnected) trigger.focus();
          else
            [
              ...document.querySelectorAll(
                "#utg-contract-report button[data-contract-team]",
              ),
            ]
              .find((b) => b.dataset.contractTeam === teamId)
              ?.focus();
        },
        { once: true },
      );
      drawer.showModal();
      inputs[0]?.input.focus();
    }
    selector.addEventListener("change", draw);
    app.addEventListener("gever-v3-updated", reportRender);
    app.addEventListener("storage", () => {
      draw();
    });
    document.querySelectorAll("#utg-nav button").forEach((b) =>
      b.addEventListener("click", () => {
        if (
          !selector.options.length ||
          selector.options.length !== teams().length
        )
          draw();
        else reportRender();
      }),
    );
    draw();
  })();
}
