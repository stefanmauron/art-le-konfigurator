export function initialize(app, browser = globalThis) {
  const window = browser;
  (() => {
    "use strict";
    const KEY = "gever-art-v3-config",
      page = document.getElementById("utg-page-2");
    if (!page) return;
    const stages = [...app.UTGFlow.states, "Übergreifend"];
    const TYPES = [
      "Zustandsbezogen",
      "Kontinuierlich",
      "Entscheidung",
      "Governance",
      "Lifecycle",
      "Feedback",
    ];
    const read = () => {
      try {
        return JSON.parse(app.UTGStorage.rawGet(KEY) || "{}");
      } catch {
        return {};
      }
    };
    const write = (d) => {
      app.UTGStorage.rawSet(KEY, JSON.stringify(d));
      window.dispatchEvent(new Event("utg-catalog-changed"));
      window.dispatchEvent(new Event("gever-v3-updated"));
    };
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
    const panel = document.createElement("section");
    panel.className = "panel";
    panel.id = "utg-activities";
    panel.innerHTML =
      '<h2>Tätigkeiten verwalten</h2><p class="hint">Zentraler Tätigkeitskatalog für die Leistungsmatrix. Jede Tätigkeit hat eine primäre Zuordnung; begleitende Phasen bezeichnen die tatsächliche Ausführung einer Tätigkeit in anderen Zuständen. Backlog ist eine Warteschlange und kein Bearbeitungsschritt. Änderungen gelten für alle Teams und Produkte. Der vorgeschlagene LE-Service wird nur bei neuen Team-Flow-Zuordnungen vorbelegt. Bestehende Vereinbarungen und bewusst leere Zuordnungen bleiben unverändert.</p><div class="actions utg-activity-actions"><button type="button" id="utg-activity-add">+ Tätigkeit erstellen</button><span id="utg-activity-count" class="muted"></span></div><div class="scroll"><table><thead><tr><th>Primäre Flow-Phase</th><th>Tätigkeit</th><th>Typ</th><th>Begleitende Flow-Phasen</th><th>Vorgeschlagener LE-Service</th><th>Aktionen</th></tr></thead><tbody id="utg-activity-rows"></tbody></table></div>';
    const services = document.getElementById("v3services");
    page.insertBefore(panel, services || null);

    const columnHelp = [
      "Der Flow-Zustand, dem die Tätigkeit hauptsächlich zugeordnet ist. Übergreifende Tätigkeiten gelten ausserhalb einzelner Zustände. Backlog ist eine Warteschlange und keine aktive Bearbeitungsphase. Wirkung: Bestimmt die Phase in der Leistungsmatrix und die Platzierung im Operating Model. Die Konfigurationsprüfung erkennt unzulässige Phasenzuordnungen.",
      "Name der Tätigkeit. Unter Bearbeiten kannst du den Namen und die Beschreibung ändern. Vorhandene Beschreibungen lassen sich hier aufklappen. Wirkung: Der Name erscheint in der Leistungsmatrix, im Operating Model und in der ART-Gesamtsicht. Umbenennen führt bestehende Flow-Zuordnungen nach. Die Beschreibung erläutert die Tätigkeit hier im Katalog und wird mit der Konfiguration gespeichert; sie steuert keine Abläufe.",
      "Beschreibt die Art der Tätigkeit: zustandsbezogen, kontinuierlich, Entscheidung, Governance, Lifecycle oder Feedback. Wirkung: Wird im Tätigkeitskatalog und bei übergreifenden Tätigkeiten im Operating Model angezeigt. Der Typ ändert weder Phasenzuordnung noch Zuständigkeiten oder Prüfkennzahlen.",
      "Weitere Flow-Zustände, in denen die Tätigkeit ebenfalls ausgeführt wird. Wirkung: Die Tätigkeit erscheint im Operating Model zusätzlich unter den begleitenden Tätigkeiten der gewählten Zustände. Ihre primäre Phase und ihre gemeinsame Leistungszuordnung bleiben bestehen; es entsteht kein zusätzlicher Matrixeintrag. Die Konfigurationsprüfung prüft auch diese Phasenangaben.",
      "Servicevorschlag für neue Team-Flow-Zuordnungen. Wirkung: Bei neuen Zuordnungen wird der Service in der Leistungsmatrix vorbelegt; der Anbieter wird als vererbte Ausführung verwendet, bis eine eigene Auswahl erfolgt. Ohne eigene Vereinbarung gelten dort die Servicevorgaben für Einbindung und Zusammenarbeit. Die tatsächlich gespeicherte Servicezuordnung fliesst in die Schnittstellenübersicht und deren Prüfungen ein. Bestehende Vereinbarungen und bewusst leere Zuordnungen werden durch Änderungen dieses Vorschlags nicht überschrieben.",
      "Bearbeiten öffnet den rechten Drawer für Name und Beschreibung. Wirkung: Änderungen gelten für den gemeinsamen Tätigkeitskatalog aller Teams. Löschen entfernt nach Bestätigung die Tätigkeit und ihre bestehenden Leistungszuordnungen. Sie entfällt damit auch in der Leistungsmatrix, im Operating Model und in tätigkeitsbezogenen Auswertungen. Lokal gespeicherte Änderungen werden beim nächsten Speichern der Konfiguration mitgeführt.",
    ];
    const columnTooltip = document.createElement("div");
    columnTooltip.id = "utg-activity-column-tooltip";
    columnTooltip.className = "app-column-tooltip";
    columnTooltip.setAttribute("role", "tooltip");
    columnTooltip.hidden = true;
    document.body.append(columnTooltip);
    let activeInfo = null;
    function hideColumnHelp() {
      if (activeInfo) activeInfo.removeAttribute("aria-describedby");
      activeInfo = null;
      columnTooltip.hidden = true;
    }
    function showColumnHelp(button, text) {
      if (activeInfo && activeInfo !== button)
        activeInfo.removeAttribute("aria-describedby");
      activeInfo = button;
      columnTooltip.textContent = text;
      columnTooltip.hidden = false;
      button.setAttribute("aria-describedby", columnTooltip.id);
      const rect = button.getBoundingClientRect(),
        tip = columnTooltip.getBoundingClientRect();
      const left = Math.max(
        12,
        Math.min(rect.left, window.innerWidth - tip.width - 12),
      );
      const below = rect.bottom + 8;
      const top =
        below + tip.height <= window.innerHeight - 12
          ? below
          : Math.max(12, rect.top - tip.height - 8);
      columnTooltip.style.left = left + "px";
      columnTooltip.style.top = top + "px";
    }
    panel.querySelectorAll("thead th").forEach((heading, index) => {
      const title = heading.textContent;
      const button = document.createElement("button");
      button.type = "button";
      button.className = "app-column-info";
      button.textContent = "i";
      button.setAttribute("aria-label", "Info: " + title);
      button.addEventListener("mouseenter", () =>
        showColumnHelp(button, columnHelp[index]),
      );
      button.addEventListener("mouseleave", hideColumnHelp);
      button.addEventListener("focus", () =>
        showColumnHelp(button, columnHelp[index]),
      );
      button.addEventListener("blur", hideColumnHelp);
      button.addEventListener("click", () =>
        showColumnHelp(button, columnHelp[index]),
      );
      button.addEventListener("keydown", (event) => {
        if (event.key === "Escape") hideColumnHelp();
      });
      heading.append(" ", button);
    });
    app.addEventListener("scroll", hideColumnHelp, true);
    app.addEventListener("resize", hideColumnHelp);
    document
      .querySelectorAll("#utg-nav button")
      .forEach((button) => button.addEventListener("click", hideColumnHelp));

    const css = document.createElement("style");
    css.textContent =
      "#utg-activities td:first-child{white-space:nowrap}#utg-activities td:first-child select{width:calc(100% - 46px);min-width:130px}#utg-activities .activity-drag-handle{cursor:grab;touch-action:none}#utg-activities .activity-drag-handle:active{cursor:grabbing}#utg-activities tr.activity-drop-before>td{box-shadow:inset 0 3px #2563eb}#utg-activities tr.activity-drop-after>td{box-shadow:inset 0 -3px #2563eb}#utg-activities table{min-width:1100px}#utg-activities .utg-secondary{min-width:230px;max-width:330px}#utg-activities .utg-secondary label{display:inline-flex;align-items:center;gap:3px;margin:2px 7px 2px 0;font-size:var(--text-small);white-space:nowrap}#utg-activities .utg-secondary input{width:auto;min-width:0}#utg-activities td:last-child{white-space:nowrap}#utg-activities td button{padding:6px 8px;margin-right:5px}#utg-activities .activity-name{font-weight:600}";
    document.head.appendChild(css);
    let draggedId = null;
    let scrollSpeed = 0;
    let scrollTimer = null;
    const rows = document.getElementById("utg-activity-rows");
    function clearDrag() {
      draggedId = null;
      scrollSpeed = 0;
      window.clearInterval(scrollTimer);
      scrollTimer = null;
      rows
        .querySelectorAll(".activity-drop-before, .activity-drop-after")
        .forEach((row) =>
          row.classList.remove("activity-drop-before", "activity-drop-after"),
        );
    }
    function moveActivity(id, targetId, after) {
      const d = read();
      const from = d.activities.findIndex((item) => item.id === id);
      if (
        from < 0 ||
        id === targetId ||
        !d.activities.some((item) => item.id === targetId)
      )
        return;
      const [item] = d.activities.splice(from, 1);
      const target = d.activities.findIndex((item) => item.id === targetId);
      d.activities.splice(target + (after ? 1 : 0), 0, item);
      write(d);
    }
    rows.addEventListener("dragstart", (event) => {
      const handle = event.target.closest(".activity-drag-handle");
      if (!handle) {
        event.preventDefault();
        return;
      }
      draggedId = handle.closest("tr").dataset.id;
      event.dataTransfer.effectAllowed = "move";
      event.dataTransfer.setData("text/plain", draggedId);
      scrollTimer = window.setInterval(() => {
        if (scrollSpeed) window.scrollBy(0, scrollSpeed);
      }, 30);
    });
    rows.addEventListener("dragover", (event) => {
      if (!draggedId) return;
      event.preventDefault();
      event.dataTransfer.dropEffect = "move";
      rows
        .querySelectorAll(".activity-drop-before, .activity-drop-after")
        .forEach((row) =>
          row.classList.remove("activity-drop-before", "activity-drop-after"),
        );
      const row = event.target.closest("tr[data-id]");
      if (row && row.dataset.id !== draggedId) {
        const rect = row.getBoundingClientRect();
        row.classList.add(
          event.clientY < rect.top + rect.height / 2
            ? "activity-drop-before"
            : "activity-drop-after",
        );
      }
      scrollSpeed =
        event.clientY < 90
          ? -18
          : event.clientY > window.innerHeight - 90
            ? 18
            : 0;
    });
    rows.addEventListener("drop", (event) => {
      if (!draggedId) return;
      event.preventDefault();
      const row = event.target.closest("tr[data-id]");
      const id = draggedId;
      const after = row?.classList.contains("activity-drop-after");
      clearDrag();
      if (row) moveActivity(id, row.dataset.id, after);
      rows
        .querySelector(
          'tr[data-id="' + window.CSS.escape(id) + '"] .activity-drag-handle',
        )
        ?.focus();
    });
    document.addEventListener("dragend", clearDrag);
    document.addEventListener("dragover", (event) => {
      if (!rows.contains(event.target)) scrollSpeed = 0;
    });
    rows.addEventListener("keydown", (event) => {
      if (
        !event.target.matches(".activity-drag-handle") ||
        !["ArrowUp", "ArrowDown"].includes(event.key)
      )
        return;
      event.preventDefault();
      const row = event.target.closest("tr");
      const target =
        event.key === "ArrowUp"
          ? row.previousElementSibling
          : row.nextElementSibling;
      if (!target) return;
      const id = row.dataset.id;
      moveActivity(id, target.dataset.id, event.key === "ArrowDown");
      rows
        .querySelector(
          'tr[data-id="' + window.CSS.escape(id) + '"] .activity-drag-handle',
        )
        ?.focus();
    });
    function draw() {
      const d = read(),
        a = d.activities || [];
      document.getElementById("utg-activity-count").textContent =
        a.length + " Tätigkeiten";
      const secondary = (item) =>
        '<div class="utg-secondary">' +
        stages
          .filter(
            (x) => x !== item.phase && x !== "Übergreifend" && x !== "Backlog",
          )
          .map(
            (x) =>
              '<label><input type="checkbox" data-secondary="' +
              esc(x) +
              '" ' +
              ((item.additionalPhases || []).includes(x) ? "checked" : "") +
              ">" +
              esc(x) +
              "</label>",
          )
          .join("") +
        "</div>";
      const options = (v, values) =>
        values
          .map(
            (x) =>
              '<option value="' +
              esc(x.value) +
              '" ' +
              (x.value === v ? "selected" : "") +
              ">" +
              esc(x.label) +
              "</option>",
          )
          .join("");
      document.getElementById("utg-activity-rows").innerHTML = a
        .map(
          (item, i) =>
            '<tr data-id="' +
            esc(item.id) +
            '"><td><button type="button" class="activity-drag-handle" draggable="true" aria-label="' +
            esc("Tätigkeit verschieben: " + item.name) +
            '" title="Ziehen oder mit Pfeiltasten verschieben">⋮⋮</button><select data-field="phase">' +
            options(
              item.phase,
              stages.map((x) => ({ value: x, label: x })),
            ) +
            '</select></td><td><span class="activity-name">' +
            esc(item.name) +
            "</span>" +
            (item.description
              ? '<div class="app-activity-description"><span class="app-description-text" id="activity-description-' +
                esc(item.id) +
                '">' +
                esc(item.description) +
                '</span><button type="button" class="app-description-toggle" aria-label="Beschreibung aufklappen" aria-expanded="false" aria-controls="activity-description-' +
                esc(item.id) +
                '" hidden>+</button></div>'
              : "") +
            '</td><td><select data-field="type">' +
            options(
              item.type || "Zustandsbezogen",
              TYPES.map((x) => ({ value: x, label: x })),
            ) +
            "</select></td><td>" +
            secondary(item) +
            '</td><td><select data-field="service">' +
            options(item.service || "", [
              { value: "", label: "Kein LE-Service" },
              ...app.UTGModels.serviceOptions(d, item.service).filter(
                (o) => o.value,
              ),
            ]) +
            '</select></td><td><div class="app-row-actions"><button type="button" data-action="rename">Bearbeiten</button><button type="button" data-action="delete">Löschen</button></div></td></tr>',
        )
        .join("");
      document.querySelectorAll("#utg-activity-rows tr").forEach((row) => {
        const id = row.dataset.id;
        row.querySelectorAll("select").forEach(
          (sel) =>
            (sel.onchange = () => {
              const d = read(),
                item = d.activities.find((x) => x.id === id);
              if (!item) return;
              item[sel.dataset.field] = sel.value;
              if (sel.dataset.field === "phase") {
                item.additionalPhases = (item.additionalPhases || []).filter(
                  (x) => x !== sel.value,
                );
                if (sel.value === "Backlog") {
                  alert(
                    "Backlog ist eine Warteschlange. Für aktive Tätigkeiten bitte einen Bearbeitungszustand wählen.",
                  );
                  item.phase = "Analyzing";
                }
              }
              write(d);
              draw();
            }),
        );
        row.querySelectorAll("input[data-secondary]").forEach(
          (box) =>
            (box.onchange = () => {
              const d = read(),
                item = d.activities.find((x) => x.id === id);
              if (!item) return;
              const selected = new Set(item.additionalPhases || []);
              if (box.checked) selected.add(box.dataset.secondary);
              else selected.delete(box.dataset.secondary);
              selected.delete(item.phase);
              selected.delete("Backlog");
              item.additionalPhases = stages.filter((x) => selected.has(x));
              write(d);
            }),
        );
        row.querySelector('[data-action="rename"]').onclick = () => {
          const item = read().activities.find((x) => x.id === id);
          if (!item) return;
          app.UTGDialogs.editName({
            title: "Tätigkeit bearbeiten",
            value: item.name,
            description: item.description || "",
            submit: (val, description) => {
              const d = read(),
                item = d.activities.find((x) => x.id === id);
              if (!item)
                throw Error("Diese Tätigkeit wurde inzwischen entfernt.");
              if (
                d.activities.some(
                  (x) =>
                    x.id !== id && x.name.toLowerCase() === val.toLowerCase(),
                )
              )
                throw Error("Die Tätigkeit existiert bereits.");
              const old = item.name;
              item.name = val;
              item.description = description;
              if (val !== old) {
                for (const cfg of Object.values(d.configs || {}))
                  if (
                    cfg.entries &&
                    Object.prototype.hasOwnProperty.call(cfg.entries, val)
                  )
                    throw Error(
                      "Unter dem neuen Namen besteht bereits eine Leistungszuordnung. Bitte einen anderen Namen wählen.",
                    );
                for (const cfg of Object.values(d.configs || {})) {
                  if (
                    cfg.entries &&
                    Object.prototype.hasOwnProperty.call(cfg.entries, old)
                  ) {
                    cfg.entries[val] = cfg.entries[old];
                    delete cfg.entries[old];
                  }
                }
              }
              write(d);
              draw();
            },
          });
        };
        row.querySelector('[data-action="delete"]').onclick = () => {
          const d = read(),
            item = d.activities.find((x) => x.id === id);
          if (!item) return;
          const used = Object.values(d.configs || {}).filter((c) =>
            Object.prototype.hasOwnProperty.call(c.entries || {}, item.name),
          ).length;
          if (
            !confirm(
              "Tätigkeit «" +
                item.name +
                "» löschen? " +
                used +
                " Team-Leistungszuordnung(en) werden entfernt.",
            )
          )
            return;
          d.activities = d.activities.filter((x) => x.id !== id);
          for (const cfg of Object.values(d.configs || {}))
            delete cfg.entries?.[item.name];
          write(d);
          draw();
        };
      });
    }
    document.getElementById("utg-activity-add").onclick = () =>
      app.UTGDialogs.editName({
        title: "Tätigkeit erstellen",
        description: "",
        submit: (name, description) => {
          const d = read();
          d.activities ??= [];
          if (
            d.activities.some(
              (x) => x.name.toLowerCase() === name.toLowerCase(),
            )
          )
            throw Error("Diese Tätigkeit existiert bereits.");
          d.activities.push({
            id:
              "activity-" +
              Date.now().toString(36) +
              "-" +
              Math.random().toString(36).slice(2, 7),
            name: name.trim(),
            phase: "Analyzing",
            additionalPhases: [],
            type: "Zustandsbezogen",
            description,
            service: "",
          });
          write(d);
          draw();
        },
      });
    app.addEventListener("utg-catalog-changed", draw);
    app.addEventListener("gever-v3-updated", draw);
    draw();
  })();
}
