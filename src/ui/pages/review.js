export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    const KEY = "gever-art-v3-config",
      TEAMS = "gever-art-leistungsmatrix-v1";
    const host = document.getElementById("v3overview");
    if (!host) return;
    const section = document.createElement("section");
    section.className = "utg-team-audit";
    section.id = "utg-team-audit";
    section.innerHTML =
      '<h2>Offene Elemente je Team</h2><p class="utg-muted">Teambezogene Sicht auf die noch nicht zugeordneten Tätigkeiten. Ein Team besitzt einen gemeinsamen Flow für alle verantworteten Produkte.</p><div id="utg-team-audit-content"></div>';
    host.appendChild(section);
    function read(k) {
      try {
        return JSON.parse(app.UTGStorage.rawGet(k) || "{}");
      } catch {
        return {};
      }
    }
    function cell(tag, txt, cls) {
      const e = document.createElement(tag);
      e.textContent = String(txt);
      if (cls) e.className = cls;
      return e;
    }
    function render() {
      const out = document.getElementById("utg-team-audit-content");
      if (!out) return;
      const d = read(KEY),
        base = read(TEAMS),
        teams = Array.isArray(base.teams) ? base.teams : [],
        products = Array.isArray(d.products) ? d.products : [];
      const names = [...document.querySelectorAll("#v3overviewrows tr")]
        .map((tr) => tr.cells[0]?.textContent?.trim())
        .filter(Boolean);
      out.replaceChildren();
      if (!teams.length) {
        out.append(cell("p", "Noch keine Teams erfasst."));
        return;
      }
      const table = document.createElement("table"),
        thead = document.createElement("thead"),
        head = document.createElement("tr");
      [
        "Team",
        "Verantwortete Produkte",
        "Offene Tätigkeiten",
        "Details",
      ].forEach((x) => head.append(cell("th", x)));
      thead.append(head);
      table.append(thead);
      const body = document.createElement("tbody");
      let totalOpen = 0;
      for (const team of teams) {
        const assigned = products.filter((p) =>
          Array.isArray(team.productIds)
            ? team.productIds.includes(p.id)
            : Object.prototype.hasOwnProperty.call(
                d.configs || {},
                team.id + "::" + p.id,
              ),
        );
        const missing = assigned.length
          ? names.filter(
              (n) => app.UTGOpenAssignments.evaluate(d, team, n).bucket === 4,
            )
          : [];
        totalOpen += missing.length;
        const row = document.createElement("tr");
        row.append(cell("td", team.name || team.id, "utg-team-name"));
        row.append(
          cell(
            "td",
            assigned.map((p) => p.name).join(", ") ||
              "Keine Produkte zugeordnet",
          ),
        );
        row.append(
          cell(
            "td",
            missing.length + " von " + (assigned.length ? names.length : 0),
            missing.length ? "utg-open" : "",
          ),
        );
        const detail = document.createElement("td");
        const details = document.createElement("details");
        details.className = "utg-audit-details";
        details.append(
          cell(
            "summary",
            missing.length
              ? "Offene Elemente anzeigen"
              : "Keine offenen Tätigkeiten",
          ),
        );
        const list = document.createElement("ul");
        (missing.length
          ? missing
          : ["Keine offenen Ausführungszuordnungen."]
        ).forEach((n) => list.append(cell("li", n)));
        details.append(list);
        detail.append(details);
        row.append(detail);
        body.append(row);
      }
      table.append(body);
      out.append(table);
      const aggregate = [
        ...document.querySelectorAll("#v3overviewrows tr"),
      ].reduce((sum, tr) => sum + (Number(tr.cells[5]?.textContent) || 0), 0);
      if (aggregate !== totalOpen) {
        const warning = cell(
          "p",
          "Konsistenzprüfung: Die Team- und ART-Auswertung weichen ab. Bitte Ansicht aktualisieren.",
          "utg-open",
        );
        out.prepend(warning);
        console.warn(
          "UTG Open Assignments: inconsistent totals",
          aggregate,
          totalOpen,
        );
      }
    }
    // Aktualisierung beim Wechsel zur ART-Gesamtsicht und bei Änderungen der zentralen Konfiguration.
    const nav = document.getElementById("utg-nav");
    if (nav) nav.addEventListener("click", () => queueMicrotask(render));
    document.addEventListener("click", (e) => {
      if (e.target.closest('[data-v3="overview"]')) queueMicrotask(render);
    });
    app.addEventListener("gever-v3-updated", render);
    app.addEventListener("storage", render);
    render();
  })();
}
