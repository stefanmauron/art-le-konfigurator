export function initialize(app, browser = globalThis) {
  const window = browser;

  ("use strict");
  const KEY = "gever-art-leistungsmatrix-v1";
  const stages = app.UTGFlow.states;
  const activities = app.UTGDefaults.baseline().v3.activities.map((a) => [
    a.phase,
    a.name,
  ]);
  function liveActivities() {
    try {
      const a = JSON.parse(
        app.UTGStorage.rawGet("gever-art-v3-config") || "{}",
      ).activities;
      return Array.isArray(a) ? a : app.UTGDefaults.baseline().v3.activities;
    } catch {
      return app.UTGDefaults.baseline().v3.activities;
    }
  }
  const options = [
    "Nicht erforderlich",
    "ART",
    "ART + ISCeco",
    "ISCeco",
    "Shared Team ISCeco",
    "Linienorganisation",
    "BIT / anderer LE",
    "ART + anderer LE",
    "Noch zu klären",
  ];
  const defaultFor = (phase, name) =>
    phase === "Funnel"
      ? "ART"
      : phase === "Analyzing"
        ? "ART"
        : phase === "Backlog"
          ? "ART + ISCeco"
          : phase === "Implementing"
            ? "ART + ISCeco"
            : phase === "Validating"
              ? name === "Integrationstests"
                ? "Shared Team ISCeco"
                : "ART + ISCeco"
              : phase === "Deploying & Releasing"
                ? "ISCeco"
                : phase === "Done"
                  ? "ART"
                  : "ISCeco";
  const uid = () =>
    String(Date.now()) + "-" + Math.random().toString(36).slice(2, 8);
  const makeTeam = (name) => ({
    id: uid(),
    name,
    description: "",
    assignments: Object.fromEntries(
      activities.map(([p, n]) => [
        n,
        { owner: defaultFor(p, n), accountable: "", note: "" },
      ]),
    ),
  });
  let state;
  try {
    const v = JSON.parse(app.UTGStorage.rawGet(KEY));
    state = validate(v) ? v : app.UTGDefaults.baseline().v2;
  } catch {
    state = app.UTGDefaults.baseline().v2;
  }
  function validate(v) {
    return (
      v &&
      Array.isArray(v.teams) &&
      v.teams.every(
        (t) =>
          typeof t.id === "string" &&
          typeof t.name === "string" &&
          t.assignments &&
          typeof t.assignments === "object",
      )
    );
  }
  if (!state.teams.some((t) => t.id === state.selected))
    state.selected = state.teams[0]?.id || null;
  const $ = (id) => document.getElementById(id);
  function esc(v) {
    return String(v ?? "").replace(
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
  }
  function persist() {
    try {
      app.UTGStorage.rawSet(KEY, JSON.stringify(state));
      window.dispatchEvent(new Event("utg:teams-changed"));
      $("status").textContent =
        "Lokal gespeichert · " + new Date().toLocaleTimeString("de-CH");
    } catch {
      $("status").textContent =
        "Speichern fehlgeschlagen – Konfiguration als Datei sichern";
    }
  }
  const modelEvents = [
    ["Funnel", "Portfolio Board / POM Board"],
    ["Analyzing", "Feature Refinement · Architecture Sync"],
    ["Backlog", "PI Planning · Priorisierung"],
    ["Implementing", "Team Planning · Daily · ART Sync · System Demo"],
    ["Validating", "ART Sync · System Demo · Testkoordination"],
    ["Deploying & Releasing", "Release Readiness / Go-No-Go"],
    ["Done", "Inspect & Adapt · Flow Review · Nutzenbewertung"],
  ];
  const modelPipeline = [
    ["Continuous Exploration", "Funnel · Analyzing · Backlog"],
    ["Continuous Integration", "Implementing · frühe Tests"],
    ["Continuous Deployment", "Validating · technische Bereitstellung"],
    ["Release on Demand", "Fachliche Freigabe · Nutzen"],
  ];
  function providerClass(v) {
    if (v === "Nicht erforderlich") return "none";
    if (v === "Noch zu klären" || !v) return "unknown";
    const kind = app.UTGModels.providerKind(currentV3(), v);
    return { art: "art", joint: "joint", shared: "shared" }[kind] || "le";
  }
  function providerLabel(v) {
    return (
      {
        ART: "ART",
        "ART + ISCeco": "ART + ISCeco",
        "ART + anderer LE": "ART + LE",
        ISCeco: "ISCeco",
        "Shared Team ISCeco": "Shared ISCeco",
        Linienorganisation: "Linie",
        "BIT / anderer LE": "BIT / LE",
        "Nicht erforderlich": "–",
        "Noch zu klären": "Offen",
      }[v] ||
      v ||
      "Offen"
    );
  }
  function currentV3() {
    try {
      return JSON.parse(app.UTGStorage.rawGet("gever-art-v3-config") || "null");
    } catch {
      return null;
    }
  }
  function v3Assignment(teamId, activity) {
    const v = currentV3();
    const product = document.getElementById("v3product")?.value || v?.product;
    const entry = (
      v?.configs?.[teamId + "::flow"] || v?.configs?.[teamId + "::" + product]
    )?.entries?.[activity];
    if (!entry) return "Noch zu klären";
    return app.UTGModels.effective(v, entry).org;
  }
  function renderModel() {
    const target = $("model-content");
    if (!target) return;
    const selector = $("model-view");
    const previous = selector.value;
    selector
      .querySelectorAll("option[data-model-team]")
      .forEach((o) => o.remove());
    const anchor = selector.querySelector('option[value="team"]');
    state.teams.forEach((tm) => {
      const option = document.createElement("option");
      option.value = "team:" + tm.id;
      option.textContent = tm.name;
      option.dataset.modelTeam = "1";
      selector.querySelector('option[value="all"]').before(option);
    });
    selector.value = previous;
    if (selector.selectedIndex < 0) selector.value = "reference";
    const view = selector.value.startsWith("team:") ? "team" : selector.value;
    const activeId = selector.value.startsWith("team:")
      ? selector.value.slice(5)
      : document.getElementById("v3team")?.value || state.selected;
    const t = state.teams.find((x) => x.id === activeId);
    const renderStageCells = (secondaryOnly) =>
      stages
        .map((stage, i) => {
          const tasks = liveActivities()
            .filter((a) =>
              secondaryOnly
                ? a.phase !== stage &&
                  (a.additionalPhases || []).includes(stage)
                : a.phase === stage,
            )
            .map((a) => [a.phase, a.name, a.phase !== stage]);
          let body = "";
          if (view === "reference") {
            body =
              "<ul>" +
              tasks
                .map(
                  ([p, n, secondary]) =>
                    "<li>" +
                    esc(n) +
                    (secondary ? " <small>begleitend</small>" : "") +
                    "</li>",
                )
                .join("") +
              "</ul>";
          } else if (view === "team") {
            body =
              "<ul>" +
              tasks
                .map(([p, n, secondary]) => {
                  const owner = t ? v3Assignment(t.id, n) : "Noch zu klären";
                  return (
                    "<li><span>" +
                    esc(n) +
                    (secondary ? " (begleitend)" : "") +
                    '</span><span class="provider ' +
                    providerClass(owner) +
                    '">' +
                    esc(providerLabel(owner)) +
                    "</span></li>"
                  );
                })
                .join("") +
              "</ul>";
          } else {
            body =
              "<ul>" +
              tasks
                .map(([p, n, secondary]) => {
                  const counts = {};
                  state.teams.forEach((tm) => {
                    const v = v3Assignment(tm.id, n);
                    counts[v] = (counts[v] || 0) + 1;
                  });
                  return (
                    "<li><span>" +
                    esc(n) +
                    (secondary ? " (begleitend)" : "") +
                    "</span><small>" +
                    Object.entries(counts)
                      .map(([k, v]) => esc(providerLabel(k)) + ": " + v)
                      .join(" · ") +
                    "</small></li>"
                  );
                })
                .join("") +
              "</ul>";
          }
          return (
            '<article class="flow-col"><div class="flow-step"><strong>' +
            esc(stage) +
            '</strong></div><div class="flow-tasks">' +
            body +
            '</div><div class="flow-quality"><div class="app-activity-description"><span class="app-description-text" id="flow-criterion-' +
            (secondaryOnly ? "secondary-" : "primary-") +
            i +
            '">' +
            esc(app.UTGModels.policyCriterion(currentV3(), stage)) +
            '</span><button type="button" class="app-description-toggle" aria-label="Beschreibung aufklappen" aria-expanded="false" aria-controls="flow-criterion-' +
            (secondaryOnly ? "secondary-" : "primary-") +
            i +
            '" hidden>+</button></div></div></article>'
          );
        })
        .join("");
    const cells = renderStageCells(false);
    const secondaryCells = renderStageCells(true);
    const cross = liveActivities().filter((a) => a.phase === "Übergreifend");
    const crossHtml =
      '<section class="utg-cross-cutting utg-model-card"><h3>Übergreifende Tätigkeiten <button type="button" class="app-context-info" aria-label="Info: Übergreifende Tätigkeiten" data-info="Diese Tätigkeiten gelten über den gesamten Flow hinweg und sind keiner einzelnen Flow-Phase zugeordnet. Welche Tätigkeiten hier erscheinen, legst du unter Konfiguration → Tätigkeiten verwalten mit der primären Phase «Übergreifend» fest. Die Leistungszuordnungen je Team pflegst du in der zentralen Leistungsmatrix.">i</button></h3><div class="summary">' +
      cross
        .map(
          (a) =>
            '<span class="stat">' +
            esc(a.name) +
            " <small>(" +
            esc(a.type || "Übergreifend") +
            ")</small></span>",
        )
        .join("") +
      "</div></section>";
    const heading =
      view === "reference"
        ? "SAFe-Referenzsicht"
        : view === "team"
          ? "Primäre Tätigkeiten · " + esc(t?.name || "Kein Team ausgewählt")
          : "ART-Gesamtsicht · " + state.teams.length + " Teams";
    target.innerHTML =
      '<section class="utg-model-card"><div class="model-subhead"><strong>' +
      heading +
      '</strong><span class="muted">Feature Kanban · Werte aus der zentralen Team-Leistungsmatrix · nicht zugewiesene Tätigkeiten: Noch zu klären</span></div>' +
      '<div class="flow-scroll"><div class="flow-grid">' +
      cells +
      '</div></div></section><section class="utg-model-card"><div class="utg-secondary-heading"><strong>Begleitende Tätigkeiten</strong><span class="muted">Begleitende Wirkung – keine zusätzlichen Flow-Schritte oder Tätigkeiten</span></div><div class="flow-scroll"><div class="flow-grid utg-secondary-grid">' +
      secondaryCells +
      "</div></div></section>" +
      crossHtml +
      '<div class="model-legend"><span><i class="dot art"></i>ART</span><span><i class="dot joint"></i>Gemeinsam</span><span><i class="dot shared"></i>Shared Service</span><span><i class="dot le"></i>LE / Linie</span><span><i class="dot unknown"></i>Offen</span></div>';
  }
  document
    .getElementById("model-view")
    ?.addEventListener("change", () => renderModel());
  app.addEventListener("gever-v3-updated", () => renderModel());
  app.addEventListener("storage", (event) => {
    if (event.key !== null && !["gever-art-v3-config", KEY].includes(event.key))
      return;
    if (event.key === null || event.key === KEY) {
      try {
        const next = JSON.parse(app.UTGStorage.rawGet(KEY) || "null");
        state = validate(next) ? next : { teams: [], selected: null };
      } catch {
        state = { teams: [], selected: null };
      }
    }
    renderModel();
  });
  function render() {
    renderModel();
  }
  async function saveConfiguration() {
    persist();
    const filename =
      "GEVER_ART_Leistungsmatrix_" +
      new Date().toISOString().slice(0, 10) +
      ".json";
    const content = JSON.stringify(
      { schemaVersion: 1, exportedAt: new Date().toISOString(), ...state },
      null,
      2,
    );
    if (typeof window.showSaveFilePicker === "function") {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: filename,
          types: [
            {
              description: "Konfigurationsdatei",
              accept: { "application/json": [".json"] },
            },
          ],
        });
        const writable = await handle.createWritable();
        await writable.write(content);
        await writable.close();
        $("status").textContent = "Datei gespeichert · " + handle.name;
        return;
      } catch (err) {
        if (err.name === "AbortError") return;
        console.warn("Dateidialog nicht verfügbar, verwende Download:", err);
      }
    }
    const blob = new Blob([content], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    $("status").textContent =
      "Download gestartet · Konfiguration · Speicherort ggf. in Browser-Einstellungen wählen";
  }
  app.addEventListener("utg:teams-changed", () => {
    try {
      const next = JSON.parse(app.UTGStorage.rawGet(KEY) || "null");
      if (validate(next)) state = next;
    } catch (e) {
      console.warn(e);
    }
    render();
  });
  render();
}
