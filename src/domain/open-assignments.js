export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    function evaluate(d, team, name) {
      const entries =
        d?.configs?.[team.id + "::flow"]?.entries ||
        (() => {
          const ids = Array.isArray(team.productIds) ? team.productIds : [];
          for (const id of ids) {
            const c = d?.configs?.[team.id + "::" + id];
            if (c?.entries) return c.entries;
          }
          return {};
        })();
      const entry = entries[name] || {};
      const service = app.UTGModels.resolveService(d, entry.service);
      const org = String(app.UTGModels.effective(d, entry).org).trim();
      const embedding = String(
        entry.embedding || service?.embedding || "",
      ).trim();
      const kind =
        app.UTGModels.providerKind?.(d, org) ||
        (org === "ART" || org === "UTG-ART"
          ? "art"
          : org === "ISCeco"
            ? "isceco"
            : "other");
      const bucket =
        org === "Nicht erforderlich"
          ? 5
          : !org || org === "Noch zu klären"
            ? 4
            : kind === "art"
              ? 0
              : kind === "isceco"
                ? 1
                : 3;
      const isShared =
        bucket !== 4 &&
        bucket !== 5 &&
        app.UTGModels.embeddingKind(d, embedding) === "shared";
      return { bucket, org, entry, isShared };
    }
    app.UTGOpenAssignments = { evaluate };
  })();
}
