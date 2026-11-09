export function initialize(app, browser = globalThis) {
  (function () {
    "use strict";
    const KEY = "gever-art-v3-config";
    const states = app.UTGFlow.states;
    const mapPhase = (p) =>
      p === "Reviewing" ? "Funnel" : p === "Ready" ? "Backlog" : p;
    function migrate(data) {
      if (!data || typeof data !== "object") return data;
      if (data.flowSchema === "seven-states-v1") return data;
      for (const a of data.activities || []) {
        a.phase = mapPhase(a.phase);
        if (Array.isArray(a.additionalPhases))
          a.additionalPhases = [
            ...new Set(a.additionalPhases.map(mapPhase)),
          ].filter((p) => p !== a.phase && states.includes(p));
      }
      const source = Array.isArray(data.policies) ? data.policies : [];
      const funnel = source.find((p) => p.name === "Funnel") || {};
      const review = source.find((p) => p.name === "Reviewing") || {};
      const analyzing = source.find((p) => p.name === "Analyzing") || {};
      const ready = source.find((p) => p.name === "Ready") || {};
      const criteria = {
        Funnel: "Bedarf, Nutzen und Zuständigkeit für die Analyse geklärt",
        Analyzing:
          "Akzeptanzkriterien, Lösungsansatz und LE-Abhängigkeiten geklärt",
        Backlog:
          "Priorisiert und zur Umsetzung bereit; erforderliche Zusagen liegen vor",
        Implementing: "Build und frühe Testnachweise vorhanden",
        Validating: "Integration, Security und End-to-End-Tests nachgewiesen",
        "Deploying & Releasing":
          "Freigabe, Rollback und Betriebsbereitschaft geklärt",
        Done: "Done-Kriterien erfüllt; Wirkungsmessung erfolgt nachgelagert",
      };
      data.policies = states.map((name, i) => {
        const original =
          name === "Backlog"
            ? ready
            : source.find((p) => p.name === name) || {};
        const p = { ...original, name, id: "FP-" + (i + 1) };
        if (name === "Funnel") p.exit = criteria.Funnel;
        else if (name === "Analyzing") p.exit = criteria.Analyzing;
        else if (name === "Backlog") p.exit = criteria.Backlog;
        else if (!p.exit) p.exit = criteria[name];
        p.type = name === "Done" ? "Abschluss" : "Übergang";
        if (name === "Backlog")
          p.description =
            p.description ||
            "Priorisierte, vorbereitete Arbeit wartet auf verfügbare Umsetzungskapazität.";
        return p;
      });
      // Preserve the old policies as a recoverable snapshot for existing user configurations.
      if (source.length) data.previousEightStatePolicies = source;
      data.flowSchema = "seven-states-v1";
      return data;
    }
    app.UTGFlow7 = { states, migrate };
    try {
      const stored = app.UTGStorage.rawGet(KEY);
      if (stored) {
        const d = JSON.parse(stored);
        if (d.flowSchema !== "seven-states-v1")
          app.UTGStorage.rawSet(KEY, JSON.stringify(migrate(d)));
      }
    } catch (e) {
      console.warn("Flow-Migration fehlgeschlagen", e);
    }
    app.addEventListener("gever-v3-updated", () => {
      try {
        const raw = app.UTGStorage.rawGet(KEY);
        if (!raw) return;
        const d = JSON.parse(raw);
        if (d.flowSchema !== "seven-states-v1")
          app.UTGStorage.rawSet(KEY, JSON.stringify(migrate(d)));
      } catch (e) {
        console.warn("Flow-Abgleich", e);
      }
    });
  })();
}
