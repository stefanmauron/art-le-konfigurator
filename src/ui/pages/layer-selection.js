export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    const root = document.getElementById("utg-layers"),
      model = document.getElementById("model-content");
    if (!root || !model) return;
    // Stable overlay host: model-content is rebuilt by renderModel().
    const host = document.createElement("div");
    host.id = "utg-layer-host";
    model.before(host);
    const key = "utg-model-layers-v1",
      states = app.UTGFlow.states;
    let preferences = {};
    try {
      preferences = JSON.parse(app.UTGStorage.rawGet(key) || "{}") || {};
    } catch (e) {}
    const eventCells = [
      ["Portfolio Board / POM Board", "Bedarfe und Prioritäten"],
      ["Backlog Refinement", "Features klären und schneiden"],
      ["PI Planning", "PI-Ziele, Kapazität und Abhängigkeiten"],
      ["ART Sync", "Abhängigkeiten und Blockaden"],
      ["System Demo", "Integrierte Ergebnisse zeigen"],
      ["Release-Abstimmung", "Koordination, kein vorgeschriebenes SAFe-Event"],
      ["Inspect & Adapt", "Verbesserungen aus Ergebnissen ableiten"],
    ];
    const pipelineCells = [
      ["Continuous Exploration", "Bedarf erkennen und Hypothesen prüfen"],
      ["Continuous Exploration", "Features und Lösungsoptionen entwickeln"],
      [
        "Bereit zur Umsetzung",
        "Priorisierte Warteschlange, kein Pipeline-Schritt",
      ],
      [
        "Continuous Integration",
        "Entwickeln, integrieren, automatisiert testen",
      ],
      [
        "Continuous Integration / Deployment",
        "Validieren und Deployment-Fähigkeit nachweisen",
      ],
      [
        "Continuous Deployment / Release on Demand",
        "Bereitstellen und bedarfsgerecht freigeben",
      ],
      ["Measure & Learn", "Nutzung und Wirkung auswerten; Rückkopplung"],
    ];
    function grid(items, kind) {
      return (
        '<div class="utg-aligned-grid">' +
        items
          .map(
            (x, i) =>
              '<div class="utg-phase ' +
              (i === 2 ? "utg-phase--backlog" : "") +
              '"><strong>' +
              x[0] +
              "</strong><small>" +
              x[1] +
              "</small></div>",
          )
          .join("") +
        "</div>"
      );
    }
    function stageLabels() {
      return (
        '<div class="utg-stage-reference">' +
        states.map((x) => "<span>" + x + "</span>").join("") +
        "</div>"
      );
    }
    function panel(id, content) {
      const el = document.createElement("section");
      el.id = "utg-layer-" + id;
      el.className = "utg-layer-panel utg-layer-panel--" + id;
      el.hidden = !preferences[id];
      el.innerHTML = content;
      return el;
    }
    function render() {
      const existing = ["safe", "pipeline"].map((id) =>
        document.getElementById("utg-layer-" + id),
      );
      existing.forEach((el) => el?.remove());
      const safe = panel(
        "safe",
        '<h3>SAFe-Events entlang des Feature-Flows</h3><p class="utg-note">Zuordnung zeigt die typische Unterstützung des Flows, keine verbindlichen Gates. ART-weite Events wirken über mehrere Zustände.</p><div class="utg-overlay-scroll"><div class="utg-span-grid"><div class="utg-band" style="grid-column:1 / span 7"><strong>ART-weite Synchronisation</strong>ART Sync · PI Planning (periodisch) · Inspect & Adapt (am PI-Ende) · System Demo (regelmässig)</div></div>' +
          grid(eventCells, "safe") +
          "</div>",
      );
      const pipeline = panel(
        "pipeline",
        '<h3>SAFe Continuous Delivery Pipeline</h3><p class="utg-note">Die vier Aspekte Continuous Exploration, Continuous Integration, Continuous Deployment und Release on Demand überlagern den Feature-Flow; sie sind keine zusätzlichen Kanban-Zustände.</p><div class="utg-overlay-scroll"><div class="utg-span-grid"><div class="utg-band" style="grid-column:1 / span 2"><strong>Continuous Exploration</strong>Bedarf, Lösung und Hypothesen</div><div class="utg-band" style="grid-column:3 / span 3"><strong>Continuous Integration</strong>Integrieren, testen und validieren</div><div class="utg-band" style="grid-column:6 / span 1"><strong>Continuous Deployment</strong>Technisch bereitstellen</div><div class="utg-band" style="grid-column:7 / span 1"><strong>Release on Demand</strong>Wert realisieren</div></div>' +
          grid(pipelineCells, "pipeline") +
          "</div>",
      );
      host.append(safe, pipeline);
    }
    for (const id of ["safe", "pipeline"]) {
      const cb = root.querySelector('[data-layer="' + id + '"]');
      if (!cb) continue;
      cb.checked = !!preferences[id];
      cb.addEventListener("change", () => {
        preferences[id] = cb.checked;
        try {
          app.UTGStorage.rawSet(key, JSON.stringify(preferences));
        } catch (e) {}
        render();
      });
    }
    render();
  })();
}
