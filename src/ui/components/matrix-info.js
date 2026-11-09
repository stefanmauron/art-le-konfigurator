export function initialize(app, browser = globalThis) {
  const window = browser;

  (() => {
    "use strict";
    const matrix = document.getElementById("v3matrix");
    if (!matrix) return;
    const help = [
      "Flow-Phase der Tätigkeit aus dem zentralen Tätigkeitskatalog. Hier nicht bearbeitbar. Wirkung: Bestimmt die primäre Platzierung im Operating Model. Änderungen erfolgen unter Konfiguration → Tätigkeiten verwalten und gelten für alle Teams.",
      "Tätigkeit aus dem zentralen Katalog. Hier nicht bearbeitbar. Wirkung: Die Zuordnung dieser Zeile gilt für den gemeinsamen Flow des ausgewählten Teams, unabhängig vom ausgewählten Produkt. Name und Beschreibung bearbeitest du unter Konfiguration → Tätigkeiten verwalten.",
      "Organisation, welche die Tätigkeit ausführt, zum Beispiel ART, ISCeco oder BIT. Wirkung: Erscheint als Anbieterkennzeichnung im Operating Model und beeinflusst die Verteilung und offenen Zuordnungen in der ART-Gesamtsicht. «Servicevorgabe» übernimmt den aktuellen Anbieter. Eine eigene Auswahl bleibt auch bei Service- oder Anbieterwechseln erhalten. Fehlende Ausführungsangaben werden in der Konfigurationsprüfung ausgewiesen.",
      "Organisatorische Einbindung der Leistung: beispielsweise im Team integriert, anderes Team im selben ART, Shared Services oder ausserhalb des ART. Eine eigene Auswahl gilt für diese Tätigkeit und dieses Team; «Servicevorgabe» übernimmt den Wert des gewählten Services. Wirkung: Wird bei der Prüfung der LE-Schnittstellen berücksichtigt. Die ART-Verteilung zählt nach Leistungserbringer. Die zusätzliche Spalte «Davon Shared Services» zählt die Einbindung unabhängig vom editierbaren Namen und wird nicht zur Summe der Anbieter addiert.",
      "Form der Zusammenarbeit: gemeinsame Erarbeitung, Servicebezug oder Befähigung; bei Bedarf «Nicht erforderlich». Eine eigene Auswahl überschreibt die Servicevorgabe für diese Team-Tätigkeit. Wirkung: Fehlende oder ungeklärte Angaben werden bei den LE-Schnittstellen und in ART-Konfigurationsprüfung ausgewiesen. Die Auswahl löst keine automatischen Abläufe aus.",
      "Fachlich zuständige Rolle oder Stelle für diese Tätigkeit. Wirkung: Wird im Operating Model bei aktivierter Option «Verantwortlichkeiten je Tätigkeit anzeigen» eingeblendet. ART-Konfigurationsprüfung zählt eine offene Verantwortung, wenn alle drei Zuständigkeitsfelder dieser Tätigkeit ungeklärt sind. Dies ist unabhängig von der fachlichen Ergebnisverantwortung im teamweiten Verantwortungsmodell.",
      "Technisch zuständige Rolle oder Stelle für diese Tätigkeit. Wirkung: Wird über «Verantwortlichkeiten je Tätigkeit anzeigen» im Operating Model eingeblendet und gemeinsam mit fachlicher und betrieblicher Zuständigkeit in ART-Konfigurationsprüfung geprüft. Das Feld setzt keine technische Ergebnisverantwortung im teamweiten Verantwortungsmodell.",
      "Für den Betrieb zuständige Rolle oder Stelle dieser Tätigkeit. Wirkung: Wird über «Verantwortlichkeiten je Tätigkeit anzeigen» im Operating Model eingeblendet und gemeinsam mit den beiden anderen Zuständigkeitsfeldern in ART-Konfigurationsprüfung geprüft. Die teamweite Betriebsverantwortung wird separat in der Konfiguration gepflegt.",
      "LE-Service, auf den sich die Leistungszuordnung bezieht. Wirkung: Liefert bei fehlender eigener Auswahl die Vorgaben für Einbindung und Zusammenarbeit und liefert bei gewählter Servicevorgabe die ausführende Organisation. Die Zuordnung erscheint in der Schnittstellenübersicht und deren Prüfungen in der ART-Gesamtsicht. Der Vorschlag aus dem Tätigkeitskatalog gilt nur für neue Zuordnungen.",
      "Freitext zur Übergabe, beispielsweise Lieferergebnis, Absprache oder Besonderheit dieser Tätigkeit für das Team. Wirkung: Wird mit der Leistungszuordnung lokal gespeichert und mit der Konfiguration als Datei gesichert. Der Text erscheint derzeit nur hier in der Matrix; er steuert weder Freigaben noch automatische Prüfungen.",
    ];
    const tooltip = document.createElement("div");
    tooltip.id = "utg-matrix-column-tooltip";
    tooltip.className = "app-column-tooltip";
    tooltip.setAttribute("role", "tooltip");
    tooltip.hidden = true;
    document.body.append(tooltip);
    let active = null;
    function hide() {
      if (active) active.removeAttribute("aria-describedby");
      active = null;
      tooltip.hidden = true;
    }
    function show(button, text) {
      hide();
      const host = button.closest("dialog") || document.body;
      if (tooltip.parentNode !== host) host.append(tooltip);
      active = button;
      tooltip.textContent = text;
      tooltip.hidden = false;
      button.setAttribute("aria-describedby", tooltip.id);
      const rect = button.getBoundingClientRect(),
        box = tooltip.getBoundingClientRect();
      tooltip.style.left =
        Math.max(12, Math.min(rect.left, window.innerWidth - box.width - 12)) +
        "px";
      tooltip.style.top =
        Math.max(
          12,
          rect.bottom + 8 + box.height <= window.innerHeight - 12
            ? rect.bottom + 8
            : rect.top - box.height - 8,
        ) + "px";
    }
    function infoButton(title, text) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "app-matrix-info";
      button.textContent = "i";
      button.setAttribute("aria-label", "Info: " + title);
      button.addEventListener("mouseenter", () => show(button, text));
      button.addEventListener("mouseleave", hide);
      button.addEventListener("focus", () => show(button, text));
      button.addEventListener("blur", hide);
      button.addEventListener("click", () => show(button, text));
      button.addEventListener("keydown", (event) => {
        if (event.key === "Escape") hide();
      });
      return button;
    }
    matrix
      .querySelectorAll("thead th")
      .forEach((heading, index) =>
        heading.append(" ", infoButton(heading.textContent, help[index])),
      );
    for (const [id, text] of [
      [
        "v3team",
        "Wählt das Team, dessen gemeinsame Leistungszuordnungen du bearbeitest. Der Flow gilt für alle Produkte dieses Teams. Team und Produktzuordnung werden im Register Konfiguration gepflegt.",
      ],
      [
        "v3product",
        "Zeigt ein dem Team zugeordnetes Produkt. Ein Produktwechsel erzeugt keinen eigenen Flow und keine getrennten Leistungszuordnungen: Alle Produkte dieses Teams teilen dieselbe Matrix. Über «Produkte zuordnen» kannst du die Zuordnung ändern.",
      ],
      [
        "v3status",
        "Manuell gesetzter Bearbeitungsstand des Team-Flows: Entwurf, Abgestimmt oder Freigegeben. Der Status wird mit dem Flow gespeichert. Er ist keine automatische Prüfung, löst keine Freigabe aus und sperrt die Bearbeitung nicht.",
      ],
    ]) {
      const select = document.getElementById(id),
        label = select?.closest("label");
      if (!label) continue;
      label.htmlFor = id;
      const caption = document.createElement("span");
      caption.className = "app-matrix-field-caption";
      const title = [...label.childNodes]
        .filter((node) => node.nodeType === 3)
        .map((node) => node.textContent)
        .join("")
        .trim();
      for (const node of [...label.childNodes])
        if (node.nodeType === 3) node.remove();
      caption.append(document.createTextNode(title), infoButton(title, text));
      label.prepend(caption);
    }
    const assignment = document.getElementById("utg-assign-dialog"),
      assignmentHint = assignment?.querySelector("p.hint");
    if (assignmentHint) {
      const title = assignment.querySelector("h2");
      title.append(
        " ",
        infoButton("Produkte zuordnen", assignmentHint.textContent),
      );
      assignmentHint.remove();
      assignment.addEventListener("close", hide);
    }
    app.addEventListener("scroll", hide, true);
    app.addEventListener("resize", hide);
    document
      .querySelectorAll("#utg-nav button")
      .forEach((button) => button.addEventListener("click", hide));
  })();
}
