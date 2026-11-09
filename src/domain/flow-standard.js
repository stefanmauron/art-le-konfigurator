export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    const fields = [
        ["workItem", "Arbeitselement"],
        ["pull", "Pull und Kapazität"],
        ["wip", "Vereinbarte WIP-Begrenzung"],
        ["blocked", "Blockaden und Eskalation"],
        ["aging", "Alternde Arbeit"],
        ["exceptions", "Ablehnen, Parkieren und Zurückgeben"],
        ["measurementStart", "Startpunkt der Flow-Messung"],
        ["measurementEnd", "Endpunkt der Flow-Messung"],
        ["sle", "Service Level Expectation (SLE)"],
        ["qualityMinimum", "Gemeinsame Produkt- / ART-Mindestqualität"],
        ["decisionRole", "Entscheidungsverantwortliche Rolle"],
        ["evidence", "Vereinbarungsnachweis / Referenz"],
      ],
      policies = [
        {
          name: "Funnel",
          exit: "Bedarf und Nutzen geklärt; Analyse ausgewählt und kapazitiv möglich.",
          owner: "Product Management",
          contributors: "Bedarfsträger / Product Owner",
          evidence:
            "Analyseentscheid mit Priorität und bestätigter Analysekapazität",
          wip: "",
          scope: "ART",
          type: "Übergang",
          standardRevision: 4,
        },
        {
          name: "Analyzing",
          exit: "Feature-Ziel, Umfang und prüfbare AC geklärt; Risiken, LE-Abhängigkeiten und Wirkungshypothese samt Messauftrag dokumentiert.",
          owner: "Product Owner",
          contributors: "Team / Architektur / Fachrollen / beteiligte LE",
          evidence:
            "Feature mit AC, Risikoeinschätzung, LE-Beiträgen und referenziertem Messplan",
          wip: "",
          scope: "ART",
          type: "Übergang",
          standardRevision: 4,
        },
        {
          name: "Backlog",
          exit: "Nächster Umsetzungsschritt bereit; priorisiertes Feature bei freier Kapazität und gesicherten Lieferbeiträgen ziehen.",
          owner: "Product Owner",
          contributors: "Team / beteiligte LE",
          evidence:
            "Pull-Entscheid mit Kapazität, Bereitschaft und benötigten Zusagen",
          wip: "",
          scope: "ART",
          type: "Übergang",
          standardRevision: 4,
        },
        {
          name: "Implementing",
          exit: "Änderungen integriert; Build, Reviews und frühe Tests erfolgreich. Ergebnis für die integrierte Validierung prüfbar.",
          owner: "Umsetzungsverantwortliche Rolle im Team",
          contributors: "Team / beteiligte LE",
          evidence:
            "Versioniertes Artefakt, erfolgreicher Build, Reviews und frühe Tests",
          wip: "",
          scope: "ART",
          type: "Übergang",
          standardRevision: 4,
        },
        {
          name: "Validating",
          exit: "DoD am integrierten Ergebnis erfüllt; keine auslieferungsblockierenden Abweichungen. Erforderliche Freigabeunterlagen liegen vor.",
          owner: "Product Owner",
          contributors: "Team / Fachrollen",
          evidence:
            "Akzeptanz- und Qualitätsnachweise mit beurteilten Abweichungen",
          wip: "",
          scope: "ART",
          type: "Übergang",
          standardRevision: 4,
        },
        {
          name: "Deploying & Releasing",
          exit: "Bereitstellung, Nutzungsfreigabe und Betriebsübernahme bestätigt; Funktionsprüfung erfolgreich und Rückfallweg verfügbar.",
          owner: "Releaseverantwortliche Rolle",
          contributors: "Team / Betriebsverantwortliche / beteiligte LE",
          evidence:
            "Deploymentprotokoll, Nutzungsfreigabe, Funktionsprüfung und bestätigte Betriebsübernahme",
          wip: "",
          scope: "ART",
          type: "Übergang",
          standardRevision: 4,
        },
        {
          name: "Done",
          exit: "Abschluss und Nachweise vollständig; Messauftrag mit Verantwortung, Termin und Datenquelle übergeben.",
          owner: "Product Owner",
          contributors: "Team / Product Management",
          evidence:
            "Feature-Abschluss mit DoD-Nachweisen und Referenz auf übergebenen Messauftrag",
          wip: "",
          scope: "ART",
          type: "Abschluss",
          standardRevision: 4,
        },
      ],
      gates = {
        Funnel: [
          {
            id: "entry-0",
            type: "Eintritt",
            description:
              "Feature-Anliegen mit betroffenen Nutzern und zuständiger Person erfasst.",
            owner: "Product Management",
            contributors: "Bedarfsträger / Product Owner",
            evidence: "Bedarfseintrag mit Nutzern und zuständiger Person",
          },
          {
            id: "exit-0",
            type: "Übergang",
            description:
              "Bedarf und Nutzen geklärt; Analyse ausgewählt und kapazitiv möglich.",
            owner: "Product Management",
            contributors: "Bedarfsträger / Product Owner",
            evidence:
              "Analyseentscheid mit Priorität und bestätigter Analysekapazität",
          },
        ],
        Analyzing: [
          {
            id: "entry-1",
            type: "Eintritt",
            description:
              "Analyse ausgewählt; Kapazität und benötigte Rollen verfügbar.",
            owner: "Product Owner",
            contributors: "Team / Architektur / Fachrollen / beteiligte LE",
            evidence:
              "Priorisierter Analyseauftrag und verfügbare Fach- und Technikrollen",
          },
          {
            id: "exit-1",
            type: "Übergang",
            description:
              "Feature-Ziel, Umfang und prüfbare AC geklärt; Risiken, LE-Abhängigkeiten und Wirkungshypothese samt Messauftrag dokumentiert.",
            owner: "Product Owner",
            contributors: "Team / Architektur / Fachrollen / beteiligte LE",
            evidence:
              "Feature mit AC, Risikoeinschätzung, LE-Beiträgen und referenziertem Messplan",
          },
        ],
        Backlog: [
          {
            id: "entry-2",
            type: "Eintritt",
            description:
              "Feature mit Ziel, Umfang, AC, Risiken und Abhängigkeiten analysiert.",
            owner: "Product Owner",
            contributors: "Team / beteiligte LE",
            evidence: "Analysiertes Feature mit AC und Abhängigkeiten",
          },
          {
            id: "exit-2",
            type: "Übergang",
            description:
              "Nächster Umsetzungsschritt bereit; priorisiertes Feature bei freier Kapazität und gesicherten Lieferbeiträgen ziehen.",
            owner: "Product Owner",
            contributors: "Team / beteiligte LE",
            evidence:
              "Pull-Entscheid mit Kapazität, Bereitschaft und benötigten Zusagen",
          },
        ],
        Implementing: [
          {
            id: "entry-3",
            type: "Eintritt",
            description:
              "Priorisiertes Feature gezogen; nächster Schritt bereit, Kapazität und benötigte Lieferbeiträge gesichert.",
            owner: "Umsetzungsverantwortliche Rolle im Team",
            contributors: "Team / beteiligte LE",
            evidence: "Pull-Entscheid gemäss Bereitschaft und Kapazität",
          },
          {
            id: "exit-3",
            type: "Übergang",
            description:
              "Änderungen integriert; Build, Reviews und frühe Tests erfolgreich. Ergebnis für die integrierte Validierung prüfbar.",
            owner: "Umsetzungsverantwortliche Rolle im Team",
            contributors: "Team / beteiligte LE",
            evidence:
              "Versioniertes Artefakt, erfolgreicher Build, Reviews und frühe Tests",
          },
        ],
        Validating: [
          {
            id: "entry-4",
            type: "Eintritt",
            description:
              "Integriertes Ergebnis nach erfolgreichen frühen Prüfungen mit Testdaten in der vereinbarten Umgebung prüfbar.",
            owner: "Product Owner",
            contributors: "Team / Fachrollen",
            evidence:
              "Prüfbares integriertes Artefakt, Testdaten und Prüfumgebung; referenzierte DoD-Nachweise",
          },
          {
            id: "exit-4",
            type: "Übergang",
            description:
              "DoD am integrierten Ergebnis erfüllt; keine auslieferungsblockierenden Abweichungen. Erforderliche Freigabeunterlagen liegen vor.",
            owner: "Product Owner",
            contributors: "Team / Fachrollen",
            evidence:
              "Akzeptanz- und Qualitätsnachweise mit beurteilten Abweichungen; referenzierte DoD-Nachweise",
          },
        ],
        "Deploying & Releasing": [
          {
            id: "entry-5",
            type: "Eintritt",
            description:
              "DoD am integrierten Ergebnis erfüllt; keine auslieferungsblockierenden Abweichungen. Erforderliche Release- und Betriebsinformationen liegen vor.",
            owner: "Releaseverantwortliche Rolle",
            contributors: "Team / Betriebsverantwortliche / beteiligte LE",
            evidence:
              "Validierungsnachweise und vorbereitete Release-/Betriebsinformationen; referenzierte DoD-Nachweise",
          },
          {
            id: "exit-5",
            type: "Übergang",
            description:
              "Bereitstellung, Nutzungsfreigabe und Betriebsübernahme bestätigt; Funktionsprüfung erfolgreich und Rückfallweg verfügbar.",
            owner: "Releaseverantwortliche Rolle",
            contributors: "Team / Betriebsverantwortliche / beteiligte LE",
            evidence:
              "Deploymentprotokoll, Nutzungsfreigabe, Funktionsprüfung und bestätigte Betriebsübernahme; referenzierte DoD-Nachweise",
          },
        ],
        Done: [
          {
            id: "entry-6",
            type: "Eintritt",
            description:
              "Bereitstellung, Nutzungsfreigabe und Betriebsübernahme nachgewiesen.",
            owner: "Product Owner",
            contributors: "Team / Product Management",
            evidence:
              "Nachgewiesene Bereitstellung, Nutzungsfreigabe und Übergaben",
          },
          {
            id: "exit-6",
            type: "Abschluss",
            description:
              "Abschluss und Nachweise vollständig; Messauftrag mit Verantwortung, Termin und Datenquelle übergeben.",
            owner: "Product Owner",
            contributors: "Team / Product Management",
            evidence:
              "Feature-Abschluss mit DoD-Nachweisen und Referenz auf übergebenen Messauftrag",
          },
        ],
      },
      governance = {
        version: 1,
        status: "Vorschlag",
        workItem:
          "Feature im ART-Fluss. Story-Bereitschaft wird separat für die nächsten Umsetzungsschritte vereinbart.",
        pull: "Arbeit nur bei verfügbarer Kapazität der empfangenden Stufe ziehen. Backlog ist eine priorisierte Warteschlange; Verfeinerung erfolgt bedarfsgerecht.",
        wip: "",
        blocked:
          "Blockade am Arbeitselement mit verantwortlicher Person, nächstem Schritt und Eskalationszeitpunkt dokumentieren. Den konkreten Eskalationsweg gemeinsam vereinbaren.",
        aging:
          "Alternde Arbeit regelmässig im Flow-Review besprechen; Prüfrhythmus und Eingriffsgrenzen anhand tatsächlicher Durchlaufzeiten vereinbaren.",
        exceptions:
          "Arbeit darf mit begründetem Entscheid abgelehnt, geparkt oder in eine frühere Stufe zurückgegeben werden. Verantwortliche Rolle und Wiederaufnahmebedingung am Feature dokumentieren.",
        measurementStart:
          "Pull eines Features vom Backlog nach Implementing; Analysezeiten separat betrachten.",
        measurementEnd:
          "Eintritt in Done nach bestätigter Bereitstellung, Nutzungsfreigabe und Übergabe.",
        sle: "",
        qualityMinimum:
          "Am selben Produkt gemeinsam vereinbarte DoD einhalten: überprüfbare AC, Integration und Versionierung, relevante Tests, anwendbare Qualitätsanforderungen und aktuelle Dokumentation. Team-Vereinbarungen konkretisieren diese Mindestqualität. Formale Abnahmen nur bei fachlicher, vertraglicher oder regulatorischer Erforderlichkeit; zuständige Entscheidrolle benennen.",
        decisionRole: "",
        evidence: "",
      };
    const clone = (x) => structuredClone(x),
      text = (x) => typeof x === "string" && !!x.trim();
    function validateGovernance(g) {
      if (g === undefined) return;
      if (
        !g ||
        typeof g !== "object" ||
        Array.isArray(g) ||
        g.version !== 1 ||
        !["Vorschlag", "Vereinbart"].includes(g.status)
      )
        throw Error("Ungültige Flow-Vereinbarung");
      for (const [key] of fields)
        if (typeof g[key] !== "string")
          throw Error("Ungültiges Flow-Feld: " + key);
      if (g.status === "Vereinbart" && fields.some(([key]) => !text(g[key])))
        throw Error(
          "Für eine vereinbarte Flow-Steuerung fehlen Angaben, Zuständigkeit oder Nachweis.",
        );
    }
    function refine(f) {
      f.standardRevision = 4;
      f.phaseGates = clone(gates);
      f.rules.Funnel.criteria = [];
      f.rules.Validating.criteria = [];
      f.rules.Backlog.criteria = [];
      f.rules.Done.criteria = [];
      f.rules.Analyzing.criteria = f.rules.Analyzing.criteria.map((c) =>
        c.id === "impact"
          ? {
              ...c,
              description:
                "Ausgangslage, erwartete Veränderung, Messgrösse, Datenquelle, Messverantwortung und Messzeitpunkt sind im Messauftrag festgelegt.",
              owner: "Product Management",
              contributors: "Product Owner / Team",
              evidence:
                "Referenz auf Wirkungshypothese und Messauftrag mit Ausgangswert und Datenquelle",
            }
          : c.type === "AC"
            ? {
                ...c,
                description: c.description.replace(
                  "je Feature oder Story",
                  "je Feature",
                ),
                owner: "Product Owner",
                contributors: "Team / Fachrollen",
              }
            : c,
      );
      const dor = [
          "Ziel, Nutzen und Umfang sind verstanden.",
          "AC sind abgestimmt und überprüfbar.",
          "Der nächste Umsetzungsschritt ist klein und umsetzbar.",
          "Blockierende Fragen sind geklärt oder tragfähig adressiert.",
          "Benötigte Rollen, Fähigkeiten, Testmittel und Lieferbeiträge sind rechtzeitig verfügbar.",
        ],
        dod = [
          "Die vereinbarten AC sind nachweislich erfüllt.",
          "Änderungen sind geprüft, versioniert und integriert; das Ergebnis ist auslieferbar.",
          "Relevante Tests sind erfolgreich; keine unzulässigen Befunde sind offen.",
          "Die anwendbaren Qualitäts- und Schutzanforderungen sind nachgewiesen.",
          "Dokumentation ist aktuell; Daten-, Schnittstellen- und Migrationsfolgen sind geprüft.",
        ];
      f.commonDoR = f.commonDoR.map((c, i) => ({ ...c, description: dor[i] }));
      f.commonDoD = f.commonDoD.map((c, i) => ({ ...c, description: dod[i] }));
      f.commonDoR[2].evidence =
        "Zuschnitt des nächsten Schritts; weitere Verfeinerung nach Bedarf, Story-Bereitschaft separat";
      f.commonDoR[4].evidence =
        "Benötigte Beiträge und Testmittel verfügbar oder für ihren Bedarfstermin verbindlich zugesagt; Priorität und freie Kapazität beim Pull bestätigen";
      f.commonDoD[0].evidence =
        "Akzeptanznachweis am Arbeitselement; erforderliche formale Abnahme in der Freigaberegel referenzieren";
      f.commonDoD[2].evidence =
        "Relevante Testnachweise und produktbezogene Fehlergrenzen; keine offenen Befunde, die verbindliche AC oder Qualitätsgrenzen verletzen";
      f.commonDoD[3].evidence =
        "Produktbezogenes Qualitätsprofil mit anwendbaren Anforderungen an Security, Datenschutz, Barrierefreiheit, Performance und Resilienz sowie referenzierten Prüfnachweisen";
      f.commonDoD[4].evidence =
        "Aktuelle Dokumentation und Änderungsinformationen; Datenerhalt, Kompatibilität oder vereinbarter Versions-/Migrationspfad nachgewiesen";
      f.rules.Implementing.criteria = [
        {
          id: "flow",
          type: "Flow-Steuerung",
          description:
            "Nach der übergreifenden Flow-Vereinbarung arbeiten: WIP begrenzen, Blockaden und alternde Arbeit sichtbar bearbeiten. Fehlende konkrete Limits und Eskalationswege gemeinsam vereinbaren.",
          owner: "Umsetzungsverantwortliche Rolle im Team",
          contributors: "Team / beteiligte LE",
          evidence:
            "Referenz auf vereinbarte WIP-, Blockade- und Eskalationsregeln",
        },
      ];
      f.rules["Deploying & Releasing"].criteria = [
        {
          id: "release",
          type: "Release / Betrieb",
          description:
            "Vor der Auslieferung Deployment, Funktionsprüfung, Rollback, Monitoring und Support vorbereiten. Deployment und Freigabe zur Nutzung getrennt nachweisen; bei entkoppeltem Release bleibt das Feature bis zur vereinbarten Nutzungsfreigabe hier. Formale Abnahmen nur bei Erforderlichkeit mit Entscheidrolle und Nachweis führen.",
          owner: "Releaseverantwortliche Rolle",
          contributors: "Team / Betriebsverantwortliche",
          evidence:
            "Releaseplan und Rückfallverfahren; getrennte Deployment- und Freigabenachweise sowie erforderliche formale Abnahmen",
        },
        {
          id: "handover",
          type: "Schnittstelle",
          description:
            "Lieferobjekt, empfangende Rolle, Übergabekriterien und Reaktionszeit vereinbaren; die erfolgte Übernahme bestätigen lassen.",
          owner: "Betriebsverantwortliche Rolle",
          contributors: "Team / beteiligte LE",
          evidence:
            "Schnittstellenvereinbarung und bestätigter Übergabenachweis",
        },
      ];
      return f;
    }
    function issues(d) {
      const result = [],
        g = d.flowGovernance;
      const add = (stage, message) =>
        result.push({
          message: "Flow-Konsistenz · " + message,
          target: { kind: "policy", stage },
        });
      if (!g || g.status !== "Vereinbart")
        add(
          "Funnel",
          "Übergreifende Flow-Steuerung ist noch nicht gemeinsam vereinbart.",
        );
      if (!g || !text(g.wip))
        add("Implementing", "Konkrete WIP-Begrenzung ist noch zu vereinbaren.");
      if (!g || !text(g.sle))
        add(
          "Implementing",
          "SLE aus beobachteten Durchlaufzeiten noch zu ermitteln.",
        );
      for (const [scope, p] of [
        ["Standardvorlage", d.flowCriteria],
        ...Object.entries(d.flowCriteria?.profiles || {}).map(([id, p]) => [
          "Team " + id,
          p,
        ]),
      ])
        for (const [stage, list] of Object.entries(p?.phaseGates || {})) {
          if (
            list.some((c) =>
              stage === "Done" ? c.type === "Übergang" : c.type === "Abschluss",
            )
          )
            add(
              stage,
              scope +
                ": Abschluss ist Done vorbehalten; die anderen Zustände benötigen einen Übergang.",
            );
        }
      for (const p of d.policies || [])
        if (!text(p.owner) || !text(p.evidence))
          add(
            p.name,
            "ART-Regel " +
              p.name +
              ": Entscheidrolle oder erwarteter Nachweis fehlt.",
          );
      return result;
    }
    const contexts = {
      Funnel: [
        "Noch keine vollständige Umsetzungsbereitschaft verlangen. Bedarf und Analysezuständigkeit klären.",
        "Qualitätsrahmen früh kennen; seine Erfüllung ist keine Aufnahmebedingung.",
      ],
      Analyzing: [
        "Bereitschaft schrittweise herstellen; nicht bereits zum Analysebeginn verlangen.",
        "Benötigte Prüfungen und Nachweise früh planen.",
      ],
      Backlog: [
        "Vor dem Pull nach Implementing auf den nächsten Schritt anwenden. Priorität und freie Kapazität beim Pull bestätigen.",
        "Das gemeinsame Qualitätsziel für die Umsetzung berücksichtigen.",
      ],
      Implementing: [
        "Bei wesentlichen Änderungen den nächsten Schritt klären; keine erneute pauschale Freigabe verlangen.",
        "Qualität fortlaufend herstellen: integrieren, prüfen und dokumentieren.",
      ],
      Validating: [
        "Prüfumgebung und Testdaten nach der Phasenregel klären; keine erneute Umsetzungs-DoR.",
        "Erfüllung am integrierten Ergebnis nachweisen, bevor ausgeliefert wird.",
      ],
      "Deploying & Releasing": [
        "Release-Bereitschaft nach der Phasenregel prüfen.",
        "Vor der Nutzungsfreigabe erfüllt. DoD macht auslieferbar; der Release bestätigt die tatsächliche Freigabe.",
      ],
      Done: [
        "Keine neue Bereitschaftsprüfung; neue Arbeit separat aufnehmen.",
        "Vorhandene Erfüllungsnachweise bestätigen. Feature-Abschluss umfasst zusätzlich Release und Übergabe; spätere Wirkung bleibt separat.",
      ],
    };
    function context(stage, type) {
      return contexts[stage]?.[type === "DoR" ? 0 : 1] || "";
    }
    app.UTGFlowStandard = Object.freeze({
      context,
      fields,
      policies: () => clone(policies),
      gates: () => clone(gates),
      governance: () => clone(governance),
      refine,
      validateGovernance,
      issues,
    });
  })();
}
