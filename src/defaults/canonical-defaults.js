import { createModels } from "../domain/models.js";
import { initializeEditDialogs } from "../ui/components/edit-dialog.js";
export function initialize(app, browser = globalThis) {
  (function () {
    "use strict";
    app.UTGModels = createModels(app);
    initializeEditDialogs(app, browser);
    const V2 = "gever-art-leistungsmatrix-v1",
      V3 = "gever-art-v3-config";
    const snapshot = {
      v2: { teams: [], selected: null },
      v3: {
        schema: 3,
        products: [],
        configs: {},
        services: [
          {
            id: "default-it-gever-consulting",
            name: "IT- und GEVER-Beratung",
            provider: "ISCeco",
            embedding: "Noch zu klären",
            interaction: "Noch zu klären",
          },
          {
            id: "default-architecture-security-consulting",
            name: "Architektur-, Sicherheits- und Konformitätsberatung",
            provider: "ISCeco",
            embedding: "Noch zu klären",
            interaction: "Noch zu klären",
          },
          {
            id: "default-application-development",
            name: "Anwendungsentwicklung und Weiterentwicklung",
            provider: "ISCeco",
            embedding: "Noch zu klären",
            interaction: "Noch zu klären",
          },
          {
            id: "default-interface-integration",
            name: "Schnittstellenintegration",
            provider: "ISCeco",
            embedding: "Noch zu klären",
            interaction: "Noch zu klären",
          },
          {
            id: "default-system-environments",
            name: "Systemumgebungen bereitstellen und pflegen",
            provider: "ISCeco",
            embedding: "Noch zu klären",
            interaction: "Noch zu klären",
          },
          {
            id: "default-deployment",
            name: "Deployment und technische Releasebereitstellung",
            provider: "ISCeco",
            embedding: "Noch zu klären",
            interaction: "Noch zu klären",
          },
          {
            id: "default-operations",
            name: "Anwendungsbetrieb und Wartung",
            provider: "ISCeco",
            embedding: "Noch zu klären",
            interaction: "Noch zu klären",
          },
          {
            id: "default-monitoring",
            name: "Monitoring und technische Protokollierung",
            provider: "ISCeco",
            embedding: "Noch zu klären",
            interaction: "Noch zu klären",
          },
          {
            id: "default-application-support",
            name: "Technischer Anwendungssupport und Störungsbehebung",
            provider: "ISCeco",
            embedding: "Noch zu klären",
            interaction: "Noch zu klären",
          },
          {
            id: "default-archive-delivery",
            name: "Technische Aussonderung und Archivablieferung",
            provider: "ISCeco",
            embedding: "Noch zu klären",
            interaction: "Noch zu klären",
          },
          {
            id: "default-integration-tests",
            name: "Integrationstests",
            provider: "ISCeco",
            embedding: "Noch zu klären",
            interaction: "Noch zu klären",
          },
        ],
        activities: [
          {
            id: "activity-01",
            phase: "Funnel",
            name: "Bedarfserfassung",
            service: "",
            type: "Zustandsbezogen",
            description:
              "Die Bedarfserfassung klärt das Anliegen, den erwarteten Nutzen und die Zuständigkeit.",
            additionalPhases: [],
          },
          {
            id: "activity-03",
            phase: "Analyzing",
            name: "Requirements Engineering",
            service: "",
            type: "Zustandsbezogen",
            description:
              "Anforderungen und Akzeptanzkriterien beschreiben, was das Produkt leisten soll.",
            additionalPhases: ["Implementing"],
          },
          {
            id: "activity-04",
            phase: "Analyzing",
            name: "Feature-Planung und -Refinement",
            service: "",
            type: "Kontinuierlich",
            description:
              "Features werden präzisiert, sinnvoll geschnitten und für die Umsetzung vorbereitet.",
            additionalPhases: ["Implementing"],
          },
          {
            id: "activity-05",
            phase: "Analyzing",
            name: "Solution Design",
            service: "",
            type: "Kontinuierlich",
            description:
              "Das Lösungsdesign zeigt, wie Anforderungen technisch und fachlich umgesetzt werden können.",
            additionalPhases: ["Implementing"],
          },
          {
            id: "activity-06",
            phase: "Analyzing",
            name: "Architektur-Alignment",
            service: "",
            type: "Kontinuierlich",
            description:
              "Die Lösung wird mit der Zielarchitektur und den betroffenen Systemen abgestimmt.",
            additionalPhases: ["Implementing"],
          },
          {
            id: "activity-07",
            phase: "Analyzing",
            name: "Security- und Compliance-Anforderungen",
            service: "",
            type: "Kontinuierlich",
            description:
              "Sicherheits- und Compliance-Vorgaben werden früh geklärt und für die Umsetzung konkretisiert.",
            additionalPhases: ["Implementing"],
          },
          {
            id: "activity-08",
            phase: "Analyzing",
            name: "Architekturentscheid / Freigabe",
            service: "",
            type: "Entscheidung",
            description:
              "Erforderliche Architekturentscheide werden begründet und dokumentiert; eine Freigabe erfolgt nur bei Bedarf.",
            additionalPhases: [],
          },
          {
            id: "activity-09",
            phase: "Analyzing",
            name: "Kapazitäts- und Abhängigkeitsplanung",
            service: "",
            type: "Kontinuierlich",
            description:
              "Vor der Einplanung werden Kapazitätsbedarf, Abhängigkeiten und erforderliche Lieferzusagen geklärt; bei Änderungen wird die Planung angepasst.",
            additionalPhases: ["Implementing"],
          },
          {
            id: "activity-10",
            phase: "Analyzing",
            name: "Test- und Releaseplanung",
            service: "",
            type: "Kontinuierlich",
            description:
              "Die Planung legt Testumfang, Nachweise und Voraussetzungen für das Release fest.",
            additionalPhases: ["Implementing"],
          },
          {
            id: "activity-11",
            phase: "Implementing",
            name: "Entwicklung",
            service: "",
            type: "Zustandsbezogen",
            description:
              "Die Entwicklung setzt die vereinbarten Anforderungen in funktionsfähige Software um.",
            additionalPhases: [],
          },
          {
            id: "activity-12",
            phase: "Implementing",
            name: "Konfigurationsmanagement",
            service: "",
            type: "Kontinuierlich",
            description:
              "Softwarestände und Konfigurationen werden versioniert und nachvollziehbar bereitgestellt.",
            additionalPhases: ["Validating", "Deploying & Releasing"],
          },
          {
            id: "activity-13",
            phase: "Implementing",
            name: "Unit-Tests",
            service: "",
            type: "Zustandsbezogen",
            description:
              "Automatisierte Tests prüfen die korrekte Funktion einzelner Softwarebausteine.",
            additionalPhases: [],
          },
          {
            id: "activity-14",
            phase: "Implementing",
            name: "Funktionale Tests",
            service: "",
            type: "Kontinuierlich",
            description:
              "Funktionale Tests prüfen früh und fortlaufend, ob die vereinbarten Anforderungen erfüllt sind.",
            additionalPhases: ["Validating"],
          },
          {
            id: "activity-15",
            phase: "Implementing",
            name: "Code-Review",
            service: "",
            type: "Kontinuierlich",
            description:
              "Code-Reviews prüfen Änderungen auf Verständlichkeit, Wartbarkeit und technische Fehler.",
            additionalPhases: [],
          },
          {
            id: "activity-30",
            phase: "Implementing",
            name: "Continuous Integration",
            service: "",
            type: "Kontinuierlich",
            description:
              "Softwareänderungen werden laufend zusammengeführt und automatisiert auf Fehler geprüft.",
            additionalPhases: [],
          },
          {
            id: "activity-16",
            phase: "Implementing",
            name: "Integrationstests",
            service: "",
            type: "Kontinuierlich",
            description:
              "Integrationstests prüfen früh das Zusammenspiel von Komponenten und Schnittstellen.",
            additionalPhases: ["Validating"],
          },
          {
            id: "activity-18",
            phase: "Implementing",
            name: "Sicherheitstests",
            service: "",
            type: "Kontinuierlich",
            description:
              "Sicherheitstests decken Schwachstellen auf und prüfen die Einhaltung der Sicherheitsanforderungen.",
            additionalPhases: ["Validating"],
          },
          {
            id: "activity-19",
            phase: "Implementing",
            name: "Performance-Tests",
            service: "",
            type: "Kontinuierlich",
            description:
              "Performance-Tests prüfen Antwortzeiten, Durchsatz und Stabilität unter erwarteter Last.",
            additionalPhases: ["Validating"],
          },
          {
            id: "activity-17",
            phase: "Validating",
            name: "End-to-End-Tests",
            service: "",
            type: "Zustandsbezogen",
            description:
              "End-to-End-Tests weisen nach, dass vollständige Geschäftsabläufe über Systemgrenzen hinweg funktionieren.",
            additionalPhases: [],
          },
          {
            id: "activity-20",
            phase: "Validating",
            name: "Fachliche Abnahme",
            service: "",
            type: "Entscheidung",
            description:
              "Die fachliche Abnahme bewertet die Erfüllung der Akzeptanzkriterien; ein formaler Entscheid erfolgt bei Bedarf. Fachliches Feedback wird bereits während der Umsetzung eingeholt und ist von dieser Abnahme zu unterscheiden.",
            additionalPhases: [],
          },
          {
            id: "activity-21",
            phase: "Deploying & Releasing",
            name: "Deployment",
            service: "",
            type: "Kontinuierlich",
            description:
              "Software wird kontrolliert in Entwicklungs-, Test- und Produktionsumgebungen bereitgestellt.",
            additionalPhases: ["Implementing", "Validating"],
          },
          {
            id: "activity-31",
            phase: "Implementing",
            name: "Technische Integration",
            service: "",
            type: "Zustandsbezogen",
            description:
              "Komponenten werden technisch verbunden und in Entwicklungs- und Testumgebungen lauffähig gemacht.",
            additionalPhases: [],
          },
          {
            id: "activity-22",
            phase: "Deploying & Releasing",
            name: "Releasefreigabe",
            service: "",
            type: "Entscheidung",
            description:
              "Die zuständige Rolle entscheidet gemäss Release-Regeln über die Freigabe zur Nutzung.",
            additionalPhases: [],
          },
          {
            id: "activity-23",
            phase: "Deploying & Releasing",
            name: "Betriebsübergabe",
            service: "",
            type: "Zustandsbezogen",
            description:
              "Die Betriebsübergabe bestätigt die vereinbarten Zuständigkeiten, Betriebsunterlagen und Unterstützung für den laufenden Betrieb.",
            additionalPhases: [],
          },
          {
            id: "activity-25",
            phase: "Done",
            name: "Feature-Abschluss / Lessons Learned",
            service: "",
            type: "Zustandsbezogen",
            description:
              "Erfüllte Done-Kriterien belegen den Feature-Abschluss. Erkenntnisse werden während des gesamten Flows ausgewertet und in Verbesserungen umgesetzt; Lessons Learned sind keine einmalige Abschlussaufgabe.",
            additionalPhases: [],
          },
          {
            id: "activity-02",
            phase: "Übergreifend",
            name: "Strategische Einordnung und Priorisierung",
            service: "",
            type: "Governance",
            description:
              "Die Portfolio-Steuerung ordnet Vorhaben strategisch ein und setzt Prioritäten ausserhalb des Feature-Flows.",
            additionalPhases: [],
          },
          {
            id: "activity-32",
            phase: "Deploying & Releasing",
            name: "Rollback-Bereitschaft prüfen",
            service: "",
            type: "Zustandsbezogen",
            description:
              "Vor der Freigabe wird nachgewiesen, dass die Rückkehr zu einem definierten Software- und Konfigurationsstand funktioniert.",
            additionalPhases: [],
          },
          {
            id: "activity-24",
            phase: "Übergreifend",
            name: "Wirkungskontrolle / Nutzungsanalyse",
            service: "",
            type: "Feedback",
            description:
              "Nutzungsdaten und Rückmeldungen zeigen nach dem Release, ob der erwartete Nutzen eintritt.",
            additionalPhases: [],
          },
          {
            id: "activity-26",
            phase: "Übergreifend",
            name: "Monitoring und Audit-Trails",
            service: "",
            type: "Lifecycle",
            description:
              "Monitoring überwacht den Servicebetrieb; Audit-Trails machen relevante Vorgänge nachvollziehbar.",
            additionalPhases: [],
          },
          {
            id: "activity-27",
            phase: "Übergreifend",
            name: "Operations / Incident Management",
            service: "",
            type: "Lifecycle",
            description:
              "Der Servicebetrieb hält Leistungen verfügbar und behebt Störungen; Verbesserungsbedarf fliesst ins ART-Backlog.",
            additionalPhases: [],
          },
          {
            id: "activity-28",
            phase: "Übergreifend",
            name: "Dependency Management",
            service: "",
            type: "Kontinuierlich",
            description:
              "Abhängigkeiten zwischen Teams und Leistungserbringern werden laufend abgestimmt; Blockaden werden geklärt oder eskaliert.",
            additionalPhases: [],
          },
          {
            id: "activity-29",
            phase: "Übergreifend",
            name: "Dokumentation und Qualitätsmanagement",
            service: "",
            type: "Kontinuierlich",
            description:
              "Dokumentation und Qualitätsnachweise werden während der Arbeit erstellt und aktuell gehalten.",
            additionalPhases: [],
          },
        ],
        policies: [
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
        product: "",
        team: "",
        providers: ["UTG-ART", "ISCeco", "BIT", "Rubicon"],
        models: [
          "Embedded",
          "Kooperation",
          "Shared Service",
          "Service Interface",
        ],
        updated: "2026-10-28T17:57:10.400Z",
        flowSchema: "seven-states-v1",
        methodVersion: "3.9.23",
        flowGovernance: {
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
        },
      },
      organisations: {},
    };
    function baseline() {
      const copy = JSON.parse(JSON.stringify(snapshot));
      copy.v3 = app.UTGModels.migrate(copy.v3);
      return copy;
    }
    function install() {
      const b = baseline();
      app.UTGStorage.restore(b);
      return b;
    }
    app.UTGDefaults = {
      baseline: () => {
        const b = baseline();
        if (app.UTGFlow7) app.UTGFlow7.migrate(b.v3);
        if (app.UTGFlowCriteria) {
          app.UTGFlowCriteria.initialize(b.v3);
          for (const t of b.v2.teams)
            app.UTGFlowCriteria.ensureTeam(b.v3, t.id);
        }
        return b;
      },
      install: () => {
        const b = baseline();
        if (app.UTGFlow7) app.UTGFlow7.migrate(b.v3);
        if (app.UTGFlowCriteria) {
          app.UTGFlowCriteria.initialize(b.v3);
          for (const t of b.v2.teams)
            app.UTGFlowCriteria.ensureTeam(b.v3, t.id);
        }
        app.UTGStorage.restore(b);
        return b;
      },
    };
    try {
      if (
        app.UTGStorage.rawGet(V2) === null &&
        app.UTGStorage.rawGet(V3) === null
      )
        install();
      else {
        const current = JSON.parse(app.UTGStorage.rawGet(V3) || "null");
        if (current)
          app.UTGStorage.rawSet(
            V3,
            JSON.stringify(app.UTGModels.migrate(current)),
          );
      }
    } catch (e) {
      console.warn("Konfiguration konnte nicht initialisiert werden:", e);
    }
  })();
}
