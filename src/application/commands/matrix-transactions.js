export function initialize(app, browser = globalThis) {
  const window = browser;
  (() => {
    "use strict";
    const KEY = "gever-art-v3-config",
      TEAMS = "gever-art-leistungsmatrix-v1";
    const clone = (v) => structuredClone(v),
      same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    function latest() {
      const data = app.UTGStorage.read(KEY);
      if (!data || data.schema !== 3)
        throw Error("Die Konfiguration ist nicht verfügbar.");
      return data;
    }
    function teamList() {
      return app.UTGStorage.read(TEAMS)?.teams || [];
    }
    function flow(data, id, seed) {
      if (data.configs?.[id + "::flow"]) return data.configs[id + "::flow"];
      const team = teamList().find((t) => t.id === id);
      for (const pid of team?.productIds || [])
        if (data.configs?.[id + "::" + pid])
          return data.configs[id + "::" + pid];
      const proposal = clone(seed);
      for (const entry of Object.values(proposal?.entries || {}))
        if (entry.service && !app.UTGModels.resolveService(data, entry.service))
          entry.service = "";
      return proposal;
    }
    function checkTeam(id) {
      if (!teamList().some((t) => t.id === id))
        throw Error(
          "Dieses Team wurde inzwischen entfernt. Bitte die Ansicht aktualisieren.",
        );
    }
    function write(candidate) {
      candidate.updated = new Date().toISOString();
      app.UTGModels.normalizeServiceReferences(candidate);
      const bundle = app.UTGStorage.bundle();
      bundle.v3 = candidate;
      app.UTGStorage.validateBundle(bundle);
      app.UTGStorage.write(KEY, candidate);
      window.dispatchEvent(new Event("gever-v3-updated"));
      return candidate;
    }
    function saveField(
      id,
      activity,
      field,
      value,
      expected,
      seed,
      wasPresent = true,
    ) {
      checkTeam(id);
      const data = latest();
      if (!(data.activities || []).some((a) => a.name === activity))
        throw Error(
          "Diese Tätigkeit wurde inzwischen geändert. Bitte die Ansicht aktualisieren.",
        );
      if (
        ![
          "org",
          "embedding",
          "interaction",
          "business",
          "technical",
          "operations",
          "service",
          "note",
        ].includes(field)
      )
        throw Error("Unbekanntes Matrixfeld.");
      if (
        field === "service" &&
        value &&
        !app.UTGModels.resolveService(data, value)
      )
        throw Error(
          "Der gewählte LE-Service ist nicht mehr vorhanden. Bitte eine verfügbare Leistung auswählen.",
        );
      const current = flow(data, id, seed),
        before = expected || {},
        exists = Object.hasOwn(current.entries || {}, activity);
      if (wasPresent && !exists)
        throw Error(
          "Diese Zuordnung wurde inzwischen entfernt. Bitte die Ansicht aktualisieren.",
        );
      const entry = exists ? current.entries[activity] : before;
      if (
        !same(entry[field], before[field]) ||
        (field === "org" && !same(entry.orgSource, before.orgSource))
      )
        throw Error(
          "Dieses Feld wurde inzwischen geändert. Bitte die Ansicht aktualisieren und die Änderung erneut prüfen.",
        );
      const candidate = clone(data);
      candidate.configs ??= {};
      candidate.configs[id + "::flow"] = clone(current);
      candidate.configs[id + "::flow"].entries ??= {};
      const target = (candidate.configs[id + "::flow"].entries[activity] ??=
        clone(before));
      target[field] = value;
      if (field === "org")
        target.orgSource = value === "" ? "service" : "explicit";
      return write(candidate);
    }
    function saveStatus(id, status, expected, seed, basis) {
      checkTeam(id);
      const data = latest(),
        current = flow(data, id, seed);
      if (current.status !== expected)
        throw Error(
          "Der Vereinbarungsstatus wurde inzwischen geändert. Bitte die Ansicht aktualisieren.",
        );
      const candidate = clone(data);
      candidate.configs ??= {};
      candidate.configs[id + "::flow"] = clone(current);
      app.UTGModels.normalizeServiceReferences(candidate);
      if (
        basis &&
        app.UTGAgreement.signature(candidate, id, teamList()) !== basis
      )
        throw Error(
          "Die Vereinbarung wurde seit der Anzeige geändert. Bitte die Ansicht aktualisieren und erneut prüfen.",
        );
      return write(app.UTGAgreement.confirm(candidate, id, status, teamList()));
    }
    app.UTGMatrix = Object.freeze({ saveField, saveStatus });
  })();
}
