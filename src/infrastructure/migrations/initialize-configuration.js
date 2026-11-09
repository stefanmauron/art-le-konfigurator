export function initialize(app, browser = globalThis) {
  (function () {
    "use strict";
    const key = "gever-art-v3-config",
      base = app.UTGDefaults.baseline().v3;
    try {
      const current = JSON.parse(app.UTGStorage.rawGet(key) || "null");
      if (!current || current.schema !== 3) return;
      // Migration is idempotent: never overwrite a user's subsequent mapping edits.
      if (current.methodVersion === "3.9.10") return;
      const reference = new Map(base.activities.map((a) => [a.id, a]));
      current.activities = (current.activities || base.activities).map((a) => {
        const b = reference.get(a.id);
        if (!b) return a;
        return {
          ...a,
          type: a.type || b.type,
          description: a.description ?? b.description,
          additionalPhases: Array.isArray(a.additionalPhases)
            ? a.additionalPhases
            : b.additionalPhases,
          phase: a.phase || b.phase,
        };
      });
      current.methodVersion = "3.10.0";
      app.UTGStorage.rawSet(key, JSON.stringify(current));
    } catch (e) {
      console.warn("Methodik-Migration:", e);
    }
  })();
}
