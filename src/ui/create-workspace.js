export function initialize(app, browser = globalThis) {
  const window = browser;
  const sessionStorage = app.sessionStorage ?? globalThis.sessionStorage;

  (() => {
    "use strict";
    const $ = (id) => document.getElementById(id),
      main = document.querySelector("main.shell"),
      oldNav = $("utg-nav-anchor");
    if (!main || !oldNav) return;
    const names = [
      ["Zielbild & Prinzipien", "Verstehen"],
      ["Konfiguration", "Festlegen"],
      ["Leistungsmatrix", "Zuordnen"],
      ["Operating Model", "Steuern"],
      ["ART-Gesamtsicht", "Beurteilen"],
    ];
    const nav = document.createElement("nav");
    nav.id = "utg-nav";
    nav.setAttribute("aria-label", "Fünf Schritte zum ART Operating Model");
    names.forEach(([title, sub], i) => {
      const b = document.createElement("button");
      b.type = "button";
      b.innerHTML =
        "<span>0" +
        (i + 1) +
        " · " +
        title +
        "</span><small>" +
        sub +
        "</small>";
      b.onclick = () => activate(i);
      nav.appendChild(b);
    });
    oldNav.parentNode.insertBefore(nav, oldNav);
    oldNav.style.display = "none";
    const pages = names.map((_, i) => {
      let x = document.createElement("div");
      x.className = "utg-page";
      x.id = "utg-page-" + (i + 1);
      x.hidden = true;
      main.insertBefore(x, oldNav);
      return x;
    });
    function intro(i, heading, desc) {
      const e = document.createElement("div");
      e.className = "utg-intro";
      e.innerHTML = "<h2>" + heading + "</h2><p>" + desc + "</p>";
      pages[i].appendChild(e);
    }
    function move(id, i) {
      let el = $(id);
      if (el) pages[i].appendChild(el);
    }
    move("zielbild", 0);

    const config = document.createElement("div");
    config.className = "utg-config-hint";
    config.textContent =
      "Teams, Produkte und LE-Leistungskatalog werden hier verwaltet. Die Leistungszuordnung erfolgt in Register 3.";
    pages[1].appendChild(config);
    move("v3services", 1);
    move("v3matrix", 2);
    move("operating-model", 3);
    // Legacy explanatory panels are intentionally omitted from the Operating Model.
    // Keep the events container in the DOM for compatibility with existing renderEvents().
    move("v3policies", 3);
    $("v3policies").style.display = "none";
    move("v3overview", 4);
    const checks = document.createElement("section");
    checks.className = "panel";
    checks.innerHTML =
      '<h2 style="margin-top:0">Plausibilitätsprüfung des Operating Models</h2><p class="hint">Prüft alle sieben Flow-Regeln, Eintritts- und Übergangskriterien, zentrale Team-DoR und Team-DoD sowie AC in Standardvorlage und Team-Kopien. Hinweise betreffen Vollständigkeit und Struktur, nicht die tatsächliche Erfüllung. Leere individuelle Listen werden gemeldet und unverändert belassen. Keine automatische Freigabe oder Aussage über reale Lieferfähigkeit.</p><div id="utg-checks"></div>';
    pages[4].appendChild(checks);
    const toolbar = main.querySelector(".toolbar");
    if (toolbar) {
      toolbar.classList.add("utg-toolbar");
      nav.parentNode.insertBefore(toolbar, nav);
    }
    function next(i) {
      if (i >= 4) return;
      const div = document.createElement("div");
      div.className = "utg-next";
      const b = document.createElement("button");
      b.textContent = "Weiter: " + names[i + 1][0];
      b.onclick = () => activate(i + 1);
      div.appendChild(b);
      pages[i].appendChild(div);
    }
    pages.forEach((_, i) => next(i));
    function oldShow(v) {
      app.UTGShowPanel?.(v);
    }
    function renderChecks() {
      const out = $("utg-checks");
      if (!out) return;
      const wasOpen = out.querySelector("details")?.open || false;
      let v3 = {},
        v2 = {};
      try {
        v3 = JSON.parse(app.UTGStorage.rawGet("gever-art-v3-config") || "{}");
        v2 = JSON.parse(
          app.UTGStorage.rawGet("gever-art-leistungsmatrix-v1") || "{}",
        );
      } catch (e) {}
      let issues = [];
      issues = app.UTGOperatingModelReview.validate(v2, v3, true);
      if (!issues.length) {
        out.innerHTML =
          '<div class="utg-check utg-ok"><span aria-hidden="true" class="utg-check-success-icon">✓</span><span><b>Prüfung abgeschlossen · keine Befunde</b><br>Die geprüften Regeln sind strukturell vollständig.</span></div>';
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
        out.replaceChildren(details);
        details.append(
          ...issues.map((t) => {
            const d = document.createElement("div");
            d.className = "utg-check";
            const b = document.createElement("strong");
            b.textContent = "Prüfhinweis · ";
            const message = document.createElement("span");
            message.append(b, document.createTextNode(t.message));
            d.append(message);
            const action = document.createElement("button");
            action.type = "button";
            action.className = "utg-fix-link";
            action.textContent =
              t.target.kind === "criteria"
                ? "Kriterien bearbeiten"
                : t.target.kind === "policy"
                  ? "Flow-Regel öffnen"
                  : t.target.kind === "service"
                    ? "Service bearbeiten"
                    : "Konfiguration öffnen";
            action.dataset.reviewKey =
              "rule:" + JSON.stringify(t.target) + ":" + t.message;
            action.onclick = () => app.UTGReviewNavigation.open(t.target);
            d.append(action);
            return d;
          }),
        );
      }
    }
    function activate(i) {
      if (app.UTGEdits && !app.UTGEdits.canNavigate()) return;
      try {
        sessionStorage.setItem("utg-active-register", String(i));
      } catch (e) {}
      pages.forEach((p, j) => (p.hidden = i !== j));
      [...nav.children].forEach((b, j) => {
        b.classList.toggle("active", i === j);
        b.setAttribute("aria-current", i === j ? "step" : "false");
      });
      if (i === 1) oldShow("services");
      if (i === 2) oldShow("matrix");
      if (i === 3) oldShow("policies");
      if (i === 4) {
        oldShow("overview");
        renderChecks();
      }
      app.UTGFlowUX?.onPage(i);
      window.scrollTo({ top: 0, behavior: "instant" });
    }
    app.UTGRenderChecks = renderChecks;
    let initial = 0;
    try {
      const stored = Number(sessionStorage.getItem("utg-active-register"));
      if (Number.isInteger(stored) && stored >= 0 && stored < 5)
        initial = stored;
    } catch (e) {}
    // Restore the saved register only after all inline modules and UI extensions exist.
    if (document.readyState === "loading")
      document.addEventListener("DOMContentLoaded", () => activate(initial), {
        once: true,
      });
    else activate(initial);
    for (const event of ["storage", "gever-v3-updated", "utg:teams-changed"])
      app.addEventListener(event, () => {
        if (!pages[4].hidden) renderChecks();
      });
  })();
}
