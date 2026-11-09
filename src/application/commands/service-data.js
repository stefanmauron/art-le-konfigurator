export function initialize(app, browser = globalThis) {
  const window = browser;
  (() => {
    "use strict";
    const key = "gever-art-v3-config",
      normal = (name) =>
        String(name || "")
          .trim()
          .toLocaleLowerCase("de-CH");
    const references = (data, service) => {
      const matches = (value) =>
        app.UTGModels.resolveService(data, value)?.id === service.id;
      return {
        matches,
        flows: Object.values(data.configs || {})
          .flatMap((c) => Object.values(c.entries || {}))
          .filter((e) => matches(e.service)),
        activities: (data.activities || []).filter((a) => matches(a.service)),
      };
    };
    function update(data, id, patch) {
      const next = app.UTGModels.normalizeServiceReferences(
          structuredClone(data),
        ),
        service = next.services.find((s) => s.id === id);
      if (!service) throw Error("Dieser LE-Service wurde inzwischen entfernt.");
      const name = String(patch.name ?? service.name).trim();
      if (!name) throw Error("Bitte einen Namen eingeben.");
      if (
        next.services.some(
          (s) => s.id !== id && normal(s.name) === normal(name),
        )
      )
        throw Error("Dieser Name ist bereits vorhanden.");
      Object.assign(service, patch, { name });
      if (patch.provider) {
        next.providers ??= [];
        if (!next.providers.includes(patch.provider))
          next.providers.push(patch.provider);
      }
      return next;
    }
    function remove(data, id) {
      const next = app.UTGModels.normalizeServiceReferences(
          structuredClone(data),
        ),
        service = next.services.find((s) => s.id === id);
      if (!service) throw Error("Dieser LE-Service wurde inzwischen entfernt.");
      const refs = references(next, service);
      for (const entry of [...refs.flows, ...refs.activities])
        entry.service = "";
      next.services = next.services.filter((s) => s.id !== id);
      return next;
    }
    function commit(next) {
      app.UTGModels.normalizeServiceReferences(next);
      next.updated = new Date().toISOString();
      app.UTGStorage.rawSet(key, JSON.stringify(next));
      window.dispatchEvent(new Event("gever-v3-updated"));
      window.dispatchEvent(new Event("utg-catalog-changed"));
      return next;
    }
    app.UTGServiceData = { references, update, remove, commit };
  })();
}
