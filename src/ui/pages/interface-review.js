import { createInterfaceReview } from "../../domain/interface-review.js";
export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    app.UTGInterfaceReview = createInterfaceReview();
    const { valid, entries, evaluate } = app.UTGInterfaceReview;
    const KEY = "gever-art-v3-config",
      TEAM = "gever-art-leistungsmatrix-v1",
      target = document.getElementById("v3overview");
    if (!target) return;
    const panel = document.createElement("section");
    panel.className = "panel";
    panel.id = "utg-interface-3907";
    panel.innerHTML =
      '<h2>LE-Schnittstellen · Angaben zur Zuordnung</h2><details class="utg-findings" id="utg-interface-details"><summary>Zuordnungen anzeigen / ausblenden</summary><p class="hint">Geprüft werden Anbieter sowie Einbindung und Zusammenarbeit je Tätigkeit. Teamwerte haben Vorrang vor Servicevorgaben. «Angaben erfasst» bestätigt die Vollständigkeit der Eingaben, keine fachliche Vereinbarung oder zugesagte Lieferfähigkeit.</p><div class="v3scroll"><table><thead><tr><th>Team</th><th>LE-Service</th><th>Verwendungen</th><th>Angabenstand</th><th>Aktionen</th></tr></thead><tbody id="utg-interface-rows"></tbody></table></div><p class="hint" id="utg-interface-summary"></p></details>';
    target.append(panel);
    const $ = (id) => document.getElementById(id),
      esc = (s) =>
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
    const read = (key) => {
      try {
        return JSON.parse(app.UTGStorage.rawGet(key) || "{}");
      } catch {
        return {};
      }
    };
    function render() {
      const d = read(KEY),
        teams = read(TEAM).teams || [],
        rows = [];
      let open = 0,
        uses = 0;
      for (const team of teams) {
        const assigned = entries(d, team);
        for (const service of d.services || []) {
          const matched = Object.entries(assigned).filter(
            ([, entry]) =>
              app.UTGModels.resolveService(d, entry.service)?.id === service.id,
          );
          if (!matched.length) continue;
          uses += matched.length;
          const gaps = [];
          if (!valid(service.provider)) gaps.push("Anbieter offen");
          for (const field of ["embedding", "interaction"]) {
            const missing = matched.filter(
              ([, entry]) => !evaluate(service, entry)[field],
            );
            if (missing.length)
              gaps.push(
                (field === "embedding" ? "Einbindung" : "Zusammenarbeit") +
                  " offen: " +
                  missing.map(([name]) => name).join(", "),
              );
          }
          if (gaps.length) open++;
          rows.push(
            "<tr><td>" +
              esc(team.name) +
              "</td><td>" +
              esc(service.name) +
              "</td><td>" +
              matched.length +
              '</td><td class="' +
              (gaps.length ? "app-open-value" : "utg-ok") +
              '">' +
              esc(gaps.join(" · ") || "Angaben erfasst") +
              '</td><td><div class="actions"><button type="button" data-review-key="service:' +
              esc(team.id) +
              ":" +
              esc(service.id || service.name) +
              '" data-review-service="' +
              esc(service.id || service.name) +
              '">Service bearbeiten</button><button type="button" data-review-team="' +
              esc(team.id) +
              '" data-review-service-id="' +
              esc(service.id || service.name) +
              '">Zuordnung bearbeiten</button></div></td></tr>',
          );
        }
      }
      $("utg-interface-rows").innerHTML =
        rows.join("") ||
        '<tr><td colspan="5">Noch keine LE-Services im Team-Flow zugeordnet.</td></tr>';
      $("utg-interface-summary").textContent =
        rows.length +
        " aktive Team-Service-Schnittstellen · " +
        uses +
        " Tätigkeitszuordnungen · " +
        open +
        " Schnittstellen mit offenen Angaben.";
    }
    panel.addEventListener("click", (event) => {
      const service = event.target.closest("[data-review-service]"),
        team = event.target.closest("[data-review-team]");
      if (service) {
        document.querySelectorAll("#utg-nav button")[1].click();
        const data = read(KEY);
        const selected = (data.services || []).find(
          (s) => (s.id || s.name) === service.dataset.reviewService,
        );
        if (selected) app.UTGWorkspace.openService(selected.id);
      }
      if (team) {
        document.querySelectorAll("#utg-nav button")[2].click();
        const selector = $("v3team");
        selector.value = team.dataset.reviewTeam;
        selector.dispatchEvent(new Event("change", { bubbles: true }));
        $("v3matrix").scrollIntoView({ block: "start" });
        selector.focus();
      }
    });
    app.addEventListener("gever-v3-updated", render);
    app.addEventListener("utg-catalog-changed", render);
    document
      .querySelectorAll("#utg-nav button")
      .forEach((b) => b.addEventListener("click", render));
    render();
  })();
}
