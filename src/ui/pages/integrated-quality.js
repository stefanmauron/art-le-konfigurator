export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    const K = "gever-art-v3-config",
      T = "gever-art-leistungsmatrix-v1";
    const read = (k) => {
      try {
        return JSON.parse(app.UTGStorage.rawGet(k) || "null");
      } catch {
        return null;
      }
    };
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
    const host = document.getElementById("v3overview");
    if (!host) return;
    const panel = document.createElement("section");
    panel.className = "panel";
    panel.id = "utg-integrated-quality";
    panel.innerHTML =
      '<h2>ART-Konfigurationsprüfung</h2><p class="hint">Die Kennzahlen unten beschreiben ausschliesslich die Konfiguration. Sie sind keine operativ gemessenen Flow-Werte. Ein gemeinsamer Flow je Team, unabhängig von der Zahl der Produkte.</p><div id="utg-health-stats" class="summary"></div><div class="scroll"><table><thead><tr><th>Team</th><th>Konfigurierte Tätigkeiten</th><th>Offene Ausführung (inkl. fehlender Zuordnung)</th><th>Zuordnungen ohne benannte Verantwortung</th><th>Tätigkeitszuordnungen mit offenen Serviceangaben</th></tr></thead><tbody id="utg-health-rows"></tbody></table></div><h3>Methodische Konsistenz</h3><div id="utg-health-issues" class="hint"></div>';
    host.append(panel);
    const valid = (v) =>
      !!String(v || "").trim() &&
      !/^(Noch zu klären|Noch zu vereinbaren|Nicht definiert)$/i.test(
        String(v).trim(),
      );
    function render() {
      const d = read(K),
        t = read(T);
      if (!d || !t) return;
      const acts = d.activities || [],
        services = d.services || [],
        teams = t.teams || [],
        issues = [];
      const activeTeams = teams.filter(
        (x) =>
          (x.productIds || []).length ||
          Object.keys(d.configs || {}).some(
            (k) => k.startsWith(x.id + "::") && !k.endsWith("::flow"),
          ),
      );
      const rows = activeTeams.map((team) => {
        const c =
          d.configs?.[team.id + "::flow"] ||
          Object.entries(d.configs || {}).find(([k]) =>
            k.startsWith(team.id + "::"),
          )?.[1] ||
          {};
        let assigned = 0,
          org = 0,
          roles = 0,
          interfaces = 0;
        for (const a of acts) {
          const e = c.entries?.[a.name];
          if (!e) {
            org++;
            continue;
          }
          assigned++;
          if (!valid(app.UTGModels.effective(d, e).org)) org++;
          if (
            app.UTGModels.effective(d, e).org !== "Nicht erforderlich" &&
            !valid(e.business) &&
            !valid(e.technical) &&
            !valid(e.operations)
          )
            roles++;
          if (e.service) {
            const svc = app.UTGModels.resolveService(d, e.service);
            const check = app.UTGInterfaceReview.evaluate(svc, e);
            if (
              !svc ||
              !check.provider ||
              !check.embedding ||
              !check.interaction
            )
              interfaces++;
          }
        }
        return { name: team.name, assigned, org, roles, interfaces };
      });
      for (const issue of app.UTGMethodValidation.validate(d))
        issues.push(issue);
      document.getElementById("utg-health-stats").innerHTML = [
        ["Teams mit Produkten", activeTeams.length],
        ["Tätigkeiten im Katalog", acts.length],
        ["Offene Ausführungen", rows.reduce((n, r) => n + r.org, 0)],
        [
          "Tätigkeitszuordnungen mit offenen Serviceangaben",
          rows.reduce((n, r) => n + r.interfaces, 0),
        ],
      ]
        .map(
          ([label, n]) =>
            '<span class="stat"><strong>' +
            n +
            "</strong>" +
            esc(label) +
            "</span>",
        )
        .join("");
      document.getElementById("utg-health-rows").innerHTML =
        rows
          .map(
            (r) =>
              "<tr><td>" +
              esc(r.name) +
              "</td><td>" +
              r.assigned +
              " / " +
              acts.length +
              "</td><td>" +
              r.org +
              "</td><td>" +
              r.roles +
              "</td><td>" +
              r.interfaces +
              "</td></tr>",
          )
          .join("") ||
        '<tr><td colspan="5">Noch keine Teams mit Produkten zugewiesen.</td></tr>';

      const teamNames = new Map(teams.map((t) => [t.id, t.name]));
      const describe = (issue) => {
        const match = issue.message.match(/^(team-[^:]+)::flow: (.+)$/);
        return (
          issue.severity +
          " · " +
          issue.category +
          ": " +
          (match
            ? "Team " + (teamNames.get(match[1]) || match[1]) + ": " + match[2]
            : issue.message)
        );
      };
      const locate = (issue) => {
        const match = issue.message.match(
          /^(team-[^:]+)::flow: (?:Ausführung offen für |unbekannter LE-Service bei )(.+?)(?: \(.*\))?$/,
        );
        if (match) return { page: 2, team: match[1], activity: match[2] };
        return {
          page: 1,
          activity:
            (issue.message.match(/: ([^:()]+?)(?: \(.*\))?$/) || [])[1] || "",
        };
      };
      const list = document.getElementById("utg-health-issues"),
        wasOpen = list.querySelector("details")?.open || false;
      list.replaceChildren();
      if (!issues.length) {
        list.textContent =
          "Keine methodischen Widersprüche im geprüften Katalog und den Servicevereinbarungen.";
      } else {
        const details = document.createElement("details");
        details.className = "utg-findings";
        details.open = wasOpen;
        const summary = document.createElement("summary");
        const updateSummary = () => {
          summary.textContent =
            issues.length +
            " " +
            (issues.length === 1 ? "Befund" : "Befunde") +
            " · " +
            (details.open ? "Details ausblenden" : "Details anzeigen");
        };
        updateSummary();
        details.addEventListener("toggle", updateSummary);
        details.append(summary);
        list.append(details);
        const ul = document.createElement("ul");
        details.append(ul);
        issues.forEach((issue) => {
          const target = locate(issue),
            li = document.createElement("li");
          const message = document.createElement("span");
          message.textContent = describe(issue);
          li.append(message);
          const button = document.createElement("button");
          button.type = "button";
          button.className = "utg-fix-link";
          button.textContent =
            target.page === 2
              ? "Leistungsmatrix öffnen"
              : "Konfiguration öffnen";
          button.dataset.reviewKey =
            "health:" + JSON.stringify(target) + ":" + issue.message;
          button.addEventListener("click", () => {
            const navButton =
              document.querySelectorAll("#utg-nav button")[target.page];
            navButton?.click();
            if (target.page === 2) {
              const selector = document.getElementById("v3team");
              if (
                selector &&
                [...selector.options].some((o) => o.value === target.team)
              ) {
                selector.value = target.team;
                selector.dispatchEvent(new Event("change", { bubbles: true }));
              }
              const rows = [...document.querySelectorAll("#v3rows tr")];
              const row = rows.find(
                (r) => r.cells[1]?.textContent.trim() === target.activity,
              );
              if (row) {
                row.scrollIntoView({ block: "center", behavior: "auto" });
                row.classList.add("utg-issue-target");
                setTimeout(
                  () => row.classList.remove("utg-issue-target"),
                  3500,
                );
              } else
                document
                  .getElementById("v3matrix")
                  ?.scrollIntoView({ block: "start" });
            } else {
              const row = [
                ...document.querySelectorAll("#utg-activity-rows tr"),
              ].find(
                (r) =>
                  r.querySelector(".activity-name")?.textContent.trim() ===
                  target.activity,
              );
              if (row) {
                row.scrollIntoView({ block: "center", behavior: "auto" });
                row.classList.add("utg-issue-target");
                setTimeout(
                  () => row.classList.remove("utg-issue-target"),
                  3500,
                );
              }
            }
          });
          li.append(button);
          ul.append(li);
        });
      }
    }
    app.addEventListener("gever-v3-updated", render);
    app.addEventListener("utg-catalog-changed", render);
    app.addEventListener("storage", render);
    render();
  })();
}
