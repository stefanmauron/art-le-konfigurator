export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    const valid = (x) =>
      typeof x === "string" &&
      !!x.trim() &&
      !/^(Noch zu klären|Noch zu vereinbaren|Nicht definiert|Nicht zugewiesen)$/i.test(
        x.trim(),
      );
    function validate(teamsData, data, detailed = false) {
      const targets = new Map(),
        issues = [],
        states = app.UTGFlow.states,
        teams = Array.isArray(teamsData?.teams) ? teamsData.teams : [],
        d = data || {},
        policies = Array.isArray(d.policies) ? d.policies : [];
      const add = (scope, message) =>
        issues.push({
          message: scope + " · " + message,
          target: targets.get(scope) || {
            kind: "config",
            section: "crud-management",
          },
        });
      if (!teams.length) add("Grundkonfiguration", "Keine Teams konfiguriert.");
      if (!Array.isArray(d.products) || !d.products.length)
        add("Grundkonfiguration", "Keine Produkte konfiguriert.");
      for (const stage of states) {
        targets.set(stage, { kind: "policy", stage });
        const matches = policies.filter((p) => p?.name === stage);
        if (!matches.length) {
          add(stage, "Flow-Regel fehlt.");
          continue;
        }
        if (matches.length > 1) add(stage, "Flow-Regel mehrfach vorhanden.");
        for (const p of matches) {
          if (!valid(p.exit)) add(stage, "Kriterium / Vereinbarung fehlt.");
          if (
            !["Übergang", "Ausführung", "Schnittstelle", "Abschluss"].includes(
              p.type,
            )
          )
            add(stage, "Policy-Typ fehlt oder ist unbekannt.");
        }
      }
      for (const p of policies)
        if (!states.includes(p?.name))
          add("Flow-Regeln", "Unbekannte Phase: " + (p?.name || "ohne Namen"));
      for (const service of Array.isArray(d.services) ? d.services : []) {
        const scope = "LE-Service " + (service?.name || "ohne Namen");
        targets.set(scope, { kind: "service", id: service?.id });
        if (!valid(service?.provider)) add(scope, "Anbieter offen.");
      }
      function list(items, scope, allowed, route) {
        if (!Array.isArray(items)) {
          add(scope, "Kriterienliste fehlt oder ist ungültig.");
          return [];
        }
        const ids = new Set();
        for (const c of items) {
          if (!c || typeof c !== "object") {
            add(scope, "Ungültiger Kriterieneintrag.");
            continue;
          }
          const itemScope = route ? route(c) : scope;
          const label = valid(c.description)
            ? c.description.slice(0, 70)
            : "Kriterium ohne Beschreibung";
          if (!valid(c.id) || ids.has(c.id))
            add(itemScope, "Fehlende oder doppelte Kriterien-ID: " + label);
          ids.add(c.id);
          if (!allowed.includes(c.type))
            add(itemScope, "Unpassende Kriterienart: " + label);
          if (!valid(c.description)) add(itemScope, "Beschreibung fehlt.");
          if (!valid(c.owner))
            add(itemScope, "Verantwortliche Rolle fehlt: " + label);
          if (!valid(c.evidence))
            add(itemScope, "Erwarteter Nachweis fehlt: " + label);
        }
        return items.filter((c) => c && typeof c === "object");
      }
      function profile(p, scope, team = "") {
        targets.set(scope, { kind: "policy", stage: "Funnel", team });
        targets.set(scope + " · AC", {
          kind: "criteria",
          stage: "Analyzing",
          team,
          type: "AC",
        });
        for (const type of ["DoR", "DoD"])
          targets.set(scope + " · Team-" + type, {
            kind: "criteria",
            stage: "Funnel",
            team,
            type,
          });
        for (const stage of states) {
          const target = { kind: "criteria", stage, team, type: "Phase" };
          targets.set(scope + " · " + stage, target);
          targets.set(scope + " · " + stage + " · Eintritt & Übergang", target);
          targets.set(scope + " · " + stage + " · Phasenkriterien", {
            kind: "criteria",
            stage,
            team,
            type: "Phase",
          });
        }
        if (!p || typeof p !== "object") {
          add(scope, "Kriterienkatalog fehlt.");
          return;
        }
        for (const [field, type] of [
          ["commonDoR", "DoR"],
          ["commonDoD", "DoD"],
        ]) {
          const items = list(p[field], scope + " · Team-" + type, [type]);
          if (Array.isArray(p[field]) && !items.length)
            add(scope + " · Team-" + type, "Keine Kriterien vereinbart.");
        }
        let acCount = 0;
        for (const stage of states) {
          const prefix = scope + " · " + stage,
            items = list(
              p.phaseGates?.[stage],
              prefix + " · Eintritt & Übergang",
              ["Eintritt", "Übergang", "Abschluss"],
            );
          if (Array.isArray(p.phaseGates?.[stage])) {
            if (!items.some((c) => c.type === "Eintritt"))
              add(prefix, "Eintrittskriterium fehlt.");
            if (
              !items.some(
                (c) => c.type === (stage === "Done" ? "Abschluss" : "Übergang"),
              )
            )
              add(
                prefix,
                stage === "Done"
                  ? "Abschlusskriterium fehlt."
                  : "Übergangskriterium fehlt.",
              );
          }
          const rule = p.rules?.[stage];
          if (!rule) {
            add(prefix, "Phasenbezogener Kriterienbereich fehlt.");
            continue;
          }
          const visible = Array.isArray(rule.criteria)
            ? rule.criteria.filter((c) => !["DoR", "DoD"].includes(c?.type))
            : rule.criteria;
          const all = list(
            visible,
            prefix + " · Phasenkriterien",
            [
              "Aufnahme",
              "AC",
              "Release / Betrieb",
              "Schnittstelle",
              "Wirkung",
              "Flow-Steuerung",
              "Eintritt",
              "Übergang",
              "Abschluss",
            ],
            (c) => {
              const criterionScope = prefix + " · Phasenkriterien · " + c.id;
              targets.set(criterionScope, {
                kind: "criteria",
                stage,
                team,
                type: c.type === "AC" ? "AC" : "Phase",
              });
              return criterionScope;
            },
          );
          acCount += all.filter((c) => c.type === "AC").length;
        }
        if (!acCount)
          add(
            scope + " · AC",
            "Keine Akzeptanzkriterien oder AC-Vorlagen in den Flow-Regeln vorhanden. AC sind arbeitselementspezifisch; sie müssen nicht in jeder Phase erneut erfasst werden.",
          );
      }
      const f = d.flowCriteria;
      profile(f, "Standardvorlage");
      for (const team of teams)
        profile(
          f?.profiles?.[team.id],
          "Team " + (team.name || team.id),
          team.id,
        );
      issues.push(...app.UTGFlowStandard.issues(d));
      const unique = [
        ...new Map(
          issues.map((issue) => [
            issue.message + "|" + JSON.stringify(issue.target),
            issue,
          ]),
        ).values(),
      ];
      return detailed
        ? unique
        : [...new Set(unique.map((issue) => issue.message))];
    }
    app.UTGOperatingModelReview = Object.freeze({ validate });
  })();
}
