export function initialize(app, browser = globalThis) {
  (() => {
    "use strict";
    const defaults = [
      [
        "customer-value",
        "Zusammenhängender Auftrag mit erkennbarem Nutzen",
        "Das Team wird um einen fachlich zusammenhängenden Produktbereich oder Service gebildet. Seine Nutzer und der erwartete Nutzen sind benennbar. Eine gemeinsame Technologie oder dieselbe vorgesetzte Stelle reicht als Begründung für den Teamschnitt nicht aus.",
      ],
      [
        "e2e",
        "Lieferfähigkeit über den gesamten vereinbarten Umfang",
        "Das Team kann eine typische Änderung von der Klärung des Bedarfs bis zur nutzbaren und betreibbaren Lösung verantworten. Der Zuschnitt vermeidet reine Analyse-, Entwicklungs- oder Testteams, zwischen denen jede Änderung weitergereicht werden muss. Erforderliche externe Leistungen sind ausdrücklich vereinbart.",
      ],
      [
        "self-organisation",
        "Eindeutige Verantwortung und Entscheidungsbefugnisse",
        "Für jedes Produkt, jeden Service und jede wesentliche Schnittstelle ist klar, welches Team verantwortlich ist. Diese Verantwortung ist mit den nötigen Entscheidungsrechten verbunden. Überschneidungen und Lücken werden beim Zuschnitt geklärt – etwa, wer einen produktiven Fehler behebt oder eine Schnittstellenänderung entscheidet.",
      ],
      [
        "all-in-one",
        "Fachlich und technisch passende Grenzen",
        "Aufgaben, die häufig gemeinsam verändert werden müssen, liegen möglichst beim selben Team. Teamgrenzen sollen unabhängige Änderungen ermöglichen. Wenn zwei Teams für fast jedes Feature gemeinsam planen, entwickeln und freigeben müssen, ist ihre Trennung zu hinterfragen.",
      ],
      [
        "cross-assignments",
        "Externe Abhängigkeiten und Querbeauftragungen reduzieren",
        "Der Teamschnitt minimiert wiederkehrende Übergaben, externe Freigaben und konkurrierende Beauftragungen. Massgeblich ist, wie oft das Team auf andere warten muss. Häufig benötigte Fähigkeiten gehören möglichst ins Team; selten benötigte Spezialleistungen können verlässlich von aussen bezogen werden.",
      ],
      [
        "manageable-scope",
        "Tragbarer Umfang und begrenzte Komplexität",
        "Anzahl und Verschiedenheit der Produkte, Technologien und Betriebsaufgaben passen zur Leistungsfähigkeit des Teams. Ein Team übernimmt nicht beliebig viele Systeme, nur weil diese organisatorisch zusammengehören. Wird der Umfang zu gross, wird entlang zusammenhängender Aufgaben geteilt – nicht automatisch nach einzelnen Disziplinen.",
      ],
      [
        "crossfunctional",
        "Passende Kompetenzen und ausreichende Kapazität",
        "Die Besetzung folgt dem Auftrag. Das Team verfügt gemeinsam über die benötigten fachlichen, technischen und betrieblichen Fähigkeiten. Kritisches Wissen hängt nicht dauerhaft an einer einzelnen Person. Teamgrösse und Kapazität werden daraus abgeleitet, nicht über eine starre Sollzahl vorgegeben.",
      ],
      [
        "stable-focus",
        "Stabiler Teamkern und eindeutige Priorisierung",
        "Menschen werden einem beständigen Auftrag zugeordnet. Dauerhafte Mehrfachzuordnungen und wechselnde Queraufträge werden begrenzt. Für das Team gibt es eine nachvollziehbare Reihenfolge der Arbeit; mehrere Auftraggeber können nicht unabhängig dieselbe Kapazität verplanen.",
      ],
      [
        "shared-services",
        "Gemeinsame Services mit klarem Entlastungseffekt",
        "Plattform- und Spezialistenteams werden dort gebildet, wo sie andere Teams wirksam unterstützen: durch wiederverwendbare Leistungen oder gebündeltes Spezialwissen. Leistungsumfang, Schnittstellen und Nutzungsbedingungen sind klar. Eine zentrale Einheit, die für jede Änderung eine individuelle Beauftragung und lange Abstimmung verlangt, muss ihren Zuschnitt überprüfen.",
      ],
    ].map(([id, name, description]) => ({
      id: "design-" + id,
      name,
      description,
    }));
    const statuses = [
      "Nicht beurteilt",
      "Erfüllt",
      "Teilweise erfüllt",
      "Nicht erfüllt",
      "Nicht anwendbar",
    ];
    function initialize(data) {
      if (data.designCriteria === undefined)
        data.designCriteria = structuredClone(defaults);
      data.teamDesignAssessments ??= {};
      return data;
    }
    function validate(data) {
      if (data.designCriteria !== undefined) {
        if (
          !Array.isArray(data.designCriteria) ||
          data.designCriteria.some(
            (c) =>
              !c ||
              typeof c.id !== "string" ||
              !c.id ||
              typeof c.name !== "string" ||
              !c.name.trim() ||
              typeof c.description !== "string",
          ) ||
          new Set(data.designCriteria.map((c) => c.id)).size !==
            data.designCriteria.length
        )
          throw Error("Ungültige Design-Kriterien");
      }
      if (data.teamDesignAssessments !== undefined) {
        if (
          !data.teamDesignAssessments ||
          Array.isArray(data.teamDesignAssessments) ||
          typeof data.teamDesignAssessments !== "object"
        )
          throw Error("Ungültige Team-Beurteilungen");
        for (const ratings of Object.values(data.teamDesignAssessments)) {
          if (!ratings || Array.isArray(ratings) || typeof ratings !== "object")
            throw Error("Ungültige Team-Beurteilungen");
          for (const rating of Object.values(ratings))
            if (
              !rating ||
              !statuses.includes(rating.status) ||
              typeof rating.note !== "string"
            )
              throw Error("Ungültige Design-Beurteilung");
        }
      }
    }
    function upsert(data, id, name, description) {
      const next = initialize(structuredClone(data));
      name = name.trim();
      if (!name) throw Error("Bitte einen Namen eingeben.");
      if (
        next.designCriteria.some(
          (c) =>
            c.id !== id &&
            c.name.toLocaleLowerCase("de-CH") ===
              name.toLocaleLowerCase("de-CH"),
        )
      )
        throw Error("Dieses Design-Kriterium existiert bereits.");
      if (id) {
        const criterion = next.designCriteria.find((c) => c.id === id);
        if (!criterion)
          throw Error("Dieses Kriterium wurde inzwischen entfernt.");
        if (criterion.name !== name || criterion.description !== description)
          criterion.needsReview = true;
        Object.assign(criterion, { name, description });
      } else
        next.designCriteria.push({
          id:
            "design-" +
            Date.now().toString(36) +
            "-" +
            Math.random().toString(36).slice(2, 9),
          name,
          description,
        });
      return next;
    }
    function remove(data, id) {
      const next = initialize(structuredClone(data));
      next.designCriteria = next.designCriteria.filter((c) => c.id !== id);
      for (const ratings of Object.values(next.teamDesignAssessments))
        delete ratings[id];
      return next;
    }
    function assess(data, team, id, status, note) {
      const next = initialize(structuredClone(data));
      if (!next.designCriteria.some((c) => c.id === id))
        throw Error("Dieses Kriterium wurde inzwischen entfernt.");
      if (!statuses.includes(status)) throw Error("Ungültiger Erfüllungsgrad.");
      next.teamDesignAssessments[team] ??= {};
      next.teamDesignAssessments[team][id] = {
        status,
        note,
        updated: new Date().toISOString(),
      };
      return next;
    }
    function ensureTeams(data, teams, useDefaults = false) {
      initialize(data);
      data.teamDesignCriteria ??= {};
      for (const team of teams) {
        if (Object.hasOwn(data.teamDesignCriteria, team.id)) continue;
        data.teamDesignCriteria[team.id] = (
          useDefaults ? defaults : data.designCriteria
        ).map((c) => {
          const rating = data.teamDesignAssessments[team.id]?.[c.id],
            source = data.designCriteria.find((item) => item.id === c.id);
          const changed =
            source &&
            (source.name !== c.name || source.description !== c.description);
          return {
            ...structuredClone(c),
            assessmentStatus: rating?.status || "Nicht beurteilt",
            fulfilled: rating?.status === "Erfüllt",
            note: rating?.note || "",
            ...(changed && rating && rating.status !== "Nicht beurteilt"
              ? { needsReview: true }
              : {}),
          };
        });
      }
      return data;
    }
    function teamEdit(data, team, id, name, description) {
      const next = structuredClone(data),
        list = next.teamDesignCriteria?.[team];
      if (!list) throw Error("Bitte zuerst ein Team auswählen.");
      name = name.trim();
      if (!name) throw Error("Bitte einen Namen eingeben.");
      if (
        list.some(
          (c) =>
            c.id !== id &&
            c.name.toLocaleLowerCase("de-CH") ===
              name.toLocaleLowerCase("de-CH"),
        )
      )
        throw Error("Dieses Design-Kriterium existiert für das Team bereits.");
      if (id) {
        const criterion = list.find((c) => c.id === id);
        if (!criterion)
          throw Error("Dieses Kriterium wurde inzwischen entfernt.");
        if (criterion.name !== name || criterion.description !== description)
          criterion.needsReview =
            assessmentStatus(criterion) !== "Nicht beurteilt";
        Object.assign(criterion, { name, description });
      } else
        list.push({
          id:
            "design-" +
            Date.now().toString(36) +
            "-" +
            Math.random().toString(36).slice(2, 9),
          name,
          description,
          fulfilled: false,
          assessmentStatus: "Nicht beurteilt",
          note: "",
        });
      return next;
    }
    function teamRemove(data, team, id) {
      const next = structuredClone(data);
      next.teamDesignCriteria[team] = next.teamDesignCriteria[team].filter(
        (c) => c.id !== id,
      );
      return next;
    }
    function teamCheck(data, team, id, fulfilled) {
      const next = structuredClone(data),
        criterion = next.teamDesignCriteria?.[team]?.find((c) => c.id === id);
      if (!criterion)
        throw Error("Dieses Kriterium wurde inzwischen entfernt.");
      criterion.fulfilled = fulfilled;
      criterion.assessmentStatus = fulfilled ? "Erfüllt" : "Nicht erfüllt";
      criterion.needsReview = false;
      criterion.assessedAt = new Date().toISOString();
      return next;
    }
    function assessmentStatus(c) {
      return c.assessmentStatus || (c.fulfilled ? "Erfüllt" : "Nicht erfüllt");
    }
    function teamRate(data, team, id, status) {
      if (!["Nicht beurteilt", "Erfüllt", "Nicht erfüllt"].includes(status))
        throw Error("Ungültige Beurteilung.");
      const next = structuredClone(data),
        criterion = next.teamDesignCriteria?.[team]?.find((c) => c.id === id);
      if (!criterion)
        throw Error("Dieses Kriterium wurde inzwischen entfernt.");
      criterion.assessmentStatus = status;
      criterion.fulfilled = status === "Erfüllt";
      criterion.needsReview = false;
      criterion.assessedAt = new Date().toISOString();
      return next;
    }
    function teamSummary(data, teams) {
      ensureTeams(data, teams);
      return teams.map((team) => {
        const list = data.teamDesignCriteria[team.id];
        return {
          team: team.name,
          id: team.id,
          fulfilled: list.filter(
            (c) => assessmentStatus(c) === "Erfüllt" && !c.needsReview,
          ),
          unfulfilled: list.filter(
            (c) => assessmentStatus(c) === "Nicht erfüllt" && !c.needsReview,
          ),
          unassessed: list.filter(
            (c) =>
              !c.needsReview &&
              !["Erfüllt", "Nicht erfüllt"].includes(assessmentStatus(c)),
          ),
          pending: list.filter((c) => c.needsReview),
        };
      });
    }
    const validateLegacy = validate;
    function validateTeams(data) {
      validateLegacy(data);
      if (data.teamDesignCriteria !== undefined) {
        if (
          !data.teamDesignCriteria ||
          typeof data.teamDesignCriteria !== "object" ||
          Array.isArray(data.teamDesignCriteria)
        )
          throw Error("Ungültige Team-Design-Kriterien");
        for (const list of Object.values(data.teamDesignCriteria)) {
          if (
            !Array.isArray(list) ||
            new Set(list.map((c) => c?.id)).size !== list.length ||
            list.some(
              (c) =>
                !c ||
                typeof c.id !== "string" ||
                !c.id ||
                typeof c.name !== "string" ||
                !c.name.trim() ||
                typeof c.description !== "string" ||
                typeof c.fulfilled !== "boolean" ||
                (c.assessmentStatus !== undefined &&
                  !statuses.includes(c.assessmentStatus)) ||
                typeof c.note !== "string" ||
                (c.needsReview !== undefined &&
                  typeof c.needsReview !== "boolean") ||
                (c.assessedAt !== undefined &&
                  typeof c.assessedAt !== "string"),
            )
          )
            throw Error("Ungültige Team-Design-Kriterien");
        }
      }
    }
    app.UTGDesignCriteria = {
      initialize,
      validate: validateTeams,
      upsert,
      remove,
      assess,
      statuses,
      ensureTeams,
      teamEdit,
      teamRemove,
      teamCheck,
      teamSummary,
      teamRate,
      assessmentStatus,
    };
  })();
}
