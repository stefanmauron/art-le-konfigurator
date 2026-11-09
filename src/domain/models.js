/** Domain catalog identities, service resolution and legacy normalization. */
export function createModels(app) {
  const embeddings = [
    "Im Team integriert",
    "Anderes Team im selben ART",
    "Shared Services",
    "Leistungserbringer ausserhalb des ART",
  ];
  const interactions = [
    "Gemeinsame Erarbeitung",
    "Servicebezug",
    "Befähigung",
    "Beratung / punktuelle Unterstützung",
  ];
  const embeddingDefaults = {
    "Im Team integriert": "embedded",
    "Anderes Team im selben ART": "art-team",
    "Shared Services": "shared",
    "Leistungserbringer ausserhalb des ART": "outside",
  };
  function embeddingKind(data, name) {
    return (
      data?.embeddingKinds?.[name] ||
      embeddingDefaults[name] ||
      (name === "Eigenes Team im ART" ? "art-team" : "custom")
    );
  }
  function normalizeEmbeddings(data) {
    data.embeddingKinds ??= {};
    data.migrations ??= {};
    const old = "Eigenes Team im ART",
      next = "Anderes Team im selben ART";
    if (
      !data.migrations.embeddingKinds3141 &&
      (!Object.hasOwn(data.embeddingKinds, old) ||
        data.embeddingKinds[old] === "art-team") &&
      (!Object.hasOwn(data.embeddingKinds, next) ||
        data.embeddingKinds[next] === "art-team")
    ) {
      if (Array.isArray(data.embeddings))
        data.embeddings = [
          ...new Set(
            data.embeddings.map((name) => (name === old ? next : name)),
          ),
        ];
      for (const item of [
        ...(data.services || []),
        ...Object.values(data.configs || {}).flatMap((c) =>
          Object.values(c.entries || {}),
        ),
      ])
        if (item.embedding === old) item.embedding = next;
      if (Object.hasOwn(data.embeddingKinds, old)) {
        data.embeddingKinds[next] = data.embeddingKinds[old];
        delete data.embeddingKinds[old];
      }
    }
    data.migrations.embeddingKinds3141 = true;
    for (const name of data.embeddings || [])
      if (!Object.hasOwn(data.embeddingKinds, name))
        data.embeddingKinds[name] = embeddingDefaults[name] || "custom";
    return data;
  }
  function renameEmbedding(data, oldName, newName) {
    normalizeEmbeddings(data);
    if (oldName === newName) return;
    if ((data.embeddings || []).includes(newName))
      throw Error("Dieser Name ist bereits vorhanden.");
    const kind = embeddingKind(data, oldName);
    if (Array.isArray(data.embeddings))
      data.embeddings = data.embeddings.map((name) =>
        name === oldName ? newName : name,
      );
    for (const item of [
      ...(data.services || []),
      ...Object.values(data.configs || {}).flatMap((c) =>
        Object.values(c.entries || {}),
      ),
    ])
      if (item.embedding === oldName) item.embedding = newName;
    data.embeddingKinds[newName] = kind;
    delete data.embeddingKinds[oldName];
  }

  const providerLegacyKind = (name) =>
    name === "ART" || name === "UTG-ART"
      ? "art"
      : name === "ISCeco"
        ? "isceco"
        : name.includes("ART +")
          ? "joint"
          : name.includes("Shared")
            ? "shared"
            : "other";
  function providerKind(data, name) {
    return (
      data?.providerRecords?.find((r) => r.name === name)?.kind ||
      providerLegacyKind(String(name || ""))
    );
  }
  function normalizeProviders(data) {
    data.providerRecords ??= [];
    const names = new Set(
      [
        ...(data.providers || []),
        ...(data.services || []).map((s) => s.provider),
        ...Object.values(data.configs || {}).flatMap((c) =>
          Object.values(c.entries || {}).map((e) => e.org),
        ),
      ].filter(
        (v) => v && !["Noch zu klären", "Nicht erforderlich"].includes(v),
      ),
    );
    for (const name of names)
      if (!data.providerRecords.some((r) => r.name === name)) {
        let id = "provider-" + encodeURIComponent(name),
          suffix = 1;
        while (data.providerRecords.some((r) => r.id === id))
          id = "provider-" + encodeURIComponent(name) + "-" + suffix++;
        data.providerRecords.push({
          id,
          name,
          kind: providerLegacyKind(name),
        });
      }
    return data;
  }
  function validateCatalogName(data, type, name, previous) {
    const normalized = name.trim().toLocaleLowerCase("de-CH");
    if (!normalized) throw Error("Bitte einen Namen eingeben.");
    if (
      ["noch zu klären", "nicht erforderlich", "__proto__"].includes(normalized)
    )
      throw Error(
        "Dieser Name ist für einen Systemzustand reserviert. Bitte einen anderen Namen verwenden.",
      );
    if (
      (data[type] || []).some(
        (value) =>
          value !== previous &&
          value.trim().toLocaleLowerCase("de-CH") === normalized,
      )
    )
      throw Error("Dieser Name ist bereits vorhanden.");
    if (
      type === "providers" &&
      previous !== undefined &&
      data.providerRecords?.some(
        (r) =>
          r.name !== previous &&
          r.name.trim().toLocaleLowerCase("de-CH") === normalized,
      )
    )
      throw Error("Dieser Name ist bereits als Anbieterkennung vorhanden.");
    return true;
  }
  function renameProvider(data, oldName, newName) {
    normalizeProviders(data);
    const record = data.providerRecords.find((r) => r.name === oldName);
    if (record) record.name = newName;
    return data;
  }
  const embeddingCategories = [
    ["embedded", "Im betrachteten Team"],
    ["art-team", "Anderes Team im selben ART"],
    ["shared", "Geteilte Spezialkompetenz / Shared Services"],
    ["outside", "Ausserhalb des ART"],
    ["custom", "Eigene Kategorie (keine automatische Shared-Service-Zählung)"],
  ];
  function migrateItem(item) {
    if (!item || typeof item !== "object") return item;
    if (item.model !== undefined) {
      item.legacyModel ??= item.model;
      const map = {
        Embedded: ["Im Team integriert", "Nicht erforderlich"],
        Kooperation: ["Noch zu klären", "Gemeinsame Erarbeitung"],
        "Shared Service": ["Shared Services", "Noch zu klären"],
        "Service Interface": [
          "Leistungserbringer ausserhalb des ART",
          "Servicebezug",
        ],
        "Nicht erforderlich": ["Nicht erforderlich", "Nicht erforderlich"],
      };
      const values = map[item.model] || ["Noch zu klären", "Noch zu klären"];
      item.embedding ??= values[0];
      item.interaction ??= values[1];
      delete item.model;
    }
    return item;
  }
  // Upgrade untouched default descriptions only; retain custom text, cleared values and renamed activities.
  const activityDescriptionUpdates = [
    {
      id: "activity-01",
      name: "Bedarfserfassung",
      before: "Bedarfserfassung",
      after:
        "Die Bedarfserfassung klärt das Anliegen, den erwarteten Nutzen und die Zuständigkeit.",
    },
    {
      id: "activity-03",
      name: "Requirements Engineering",
      before: "Anforderungen iterativ präzisieren",
      after:
        "Anforderungen und Akzeptanzkriterien beschreiben, was das Produkt leisten soll.",
    },
    {
      id: "activity-04",
      name: "Feature-Planung und -Refinement",
      before:
        "Feature-Refinement in der Analyse und bei Bedarf während der Umsetzung; Backlog ist eine Warteschlange.",
      after:
        "Features werden präzisiert, sinnvoll geschnitten und für die Umsetzung vorbereitet.",
    },
    {
      id: "activity-05",
      name: "Solution Design",
      before: "Lösungsoptionen und Architektur inkrementell validieren",
      after:
        "Das Lösungsdesign zeigt, wie Anforderungen technisch und fachlich umgesetzt werden können.",
    },
    {
      id: "activity-06",
      name: "Architektur-Alignment",
      before:
        "Architektur-Alignment während der Umsetzung; Architekturprüfungen in Validating nur bei konkretem Bedarf.",
      after:
        "Die Lösung wird mit der Zielarchitektur und den betroffenen Systemen abgestimmt.",
    },
    {
      id: "activity-07",
      name: "Security- und Compliance-Anforderungen",
      before:
        "Security- und Compliance-Anforderungen früh klären und während der Umsetzung konkretisieren; Validierungsnachweise separat prüfen.",
      after:
        "Sicherheits- und Compliance-Vorgaben werden früh geklärt und für die Umsetzung konkretisiert.",
    },
    {
      id: "activity-08",
      name: "Architekturentscheid / Freigabe",
      before:
        "Erforderliche Architekturentscheide während der Analyse; kein generelles Freigabegate.",
      after:
        "Erforderliche Architekturentscheide werden begründet und dokumentiert; eine Freigabe erfolgt nur bei Bedarf.",
    },
    {
      id: "activity-09",
      name: "Kapazitäts- und Abhängigkeitsplanung",
      before:
        "Kapazität und Abhängigkeiten vor der Einplanung klären, während der Umsetzung aktualisieren.",
      after:
        "Kapazitäten und Abhängigkeiten werden vor der Einplanung geklärt und laufend aktualisiert.",
    },
    {
      id: "activity-10",
      name: "Test- und Releaseplanung",
      before:
        "Teststrategie und Release-Voraussetzungen früh klären, während der Umsetzung konkretisieren.",
      after:
        "Die Planung legt Testumfang, Nachweise und Voraussetzungen für das Release fest.",
    },
    {
      id: "activity-11",
      name: "Entwicklung",
      before: "Entwicklung",
      after:
        "Die Entwicklung setzt die vereinbarten Anforderungen in funktionsfähige Software um.",
    },
    {
      id: "activity-12",
      name: "Konfigurationsmanagement",
      before: "Konfigurationsmanagement",
      after:
        "Softwarestände und Konfigurationen werden versioniert und nachvollziehbar bereitgestellt.",
    },
    {
      id: "activity-13",
      name: "Unit-Tests",
      before: "Unit-Tests",
      after:
        "Automatisierte Tests prüfen die korrekte Funktion einzelner Softwarebausteine.",
    },
    {
      id: "activity-14",
      name: "Funktionale Tests",
      before: "Shift-left, fachliche Validierung fortsetzen",
      after:
        "Funktionale Tests prüfen früh und fortlaufend, ob die vereinbarten Anforderungen erfüllt sind.",
    },
    {
      id: "activity-15",
      name: "Code-Review",
      before:
        "Code-Reviews und Continuous Integration als Bestandteil der Implementierung; kein zusätzliches generelles Validating-Mapping.",
      after:
        "Code-Reviews prüfen Änderungen auf Verständlichkeit, Wartbarkeit und technische Fehler.",
    },
    {
      id: "activity-30",
      name: "Continuous Integration",
      before:
        "Kontinuierliches Zusammenführen und automatisiertes Prüfen von Änderungen",
      after:
        "Softwareänderungen werden laufend zusammengeführt und automatisiert auf Fehler geprüft.",
    },
    {
      id: "activity-16",
      name: "Integrationstests",
      before: "Früh integrieren, End-to-End-Nachweise in Validating",
      after:
        "Integrationstests prüfen früh das Zusammenspiel von Komponenten und Schnittstellen.",
    },
    {
      id: "activity-18",
      name: "Sicherheitstests",
      before:
        "Automatisierte Sicherheitschecks früh, risikobasierte Tests ergänzen",
      after:
        "Sicherheitstests decken Schwachstellen auf und prüfen die Einhaltung der Sicherheitsanforderungen.",
    },
    {
      id: "activity-19",
      name: "Performance-Tests",
      before: "Frühzeitige Messungen und risikobasierte Validierung",
      after:
        "Performance-Tests prüfen Antwortzeiten, Durchsatz und Stabilität unter erwarteter Last.",
    },
    {
      id: "activity-17",
      name: "End-to-End-Tests",
      before:
        "End-to-End-Verhalten in Validating nachweisen; frühe automatisierte Tests bleiben Bestandteil der Implementierung.",
      after:
        "End-to-End-Tests weisen nach, dass vollständige Geschäftsabläufe über Systemgrenzen hinweg funktionieren.",
    },
    {
      id: "activity-20",
      name: "Fachliche Abnahme",
      before:
        "Fachliche Validierung erfolgt laufend; ein formaler Abnahmeentscheid nur, wenn erforderlich.",
      after:
        "Die fachliche Abnahme bewertet die Erfüllung der Akzeptanzkriterien; ein formaler Entscheid erfolgt bei Bedarf.",
    },
    {
      id: "activity-21",
      name: "Deployment",
      before:
        "Deployment in Entwicklungs- und Testumgebungen während Implementing; produktives Deployment und Release in Deploying & Releasing.",
      after:
        "Software wird kontrolliert in Entwicklungs-, Test- und Produktionsumgebungen bereitgestellt.",
    },
    {
      id: "activity-31",
      name: "Technische Integration",
      before: "Technische Integration in Entwicklungs- und Testumgebungen",
      after:
        "Komponenten werden technisch verbunden und in Entwicklungs- und Testumgebungen lauffähig gemacht.",
    },
    {
      id: "activity-22",
      name: "Releasefreigabe",
      before: "Release on Demand; Entscheidung gemäss Release Policy",
      after:
        "Die zuständige Rolle entscheidet gemäss Release-Regeln über die Freigabe zur Nutzung.",
    },
    {
      id: "activity-23",
      name: "Betriebsübergabe",
      before:
        "Betriebsübergabe und Rollback-Bereitschaft in Deploying & Releasing; Betriebsanforderungen und Vorbereitung erfolgen früher als separate Arbeit.",
      after:
        "Die Betriebsübergabe klärt Zuständigkeiten, Betriebsunterlagen und Unterstützung für den laufenden Betrieb.",
    },
    {
      id: "activity-25",
      name: "Feature-Abschluss / Lessons Learned",
      before: "Abschluss nach Erfüllung der vereinbarten Done-Kriterien",
      after:
        "Erfüllte Done-Kriterien belegen den Feature-Abschluss; Erkenntnisse fliessen in Verbesserungen ein.",
    },
    {
      id: "activity-02",
      name: "Strategische Einordnung und Priorisierung",
      before:
        "Strategische Portfolio-Priorisierung ausserhalb des Feature-Flows; Feature-Triage im Funnel erfolgt über Bedarfserfassung.",
      after:
        "Die Portfolio-Steuerung ordnet Vorhaben strategisch ein und setzt Prioritäten ausserhalb des Feature-Flows.",
    },
    {
      id: "activity-32",
      name: "Rollback-Vorbereitung und -Prüfung",
      before: "Rollback-Fähigkeit vor Freigabe nachweisen",
      after:
        "Ein geprüfter Rückfallplan ermöglicht die Rückkehr zu einem definierten Stand bei fehlgeschlagener Bereitstellung.",
    },
    {
      id: "activity-24",
      name: "Wirkungskontrolle / Nutzungsanalyse",
      before:
        "Nutzungs- und Wirkungsmessung nach dem Release, ausserhalb des Feature-Abschlusses.",
      after:
        "Nutzungsdaten und Rückmeldungen zeigen nach dem Release, ob der erwartete Nutzen eintritt.",
    },
    {
      id: "activity-26",
      name: "Monitoring und Audit-Trails",
      before:
        "Laufendes Monitoring und revisionssichere Audit-Trails im Service-Lifecycle; Instrumentierung als Engineering-Aufgabe.",
      after:
        "Monitoring überwacht den Servicebetrieb; Audit-Trails machen relevante Vorgänge nachvollziehbar.",
    },
    {
      id: "activity-27",
      name: "Operations / Incident Management",
      before: "Separater Service-/Lifecycle-Flow mit Feedback ins ART-Backlog",
      after:
        "Der Servicebetrieb hält Leistungen verfügbar und behebt Störungen; Verbesserungsbedarf fliesst ins ART-Backlog.",
    },
    {
      id: "activity-28",
      name: "Dependency Management",
      before:
        "Kontinuierliche Koordination von Abhängigkeiten über den gesamten Wertfluss, ohne künstliche Phasenbegrenzung.",
      after:
        "Abhängigkeiten zwischen Teams und Leistungserbringern werden über den gesamten Wertfluss koordiniert.",
    },
    {
      id: "activity-29",
      name: "Dokumentation und Qualitätsmanagement",
      before:
        "Inkrementelle Dokumentation und Qualitätsmanagement als durchgängige Praktik über den gesamten Wertfluss.",
      after:
        "Dokumentation und Qualitätsnachweise werden während der Arbeit erstellt und aktuell gehalten.",
    },
  ];
  function updateActivityDescriptions(data) {
    for (const activity of data.activities || []) {
      const update = activityDescriptionUpdates.find(
        (x) => x.id === activity.id && x.name === activity.name,
      );
      if (
        update &&
        (activity.description === update.before ||
          activity.description === undefined)
      )
        activity.description = update.after;
    }
    return data;
  }
  const activityPrecisionUpdates = [
    {
      id: "activity-09",
      name: "Kapazitäts- und Abhängigkeitsplanung",
      before:
        "Kapazitäten und Abhängigkeiten werden vor der Einplanung geklärt und laufend aktualisiert.",
      after:
        "Vor der Einplanung werden Kapazitätsbedarf, Abhängigkeiten und erforderliche Lieferzusagen geklärt; bei Änderungen wird die Planung angepasst.",
    },
    {
      id: "activity-23",
      name: "Betriebsübergabe",
      before:
        "Die Betriebsübergabe klärt Zuständigkeiten, Betriebsunterlagen und Unterstützung für den laufenden Betrieb.",
      after:
        "Die Betriebsübergabe bestätigt die vereinbarten Zuständigkeiten, Betriebsunterlagen und Unterstützung für den laufenden Betrieb.",
    },
    {
      id: "activity-32",
      name: "Rollback-Vorbereitung und -Prüfung",
      before:
        "Ein geprüfter Rückfallplan ermöglicht die Rückkehr zu einem definierten Stand bei fehlgeschlagener Bereitstellung.",
      after:
        "Vor der Freigabe wird nachgewiesen, dass die Rückkehr zu einem definierten Software- und Konfigurationsstand funktioniert.",
    },
    {
      id: "activity-28",
      name: "Dependency Management",
      before:
        "Abhängigkeiten zwischen Teams und Leistungserbringern werden über den gesamten Wertfluss koordiniert.",
      after:
        "Abhängigkeiten zwischen Teams und Leistungserbringern werden laufend abgestimmt; Blockaden werden geklärt oder eskaliert.",
    },
  ];
  function refineActivityScope(data) {
    for (const update of activityPrecisionUpdates) {
      const activity = (data.activities || []).find((a) => a.id === update.id);
      if (
        !activity ||
        ![
          update.name,
          ...(update.id === "activity-32"
            ? ["Rollback-Bereitschaft prüfen"]
            : []),
        ].includes(activity.name)
      )
        continue;
      if (
        activity.description === update.before ||
        activity.description === undefined
      )
        activity.description = update.after;
      if (update.id === "activity-32" && activity.name === update.name) {
        const name = "Rollback-Bereitschaft prüfen";
        const configs = Object.values(data.configs || {});
        const conflict =
          (data.activities || []).some(
            (a) => a.id !== activity.id && a.name === name,
          ) ||
          configs.some(
            (c) =>
              Object.hasOwn(c.entries || {}, update.name) &&
              Object.hasOwn(c.entries || {}, name),
          );
        if (conflict) {
          console.warn(
            "Rollback-Umbenennung wegen bestehender Namenskollision beibehalten",
          );
          continue;
        }
        for (const config of configs) {
          if (Object.hasOwn(config.entries || {}, update.name)) {
            config.entries[name] = config.entries[update.name];
            delete config.entries[update.name];
          }
        }
        activity.name = name;
      }
    }
    return data;
  }
  function migrateLegacyActivityNames(data) {
    data.migrations ??= {};
    if (data.migrations.activityCatalog3110) return data;
    // Read provenance before migrate() updates the current operating-model version.
    const parse = (value) => {
      const m = String(value || "").match(/^(\d+)\.(\d+)\.(\d+)(?:[-+].*)?$/);
      return m ? [+m[1], +m[2], +m[3]] : null;
    };
    const versions = [data.modelVersion, data.operatingModelVersion]
      .map(parse)
      .filter(Boolean);
    const current = versions.some(
      (v) => v[0] > 3 || (v[0] === 3 && v[1] >= 11),
    );
    const old =
      versions.some((v) => v[0] === 3 && v[1] < 11) ||
      (!versions.length &&
        parse(data.methodVersion)?.[0] === 3 &&
        parse(data.methodVersion)[1] < 11);
    if (!current && old) {
      const splits = [
        [
          "Code-Review / Continuous Integration",
          "Code-Review",
          "Continuous Integration",
          "activity-30",
        ],
        [
          "Deployment / technische Integration",
          "Deployment",
          "Technische Integration",
          "activity-31",
        ],
        [
          "Betriebsübergabe / Rollback",
          "Betriebsübergabe",
          "Rollback-Bereitschaft prüfen",
          "activity-32",
        ],
      ];
      for (const [oldName, newName, extraName, extraId] of splits) {
        const activity = (data.activities || []).find(
          (a) => a.name === oldName,
        );
        if (!activity) continue;
        const configs = Object.values(data.configs || {});
        const conflict =
          data.activities.some((a) => a !== activity && a.name === newName) ||
          data.activities.some(
            (a) => a.id !== extraId && a.name === extraName,
          ) ||
          configs.some(
            (c) =>
              Object.hasOwn(c.entries || {}, oldName) &&
              Object.hasOwn(c.entries || {}, newName),
          );
        if (conflict) {
          console.warn(
            "Alte Sammel-Tätigkeit wegen bestehender Namenskollision beibehalten",
          );
          continue;
        }
        activity.name = newName;
        if (!data.activities.some((a) => a.id === extraId)) {
          const copy = structuredClone(activity);
          Object.assign(copy, {
            id: extraId,
            name: extraName,
            phase:
              extraId === "activity-32"
                ? "Deploying & Releasing"
                : "Implementing",
            additionalPhases: [],
            type:
              extraId === "activity-30" ? "Kontinuierlich" : "Zustandsbezogen",
            description:
              activityPrecisionUpdates.find((x) => x.id === extraId)?.after ||
              activityDescriptionUpdates.find((x) => x.id === extraId)?.after ||
              "",
            service: "",
          });
          data.activities.push(copy);
        }
        const extra = data.activities.find((a) => a.id === extraId);
        for (const config of configs) {
          if (Object.hasOwn(config.entries || {}, oldName)) {
            const previous = config.entries[oldName];
            config.entries[newName] = previous;
            if (extra && !Object.hasOwn(config.entries, extra.name))
              config.entries[extra.name] = structuredClone(previous);
            delete config.entries[oldName];
          }
        }
      }
    }
    // Unknown provenance is deliberately left intact, never inferred from a name alone.
    data.migrations.activityCatalog3110 = true;
    return data;
  }

  function migrate(data) {
    migrateLegacyActivityNames(data);
    updateActivityDescriptions(data);
    refineActivityScope(data);
    normalizeServiceReferences(data);
    normalizeProviders(data);
    app.UTGDesignCriteria.initialize(data);
    data.embeddings ??= embeddings.slice();
    data.interactions ??= interactions.slice();
    normalizeEmbeddings(data);
    for (const item of data.services || []) migrateItem(item);
    for (const config of Object.values(data.configs || {}))
      for (const item of Object.values(config.entries || {})) migrateItem(item);
    if (data.models) {
      data.legacyModels ??= data.models;
      delete data.models;
    }
    app.UTGAgreement?.initializeCategories(data);
    data.operatingModelVersion = app.UTGVersion;
    return data;
  }
  function resolveService(data, reference) {
    if (!reference) return null;
    const matches = (data.services || []).filter(
      (s) => s.id === reference || s.name === reference,
    );
    return matches.length === 1 ? matches[0] : null;
  }
  function normalizeServiceReferences(data) {
    normalizeEmbeddings(data);
    for (const activity of data.activities || []) {
      const service = resolveService(data, activity.service);
      if (service) activity.service = service.id;
    }
    for (const config of Object.values(data.configs || {}))
      for (const entry of Object.values(config.entries || {})) {
        const service = resolveService(data, entry.service);
        if (service) entry.service = service.id;
        if (entry.orgSource === undefined) entry.orgSource = "explicit";
      }
    return data;
  }
  function effective(data, entry) {
    const service = resolveService(data, entry.service);
    return {
      ...entry,
      org:
        entry.orgSource === "service"
          ? service?.provider || "Noch zu klären"
          : entry.org || "Noch zu klären",
      embedding: entry.embedding || service?.embedding || "Noch zu klären",
      interaction:
        entry.interaction || service?.interaction || "Noch zu klären",
    };
  }
  function serviceOptions(data, current) {
    const options = [
      { value: "", label: "Kein LE-Service" },
      ...(data.services || []).map((s) => ({ value: s.id, label: s.name })),
    ];
    if (current && !resolveService(data, current)) {
      const existing = options.find((o) => o.value === current);
      if (existing) existing.label = "Ungeklärter Bezug: " + current;
      else
        options.push({
          value: current,
          label: "Ungeklärter Bezug: " + current,
        });
    }
    return options;
  }
  function policyCriterion(data, stage) {
    return (
      data?.policies?.find((p) => p.name === stage)?.exit ||
      "Kriterium noch offen"
    );
  }
  return {
    providerKind,
    normalizeProviders,
    renameProvider,
    validateCatalogName,
    embeddingCategories,
    embeddings,
    interactions,
    embeddingKind,
    normalizeEmbeddings,
    renameEmbedding,
    migrate,
    migrateItem,
    effective,
    policyCriterion,
    resolveService,
    normalizeServiceReferences,
    serviceOptions,
  };
}
