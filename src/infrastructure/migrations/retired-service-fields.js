export function initialize(app, browser = globalThis) {
  (function () {
    "use strict";
    const key = app.UTGStorage.keys.config;
    const d = app.UTGStorage.read(key);
    if (!d || !Array.isArray(d.activities)) return;
    let changed = false;
    d.legacyArchive ??= {};
    d.legacyArchive.retiredServiceFields ??= {};
    for (const svc of d.services || []) {
      if ("capacity" in svc || "criteria" in svc) {
        d.legacyArchive.retiredServiceFields[svc.id || svc.name] = {
          capacity: svc.capacity,
          criteria: svc.criteria,
        };
        delete svc.capacity;
        delete svc.criteria;
        changed = true;
      }
    }
    d.migrations ??= {};
    if (!d.migrations.activityCatalog3110) {
      d.migrations.activityCatalog3110 = true;
      changed = true;
    }
    if (changed) {
      d.schema = 3;
      d.modelVersion = app.UTGVersion;
      app.UTGStorage.write(key, d);
    }
  })();
}
