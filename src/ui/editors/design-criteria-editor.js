export function initialize(app, browser = globalThis) {
  const window = browser;
  (() => {
    "use strict";
    const api = app.UTGDesignCriteria,
      key = "gever-art-v3-config",
      page = document.getElementById("utg-page-2");
    if (!page) return;
    const teams = () =>
        app.UTGStorage.read("gever-art-leistungsmatrix-v1")?.teams || [],
      read = () => api.ensureTeams(app.UTGStorage.read(key) || {}, teams());
    function save(next) {
      next.updated = new Date().toISOString();
      app.UTGStorage.write(key, next);
      window.dispatchEvent(new Event("gever-v3-updated"));
    }
    // Persist the one-time copies, including any previous assessments. Empty team lists stay empty.
    const initial = app.UTGStorage.read(key);
    if (initial) {
      const migrated = api.ensureTeams(structuredClone(initial), teams());
      if (JSON.stringify(migrated) !== JSON.stringify(initial)) {
        try {
          save(migrated);
        } catch (error) {
          console.warn(
            "Team-Design-Kriterien konnten nicht initialisiert werden",
            error,
          );
        }
      }
    }
    const panel = document.createElement("section");
    panel.id = "utg-design-criteria";
    panel.className = "panel";
    panel.innerHTML =
      '<h2>Design-Kriterien je Team</h2><p class="hint">Lege je Team fest, welche Design-Kriterien gelten und was sie konkret bedeuten. Die Beurteilung erfolgt in Reiter 5 «ART-Gesamtsicht».</p><div class="v3bar"><label for="utg-design-team">Team<select id="utg-design-team"></select></label><button type="button" id="utg-design-add">+ Design-Kriterium erstellen</button></div><p class="hint" id="utg-design-summary" role="status"></p><div class="scroll"><table><thead><tr><th>Design-Kriterium</th><th>Beschreibung für dieses Team</th><th>Aktionen</th></tr></thead><tbody id="utg-design-rows"></tbody></table></div>';
    const management = document.getElementById("crud-management");
    if (management) management.after(panel);
    else page.prepend(panel);
    const selector = panel.querySelector("select"),
      body = panel.querySelector("tbody"),
      summary = panel.querySelector("#utg-design-summary");
    const report = document.createElement("section");
    report.className = "panel";
    report.id = "utg-design-overview";
    report.innerHTML =
      '<h2>Design-Kriterien · Erfüllung je Team</h2><p class="hint">Beurteile die Kriterien direkt hier über «Beurteilen». Neue Kriterien starten mit «Nicht beurteilt». Inhaltlich geänderte Kriterien werden bis zur erneuten Beurteilung separat ausgewiesen. Bestehende Bewertungen bleiben erhalten.</p><div class="scroll"><table><thead><tr><th>Team</th><th>Erfüllte Design-Kriterien</th><th>Nicht erfüllte Design-Kriterien</th><th>Nicht beurteilt</th><th>Erneut beurteilen</th><th>Stand</th><th>Aktionen</th></tr></thead><tbody></tbody></table></div>';
    document.getElementById("v3overview").append(report);
    report.querySelector("tbody").id = "utg-design-overview-rows";
    function button(text, action) {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = text;
      b.onclick = action;
      return b;
    }
    function errorMessage(error) {
      summary.textContent = "Nicht gespeichert: " + error.message;
      summary.classList.add("app-open-value");
    }
    function edit(id) {
      const team = selector.value,
        teamRecord = teams().find((t) => t.id === team);
      if (!teamRecord) return;
      const current = read().teamDesignCriteria[team].find((c) => c.id === id);
      app.UTGDialogs.editName({
        title:
          (id ? "Design-Kriterium bearbeiten" : "Design-Kriterium erstellen") +
          " · " +
          teamRecord.name,
        value: current?.name || "",
        description: current?.description || "",
        descriptionLabelText: "Beschreibung für dieses Team",
        submit: (name, description) => {
          if (!teams().some((t) => t.id === team))
            throw Error("Dieses Team wurde inzwischen entfernt.");
          save(api.teamEdit(read(), team, id, name, description));
        },
      });
    }
    function draw() {
      const data = read(),
        allTeams = teams(),
        previous = selector.value;
      selector.replaceChildren();
      for (const team of allTeams) {
        const option = document.createElement("option");
        option.value = team.id;
        option.textContent = team.name;
        selector.append(option);
      }
      if (allTeams.some((t) => t.id === previous)) selector.value = previous;
      selector.disabled = !allTeams.length;
      const team = selector.value;
      panel.querySelector("#utg-design-add").disabled = !team;
      summary.classList.remove("app-open-value");
      body.replaceChildren();
      const criteria = data.teamDesignCriteria[team] || [];
      for (const criterion of criteria) {
        const row = document.createElement("tr");
        const nameCell = document.createElement("td");
        nameCell.className = "app-design-text";
        nameCell.textContent = criterion.name;
        const descriptionCell = document.createElement("td");
        if (criterion.description) {
          const preview = document.createElement("div");
          preview.className = "app-activity-description";
          const text = document.createElement("span");
          text.className = "app-description-text";
          text.id = "design-description-" + team + "-" + criterion.id;
          text.textContent = criterion.description;
          const toggle = document.createElement("button");
          toggle.type = "button";
          toggle.className = "app-description-toggle";
          toggle.textContent = "+";
          toggle.hidden = true;
          toggle.setAttribute("aria-label", "Beschreibung aufklappen");
          toggle.setAttribute("aria-expanded", "false");
          toggle.setAttribute("aria-controls", text.id);
          preview.append(text, toggle);
          descriptionCell.append(preview);
        }
        row.append(nameCell, descriptionCell);
        const actions = document.createElement("td"),
          group = document.createElement("div");
        group.className = "app-row-actions";
        group.append(
          button("Bearbeiten", () => edit(criterion.id)),
          button("Löschen", () => {
            if (
              !confirm(
                "Design-Kriterium «" +
                  criterion.name +
                  "» nur für dieses Team löschen? Die Kriterien anderer Teams bleiben erhalten.",
              )
            )
              return;
            try {
              save(api.teamRemove(read(), team, criterion.id));
            } catch (error) {
              errorMessage(error);
            }
          }),
        );
        actions.append(group);
        row.append(actions);
        body.append(row);
      }
      if (!criteria.length) {
        const row = document.createElement("tr"),
          cell = document.createElement("td");
        cell.colSpan = 3;
        cell.textContent = team
          ? "Für dieses Team sind keine Design-Kriterien vorhanden. Du kannst eigene Kriterien hinzufügen."
          : "Bitte zuerst ein Team erstellen.";
        row.append(cell);
        body.append(row);
      }
      summary.textContent = team
        ? criteria.length + " Design-Kriterien für dieses Team."
        : "Neue Teams erhalten die neun Standardkriterien zum Teamschnitt.";
      drawReport(data, allTeams);
    }
    function assessTeam(teamId, trigger) {
      app.UTGFlowUX?.setTeam(teamId);
      const team = teams().find((t) => t.id === teamId);
      if (!team) return;
      const data = read(),
        criteria = data.teamDesignCriteria[teamId] || [],
        dialog =
          app.UTGEdits?.createDialog?.() ?? document.createElement("dialog");
      dialog.className = "app-drawer";
      dialog.setAttribute("aria-labelledby", "utg-assess-title");
      const form = document.createElement("form"),
        title = document.createElement("h2");
      title.id = "utg-assess-title";
      title.textContent = "Design-Kriterien beurteilen · " + team.name;
      form.append(title);
      const choices = [];
      for (const c of criteria) {
        const field = document.createElement("section");
        field.className = "utg-assessment-item";
        const name = document.createElement("h3");
        name.textContent = c.name;
        const description = document.createElement("p");
        description.textContent = c.description;
        field.append(name, description);
        if (c.needsReview) {
          const warning = document.createElement("p");
          warning.className = "app-open-value";
          warning.textContent =
            "Erneut beurteilen · bisher: " + api.assessmentStatus(c);
          field.append(warning);
        }
        const label = document.createElement("label");
        label.textContent = "Beurteilung";
        const select = document.createElement("select");
        for (const status of ["Nicht beurteilt", "Erfüllt", "Nicht erfüllt"]) {
          const option = document.createElement("option");
          option.value = status;
          option.textContent = status;
          select.append(option);
        }
        select.value = c.needsReview
          ? "Nicht beurteilt"
          : api.assessmentStatus(c);
        if (select.selectedIndex < 0) select.value = "Nicht beurteilt";
        let changed = false;
        select.addEventListener("change", () => {
          changed = true;
        });
        label.append(select);
        field.append(label);
        if (c.note) {
          const note = document.createElement("p");
          note.textContent = "Bisherige Begründung: " + c.note;
          field.append(note);
        }
        choices.push({ c, select, changed: () => changed });
        form.append(field);
      }
      if (!criteria.length) {
        const empty = document.createElement("p");
        empty.textContent =
          "Für dieses Team sind keine Design-Kriterien definiert.";
        form.append(empty);
      }
      const error = document.createElement("p");
      error.className = "app-save-error";
      error.setAttribute("role", "alert");
      form.append(error);
      const actions = document.createElement("div");
      actions.className = "actions";
      const cancel = button("Abbrechen", () => dialog.close()),
        submit = document.createElement("button");
      submit.type = "submit";
      submit.className = "primary";
      submit.textContent = "Beurteilung speichern";
      submit.disabled = !criteria.length;
      actions.append(cancel, submit);
      form.append(actions);
      form.onsubmit = (event) => {
        event.preventDefault();
        try {
          if (!teams().some((t) => t.id === teamId))
            throw Error("Dieses Team wurde inzwischen entfernt.");
          let next = read();
          for (const item of choices) {
            if (!item.changed()) continue;
            const latest = next.teamDesignCriteria[teamId]?.find(
              (c) => c.id === item.c.id,
            );
            if (
              !latest ||
              latest.name !== item.c.name ||
              latest.description !== item.c.description
            )
              throw Error(
                "Ein Kriterium wurde inzwischen geändert. Bitte die Beurteilung neu öffnen.",
              );
            next = api.teamRate(next, teamId, item.c.id, item.select.value);
          }
          save(next);
          app.UTGEdits.closeSaved(dialog);
        } catch (e) {
          error.textContent = "Nicht gespeichert: " + e.message;
        }
      };
      dialog.append(form);
      document.body.append(dialog);
      dialog.addEventListener(
        "close",
        () => {
          dialog.remove();
          const current = [
            ...report.querySelectorAll("button[data-assess-team]"),
          ].find((b) => b.dataset.assessTeam === teamId);
          (current || trigger)?.focus();
        },
        { once: true },
      );
      dialog.showModal();
      (choices[0]?.select || cancel).focus();
    }
    function drawReport(data, allTeams) {
      const host = report.querySelector("tbody");
      host.replaceChildren();
      for (const result of api.teamSummary(data, allTeams)) {
        const row = document.createElement("tr"),
          name = document.createElement("td");
        name.textContent = result.team;
        row.dataset.teamId = result.id;
        row.append(name);
        for (const [list, label] of [
          [result.fulfilled, "erfüllt"],
          [result.unfulfilled, "nicht erfüllt"],
          [result.unassessed, "nicht beurteilt"],
          [result.pending, "erneut beurteilen"],
        ]) {
          const cell = document.createElement("td");
          if (!list.length) cell.textContent = "Keine";
          else {
            const details = document.createElement("details");
            details.className = "utg-criteria-summary";
            const summary = document.createElement("summary");
            summary.textContent = list.length + " " + label;
            const ul = document.createElement("ul");
            for (const c of list) {
              const li = document.createElement("li");
              li.textContent = c.name;
              ul.append(li);
            }
            details.append(summary, ul);
            cell.append(details);
          }
          row.append(cell);
        }
        const count = document.createElement("td"),
          total =
            result.fulfilled.length +
            result.unfulfilled.length +
            result.unassessed.length +
            result.pending.length;
        count.textContent = total
          ? result.fulfilled.length + " / " + total + " erfüllt"
          : "Keine Kriterien zugeordnet";
        row.append(count);
        const action = document.createElement("td");
        const assess = button("Beurteilen", () =>
          assessTeam(result.id, assess),
        );
        assess.dataset.assessTeam = result.id;
        assess.setAttribute(
          "aria-label",
          "Design-Kriterien für " + result.team + " beurteilen",
        );
        assess.disabled = !total;
        action.append(assess);
        row.append(action);
        host.append(row);
      }
      if (!allTeams.length) {
        const row = document.createElement("tr"),
          cell = document.createElement("td");
        cell.colSpan = 7;
        cell.textContent = "Noch keine Teams vorhanden.";
        row.append(cell);
        host.append(row);
      }
    }
    selector.onchange = draw;
    panel.querySelector("#utg-design-add").onclick = () => edit();
    app.addEventListener("gever-v3-updated", draw);
    app.addEventListener("utg:teams-changed", draw);
    app.addEventListener("storage", draw);
    draw();
  })();
}
