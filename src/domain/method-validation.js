export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    const valid = (v) =>
      !!String(v ?? "").trim() &&
      !/^(Noch zu klären|Noch zu vereinbaren|Nicht definiert|Nicht zugewiesen)$/i.test(
        String(v).trim(),
      );
    app.UTGMethodValidation = {
      validate(d) {
        const issues = [],
          activities = d?.activities || [],
          services = d?.services || [];
        const phases = new Set(app.UTGFlow.states);
        const add = (category, message) =>
          issues.push({
            category,
            message,
            severity:
              category === "Referenz" || category === "Zuordnung"
                ? "Fehler"
                : category === "Methodik"
                  ? "Warnung"
                  : "Empfehlung",
          });
        for (const a of activities) {
          const name = a.name || "(ohne Namen)",
            extra = a.additionalPhases || [];
          if (a.phase === "Backlog")
            add("Methodik", "Backlog als primäre Bearbeitungsphase: " + name);
          if (a.phase !== "Übergreifend" && !phases.has(a.phase))
            add(
              "Methodik",
              "Unbekannte primäre Flow-Phase: " + name + " (" + a.phase + ")",
            );
          if (extra.includes("Backlog"))
            add(
              "Methodik",
              "Backlog als begleitende Bearbeitungsphase: " + name,
            );
          if (extra.includes(a.phase))
            add("Methodik", "Doppelte Phasenzuordnung: " + name);
          for (const x of extra)
            if (!phases.has(x))
              add(
                "Methodik",
                "Unbekannte begleitende Flow-Phase: " + name + " (" + x + ")",
              );
          if (a.phase === "Übergreifend" && extra.length)
            add(
              "Methodik",
              "Übergreifende Tätigkeit mit begleitenden Flow-Phasen: " + name,
            );
          if (a.service && !app.UTGModels.resolveService(d, a.service))
            add(
              "Referenz",
              "Unbekannter LE-Service im Tätigkeitskatalog: " + name,
            );
        }
        for (const [key, config] of Object.entries(d?.configs || {})) {
          if (!key.endsWith("::flow")) continue;
          for (const [name, e] of Object.entries(config.entries || {})) {
            if (e.service && !app.UTGModels.resolveService(d, e.service))
              add(
                "Referenz",
                key +
                  ": unbekannter LE-Service bei " +
                  name +
                  " (" +
                  e.service +
                  ")",
              );
            if (!valid(app.UTGModels.effective(d, e).org))
              add("Zuordnung", key + ": Ausführung offen für " + name);
          }
        }
        for (const svc of services)
          if (!valid(svc.provider))
            add("Service", "Anbieter fehlt: " + svc.name);
        return [
          ...new Map(
            issues.map((x) => [x.category + "|" + x.message, x]),
          ).values(),
        ];
      },
    };
  })();
}
