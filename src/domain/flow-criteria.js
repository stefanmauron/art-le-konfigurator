export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    const stages = app.UTGFlow.states;
    const types = [
      "Aufnahme",
      "AC",
      "DoR",
      "DoD",
      "Release / Betrieb",
      "Schnittstelle",
      "Wirkung",
      "Flow-Steuerung",
      "Eintritt",
      "Übergang",
      "Abschluss",
    ];
    const criterion = (id, type, description, owner, evidence) => ({
      id,
      type,
      description,
      owner,
      evidence,
    });
    function legacyDefaults() {
      return {
        version: 1,
        commonDoD: [
          criterion(
            "dod-quality",
            "DoD",
            "Ergebnis integriert, geprüft und dokumentiert; relevante Qualitätsanforderungen erfüllt.",
            "Team",
            "Test-, Review- und Dokumentationsnachweise",
          ),
          criterion(
            "dod-security",
            "DoD",
            "Anwendbare Anforderungen an Security, Datenschutz, Barrierefreiheit und Performance nachgewiesen.",
            "Team / zuständige Fachrollen",
            "Prüfnachweise gemäss vereinbartem Schutz- und Qualitätsbedarf",
          ),
        ],
        rules: Object.fromEntries(
          stages.map((name, i) => [
            name,
            {
              useDoD: [3, 4, 6].includes(i),
              criteria: [
                [
                  criterion(
                    "intake",
                    "Aufnahme",
                    "Bedarf, erwarteter Nutzen und Zuständigkeit für die Analyse sind geklärt.",
                    "Product Management / Product Owner",
                    "Dokumentierter Bedarf mit Nutzen und zuständiger Person",
                  ),
                ],
                [
                  criterion(
                    "ac",
                    "AC",
                    "Akzeptanzkriterien je Feature oder Story sind verständlich und überprüfbar beschrieben.",
                    "Product Owner / Team",
                    "Verweis auf AC im Backlog-Werkzeug",
                  ),
                  criterion(
                    "impact",
                    "Wirkung",
                    "Zielgrösse, Messverantwortung und Messzeitpunkt sind festgelegt.",
                    "Product Management / Product Owner",
                    "Vereinbarte Wirkungshypothese und Messplan",
                  ),
                ],
                [
                  criterion(
                    "ready",
                    "DoR",
                    "Ziel und AC sind verstanden; Abhängigkeiten und erforderliche Zusagen sind geklärt.",
                    "Team / Product Owner",
                    "Gemeinsame Bereitschaftsentscheidung zum Umsetzungsstart",
                  ),
                ],
                [
                  criterion(
                    "flow",
                    "Flow-Steuerung",
                    "WIP begrenzen und Blockaden mit zuständiger Rolle und Eskalationsweg bearbeiten.",
                    "Team",
                    "Vereinbartes WIP-Limit und Eskalationsweg",
                  ),
                ],
                [
                  criterion(
                    "validate-ac",
                    "AC",
                    "Fachliche Akzeptanzkriterien am integrierten Ergebnis nachgewiesen.",
                    "Product Owner / Team",
                    "Akzeptanz- und Integrationsnachweise",
                  ),
                ],
                [
                  criterion(
                    "release",
                    "Release / Betrieb",
                    "Deployment, Monitoring, Support und Rollback vorbereitet; erforderliche Freigaben liegen vor.",
                    "Release- und Betriebsverantwortliche",
                    "Release- und Betriebsbereitschaftsnachweis",
                  ),
                  criterion(
                    "handover",
                    "Schnittstelle",
                    "Lieferobjekt, empfangende Rolle, Übergabekriterien und Reaktionszeit sind vereinbart.",
                    "Team / beteiligte Leistungserbringer",
                    "Schnittstellenvereinbarung und Übergabenachweis",
                  ),
                ],
                [
                  criterion(
                    "outcome",
                    "Wirkung",
                    "Wirkungsmessung nach Auslieferung zum vereinbarten Zeitpunkt durchführen; Done allein bestätigt keine Wirkung.",
                    "Product Management / Product Owner",
                    "Messresultat oder terminierter Messauftrag",
                  ),
                ],
              ][i],
            },
          ]),
        ),
        teams: {},
      };
    }
    function previousPhaseDefaults() {
      return {
        Funnel: [
          {
            id: "entry-0",
            type: "Eintritt",
            description:
              "Ein Anliegen mit betroffenen Nutzern und einer zuständigen Person liegt vor.",
            owner: "Product Management / Product Owner",
            evidence: "Bedarfseintrag und abgestimmter Analyseauftrag",
          },
          {
            id: "exit-0",
            type: "Übergang",
            description:
              "Bedarf und erwarteter Nutzen sind beschrieben; Analyseverantwortung, Priorität und notwendige Ansprechpartner sind geklärt.",
            owner: "Product Management / Product Owner",
            evidence: "Bedarfseintrag und abgestimmter Analyseauftrag",
          },
        ],
        Analyzing: [
          {
            id: "entry-1",
            type: "Eintritt",
            description:
              "Der Bedarf ist für die Analyse priorisiert; die zuständigen Fach- und Technikrollen sind verfügbar.",
            owner: "Product Owner / Team / Architektur",
            evidence: "Analyseergebnis mit AC und Risikoeinschätzung",
          },
          {
            id: "exit-1",
            type: "Übergang",
            description:
              "Umfang und Lösungsansatz sind abgegrenzt; AC sind formuliert und wesentliche Risiken, Architekturfragen sowie Abhängigkeiten beurteilt.",
            owner: "Product Owner / Team / Architektur",
            evidence: "Analyseergebnis mit AC und Risikoeinschätzung",
          },
        ],
        Backlog: [
          {
            id: "entry-2",
            type: "Eintritt",
            description:
              "Ein ausreichend analysiertes Feature mit Nutzen, Umfang und Abhängigkeiten liegt vor.",
            owner: "Product Owner / Team",
            evidence: "Priorisiertes Backlog und Bereitschaftsentscheidung",
          },
          {
            id: "exit-2",
            type: "Übergang",
            description:
              "Die Arbeit ist priorisiert und erfüllt die vereinbarte Team-DoR; Stories sind ausreichend klein und erforderliche Lieferzusagen liegen vor.",
            owner: "Product Owner / Team",
            evidence: "Priorisiertes Backlog und Bereitschaftsentscheidung",
          },
        ],
        Implementing: [
          {
            id: "entry-3",
            type: "Eintritt",
            description:
              "Das Team hat die Arbeit unter Beachtung seiner DoR und verfügbaren Kapazität zur Umsetzung ausgewählt.",
            owner: "Team",
            evidence: "Review-, Build- und Testnachweise",
          },
          {
            id: "exit-3",
            type: "Übergang",
            description:
              "Änderungen sind geprüft und integriert; Build und relevante frühe Tests sind erfolgreich. Das Ergebnis steht für die integrierte Validierung bereit.",
            owner: "Team",
            evidence: "Review-, Build- und Testnachweise",
          },
        ],
        Validating: [
          {
            id: "entry-4",
            type: "Eintritt",
            description:
              "Ein integriertes, prüfbares Ergebnis sowie vereinbarte Testdaten und Prüfumgebung sind verfügbar.",
            owner: "Product Owner / Team / Fachrollen",
            evidence: "Akzeptanz-, Integrations- und Qualitätsnachweise",
          },
          {
            id: "exit-4",
            type: "Übergang",
            description:
              "AC und relevante Qualitätsanforderungen sind nachgewiesen; Fehler sind nach vereinbarten Regeln behoben oder zulässig behandelt.",
            owner: "Product Owner / Team / Fachrollen",
            evidence: "Akzeptanz-, Integrations- und Qualitätsnachweise",
          },
        ],
        "Deploying & Releasing": [
          {
            id: "entry-5",
            type: "Eintritt",
            description:
              "Das validierte Ergebnis und die benötigten Release- und Betriebsinformationen liegen vor.",
            owner: "Release- und Betriebsverantwortliche / Team",
            evidence: "Release- und Betriebsbereitschaftsnachweis",
          },
          {
            id: "exit-5",
            type: "Übergang",
            description:
              "Deployment und Rollback sind vorbereitet und erforderliche Prüfungen erfolgt; Monitoring, Support und notwendige Freigaben sind geklärt.",
            owner: "Release- und Betriebsverantwortliche / Team",
            evidence: "Release- und Betriebsbereitschaftsnachweis",
          },
        ],
        Done: [
          {
            id: "entry-6",
            type: "Eintritt",
            description:
              "Die vereinbarte Team-DoD ist erfüllt; erforderliche Auslieferungs- und Übergabeschritte sind nachgewiesen.",
            owner: "Product Owner / Team / Product Management",
            evidence: "Abschlussnachweis und terminierter Messauftrag",
          },
          {
            id: "exit-6",
            type: "Übergang",
            description:
              "Das Ergebnis ist abgeschlossen und akzeptiert; Dokumentation und Nachweise sind vollständig. Für die spätere Wirkungsmessung sind Verantwortung und Termin festgelegt.",
            owner: "Product Owner / Team / Product Management",
            evidence: "Abschlussnachweis und terminierter Messauftrag",
          },
        ],
      };
    }
    function phaseDefaults() {
      const gates = previousPhaseDefaults(),
        evidence = [
          "Bedarfseintrag mit Nutzern und zuständiger Person",
          "Priorisierter Analyseauftrag und benannte Fach- und Technikrollen",
          "Analyseergebnis mit Nutzen, Umfang und Abhängigkeiten",
          "Bereitschaftsentscheidung gemäss Team-DoR und verfügbare Kapazität",
          "Integriertes Artefakt sowie verfügbare Testdaten und Prüfumgebung",
          "Validierungsnachweis und vorbereitete Release- und Betriebsinformationen",
          "Erfüllte Team-DoD und Nachweise zur Auslieferung / Übergabe",
        ];
      stages.forEach((stage, i) => {
        gates[stage][0].evidence = evidence[i];
      });
      gates.Done[1].type = "Abschluss";
      return gates;
    }
    function migratePhaseEvidence(profile) {
      const old = previousPhaseDefaults(),
        fresh = phaseDefaults();
      for (const stage of stages) {
        const items = profile.phaseGates?.[stage];
        if (!Array.isArray(items)) continue;
        for (let i = 0; i < old[stage].length; i++) {
          const at = items.findIndex(
            (c) => JSON.stringify(c) === JSON.stringify(old[stage][i]),
          );
          if (at >= 0) items[at] = structuredClone(fresh[stage][i]);
        }
      }
    }
    function defaultsV2() {
      const f = legacyDefaults();
      f.standardRevision = 2;
      f.commonDoD = [
        {
          id: "dod-acceptance",
          type: "DoD",
          description:
            "Die vereinbarten Akzeptanzkriterien sind erfüllt; der Product Owner hat das Ergebnis anhand der Nachweise akzeptiert.",
          owner: "Product Owner / Team",
          evidence: "Akzeptanznachweis am Backlog-Eintrag",
        },
        {
          id: "dod-integration",
          type: "DoD",
          description:
            "Änderungen sind geprüft, versioniert und in den gemeinsamen Stand integriert; ein reproduzierbares, auslieferbares Ergebnis liegt vor.",
          owner: "Team",
          evidence: "Review, erfolgreicher Build und versioniertes Artefakt",
        },
        {
          id: "dod-tests",
          type: "DoD",
          description:
            "Relevante automatisierte Tests und erforderliche ergänzende Prüfungen sind erfolgreich; es bestehen keine Fehler, die der vereinbarten DoD entgegenstehen.",
          owner: "Team",
          evidence:
            "Test- und Regressionsnachweise einschliesslich betroffener Schnittstellen",
        },
        {
          id: "dod-quality",
          type: "DoD",
          description:
            "Anwendbare Anforderungen an Security, Datenschutz, Barrierefreiheit, Performance und Resilienz sind nachgewiesen.",
          owner: "Team / zuständige Fachrollen",
          evidence:
            "Prüfresultate gemäss vereinbartem Schutz- und Qualitätsbedarf",
        },
        {
          id: "dod-docs",
          type: "DoD",
          description:
            "Betroffene Dokumentation und Änderungsinformationen sind aktuell; bei Daten- oder Schnittstellenänderungen sind Kompatibilität und Datenerhalt geprüft.",
          owner: "Team",
          evidence:
            "Aktuelle Dokumentation sowie erforderliche Migrations- und Kompatibilitätstests",
        },
      ];
      f.rules.Analyzing.criteria = [
        ...[
          {
            id: "ac-behavior",
            type: "AC",
            description:
              "Das erwartete Verhalten und Ergebnis aus Nutzersicht sind je Feature oder Story konkret beschrieben.",
            owner: "Product Owner / Team",
            evidence: "Konkrete Beispiele; bei Bedarf Gegeben–Wenn–Dann",
          },
          {
            id: "ac-boundaries",
            type: "AC",
            description:
              "Relevante Fehlerfälle, Grenzwerte und Berechtigungen sind mit eindeutig erwartetem Verhalten beschrieben.",
            owner: "Product Owner / Team",
            evidence: "Positive, negative und Grenzfall-Szenarien",
          },
          {
            id: "ac-quality",
            type: "AC",
            description:
              "Spezifische Qualitätsanforderungen sind mit messbaren Zielwerten und Prüfbedingungen festgelegt.",
            owner: "Product Owner / Team / Fachrollen",
            evidence:
              "Anwendbare Messwerte, etwa Antwortzeit oder Wiederanlaufziel",
          },
          {
            id: "ac-proof",
            type: "AC",
            description:
              "Für jedes Akzeptanzkriterium ist festgelegt, wie und mit welchen Daten das Ergebnis überprüft oder demonstriert wird.",
            owner: "Product Owner / Team",
            evidence: "Zugeordnete Akzeptanztests und Demo-Szenarien",
          },
        ],
        ...f.rules.Analyzing.criteria.filter((c) => c.type !== "AC"),
      ];
      f.rules.Backlog.criteria = [
        {
          id: "dor-value",
          type: "DoR",
          description:
            "Nutzen, Zielgruppe und Umfang sind verstanden; der Bezug zum Produkt- oder Feature-Ziel ist geklärt.",
          owner: "Product Owner / Team",
          evidence: "Backlog-Eintrag mit Ziel, Nutzen und Abgrenzung",
        },
        {
          id: "dor-ac",
          type: "DoR",
          description:
            "Akzeptanzkriterien sind verständlich, überprüfbar und mit Product Owner und Team abgestimmt.",
          owner: "Product Owner / Team",
          evidence: "Vereinbarte AC mit Beispielen und Prüfansatz",
        },
        {
          id: "dor-small",
          type: "DoR",
          description:
            "Das Team hat den Aufwand eingeschätzt; Stories sind klein genug für eine Iteration. Grössere Features sind in umsetzbare Stories zerlegt.",
          owner: "Team",
          evidence: "Teameinschätzung und zugeschnittene Stories",
        },
        {
          id: "dor-dependencies",
          type: "DoR",
          description:
            "Abhängigkeiten, Architektur- und Qualitätsrisiken sind beurteilt; blockierende Fragen sind geklärt oder mit tragfähigem Vorgehen adressiert.",
          owner: "Team / Architektur / beteiligte LE",
          evidence:
            "Abhängigkeiten, Risikoeinschätzung und erforderliche Zusagen",
        },
        {
          id: "dor-capacity",
          type: "DoR",
          description:
            "Priorität, verantwortliche Rollen, benötigte Fähigkeiten und verfügbare Testmittel sind geklärt; das Team kann die Umsetzung beginnen.",
          owner: "Product Owner / Team",
          evidence: "Priorisiertes Backlog und abgestimmte Lieferbeiträge",
        },
      ];
      f.profiles = {};
      f.phaseGates = phaseDefaults();
      centralize(f);
      return f;
    }
    function defaults() {
      return app.UTGFlowStandard.refine(defaultsV2());
    }
    function validate(value) {
      const object = (x) => x && typeof x === "object" && !Array.isArray(x),
        fail = () => {
          throw Error("Ungültige strukturierte Flow-Kriterien");
        };
      if (
        !object(value) ||
        value.version !== 1 ||
        !object(value.rules) ||
        !object(value.teams)
      )
        fail();
      function list(items) {
        if (!Array.isArray(items)) fail();
        const ids = new Set();
        for (const c of items) {
          if (
            !object(c) ||
            typeof c.id !== "string" ||
            !c.id ||
            ids.has(c.id) ||
            !types.includes(c.type)
          )
            fail();
          ids.add(c.id);
          for (const field of ["description", "owner", "evidence"])
            if (typeof c[field] !== "string") fail();
          if (
            !c.description.trim() ||
            (c.contributors !== undefined && typeof c.contributors !== "string")
          )
            fail();
        }
      }
      function gates(profile) {
        if (profile.phaseGates !== undefined) {
          if (!object(profile.phaseGates)) fail();
          for (const [stage, items] of Object.entries(profile.phaseGates)) {
            if (!stages.includes(stage)) fail();
            list(items);
            if (
              items.some(
                (c) => !["Eintritt", "Übergang", "Abschluss"].includes(c.type),
              )
            )
              fail();
          }
        }
      }
      gates(value);
      if (
        value.standardRevision !== undefined &&
        ![2, 3, 4].includes(value.standardRevision)
      )
        fail();
      if (value.profiles !== undefined) {
        if (!object(value.profiles)) fail();
        for (const profile of Object.values(value.profiles)) {
          if (!object(profile) || !object(profile.rules)) fail();
          gates(profile);
          list(profile.commonDoD);
          if (profile.commonDoR !== undefined) list(profile.commonDoR);
          for (const [stage, rule] of Object.entries(profile.rules)) {
            if (
              !stages.includes(stage) ||
              !object(rule) ||
              typeof rule.useDoD !== "boolean"
            )
              fail();
            list(rule.criteria);
          }
        }
      }
      list(value.commonDoD);
      if (value.commonDoR !== undefined) list(value.commonDoR);
      for (const [stage, rule] of Object.entries(value.rules)) {
        if (
          !stages.includes(stage) ||
          !object(rule) ||
          typeof rule.useDoD !== "boolean"
        )
          fail();
        list(rule.criteria);
      }
      for (const rules of Object.values(value.teams)) {
        if (!object(rules)) fail();
        for (const [stage, items] of Object.entries(rules)) {
          if (!stages.includes(stage)) fail();
          list(items);
        }
      }
      return value;
    }
    function appendUnique(target, item) {
      if (target.some((c) => JSON.stringify(c) === JSON.stringify(item)))
        return;
      const copy = structuredClone(item),
        base = copy.id;
      let n = 1;
      while (target.some((c) => c.id === copy.id))
        copy.id = base + "-migrated-" + n++;
      target.push(copy);
    }
    function centralize(profile) {
      if (profile.phaseGates === undefined)
        profile.phaseGates = phaseDefaults();
      if (profile.commonDoR === undefined) {
        profile.commonDoR = [];
        for (const rule of Object.values(profile.rules))
          for (const c of rule.criteria)
            if (c.type === "DoR") appendUnique(profile.commonDoR, c);
      }
      return profile;
    }
    function migrateCompletionType(data) {
      data.migrations ??= {};
      if (data.migrations.policyCompletionType3140) return;
      const p = data.policies?.find((p) => p.name === "Done"),
        allowed = [
          "name",
          "exit",
          "wip",
          "id",
          "type",
          "scope",
          "owner",
          "interface",
        ];
      if (
        p &&
        p.type === "Ausführung" &&
        p.exit ===
          "Vereinbarte Done-Kriterien erfüllt; Wirkungsmessung erfolgt nachgelagert" &&
        !p.wip &&
        (!p.id || p.id === "FP-7") &&
        (!p.scope || p.scope === "ART") &&
        (!p.owner || p.owner === "ART / zuständige Rollen") &&
        !p.interface &&
        Object.keys(p).every((k) => allowed.includes(k))
      )
        p.type = "Abschluss";
      data.migrations.policyCompletionType3140 = true;
    }
    function initialize(data) {
      migrateCompletionType(data);
      if (data.flowCriteria === undefined) data.flowCriteria = defaults();
      const f = data.flowCriteria;
      validate(f);
      if (f.standardRevision === undefined) {
        const old = legacyDefaults(),
          fresh = defaultsV2(),
          same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
        if (same(f.commonDoD, old.commonDoD)) f.commonDoD = fresh.commonDoD;
        for (const name of ["Analyzing", "Backlog"])
          if (same(f.rules[name]?.criteria, old.rules[name].criteria))
            f.rules[name].criteria = fresh.rules[name].criteria;
        f.standardRevision = 2;
      }
      f.profiles ??= {};
      centralize(f);
      migratePhaseEvidence(f);
      for (const profile of Object.values(f.profiles)) {
        centralize(profile);
        migratePhaseEvidence(profile);
      }
      validate(f);
      return data;
    }
    function ensureTeam(data, team) {
      const f = initialize(data).flowCriteria;
      if (team && !Object.hasOwn(f.profiles, team)) {
        f.profiles[team] = {
          phaseGates: structuredClone(f.phaseGates),
          commonDoR: structuredClone(f.commonDoR),
          commonDoD: structuredClone(f.commonDoD),
          rules: structuredClone(f.rules),
        };
        for (const [stage, items] of Object.entries(f.teams[team] || {})) {
          f.profiles[team].rules[stage] ??= { criteria: [], useDoD: false };
          const target = f.profiles[team].rules[stage].criteria;
          for (const c of items) {
            if (c.type === "DoR") appendUnique(f.profiles[team].commonDoR, c);
            const copy = structuredClone(c);
            if (target.some((x) => x.id === copy.id))
              copy.id = "team-" + copy.id;
            target.push(copy);
          }
        }
      }
      return data;
    }
    function effective(data, stage, team) {
      const d = ensureTeam(structuredClone(data), team),
        f = d.flowCriteria,
        profile = team ? f.profiles[team] : f,
        r = profile.rules[stage] || { criteria: [], useDoD: false };
      return {
        common: r.criteria,
        dod: profile.commonDoD,
        dor: profile.commonDoR,
        team: [],
      };
    }
    function update(data, stage, team, items, useDoD) {
      const d = ensureTeam(structuredClone(data), team),
        f = d.flowCriteria,
        target = team ? f.profiles[team] : f;
      if (stage === "commonDoD") target.commonDoD = items;
      else if (stage === "commonDoR") target.commonDoR = items;
      else target.rules[stage] = { criteria: items, useDoD: !!useDoD };
      validate(f);
      return d;
    }
    function typed(data, stage, team, type) {
      const d = ensureTeam(structuredClone(data), team),
        f = team ? d.flowCriteria.profiles[team] : d.flowCriteria;
      return structuredClone(
        type === "Phase"
          ? [
              ...(f.phaseGates[stage] || []),
              ...(f.rules[stage]?.criteria || [])
                .filter((c) => !["AC", "DoR", "DoD"].includes(c.type))
                .map((c) => ({ ...c, _source: "rule" })),
            ]
          : type === "DoD"
            ? f.commonDoD
            : type === "DoR"
              ? f.commonDoR
              : (f.rules[stage]?.criteria || []).filter((c) => c.type === type),
      );
    }
    function updateTyped(data, stage, team, type, items, useDoD) {
      if (
        !["Phase", "DoD", "DoR", "AC"].includes(type) ||
        items.some((c) =>
          type === "Phase"
            ? !types.includes(c.type) || ["AC", "DoR", "DoD"].includes(c.type)
            : c.type !== type,
        )
      )
        throw Error("Ungültige Kriterienart");
      const d = ensureTeam(structuredClone(data), team),
        f = team ? d.flowCriteria.profiles[team] : d.flowCriteria,
        r = f.rules[stage] || { criteria: [], useDoD: false };
      if (type === "Phase") {
        const ruleItems = items.filter(
            (c) =>
              (c._source === "rule" &&
                r.criteria.some(
                  (original) =>
                    original.id === c.id && original.type === c.type,
                )) ||
              !["Eintritt", "Übergang", "Abschluss"].includes(c.type),
          ),
          gates = items.filter((c) => !ruleItems.includes(c)),
          clean = (c) => {
            const copy = { ...c };
            delete copy._source;
            return copy;
          };
        f.phaseGates[stage] = gates.map(clean);
        f.rules[stage] = {
          ...r,
          criteria: [
            ...r.criteria.filter((c) => ["AC", "DoR", "DoD"].includes(c.type)),
            ...ruleItems.map(clean),
          ],
        };
      } else if (type === "DoD") f.commonDoD = items;
      else if (type === "DoR") f.commonDoR = items;
      else
        f.rules[stage] = {
          ...r,
          criteria: [...r.criteria.filter((c) => c.type !== type), ...items],
        };
      validate(d.flowCriteria);
      return d;
    }
    app.UTGFlowCriteria = Object.freeze({
      types,
      defaults,
      validate,
      initialize,
      ensureTeam,
      effective,
      update,
      typed,
      updateTyped,
    });
  })();
}
