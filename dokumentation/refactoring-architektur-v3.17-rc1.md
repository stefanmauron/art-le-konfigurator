# Architektur und Entwicklung – v3.17 RC1

Grundlage: [bestätigte Vorgaben](refactoring-entscheidungen.md) und [Umsetzungsplan](refactoring-umsetzungsplan-v3.17-rc1.md).

## Übergabe

An Nutzer wird ausschliesslich [UTG-LE_Operating_Model_v3.17_RC1.html](../dist/UTG-LE_Operating_Model_v3.17_RC1.html) weitergegeben. Scripts, Styles, Symbole und Standarddaten sind darin eingebettet. Es sind kein Server, Paketmanager oder Begleitordner erforderlich. Das technische `build-manifest.json` dient Entwicklern und gehört nicht zur notwendigen Übergabe.

Die individuelle Konfiguration liegt weiterhin lokal im Browser. Zur Übernahme aus RC2 wird dort JSON exportiert und in v3.17 importiert. Die HTML-Datei enthält nicht automatisch den Arbeitsstand eines Nutzers. JSON kann weiterhin zurück nach RC2 übertragen werden.

## Quellen und Abhängigkeiten

| Bereich | Verantwortung |
|---|---|
| `src/domain/` | Browserunabhängige Flow-, Kriterien-, Katalog-, Vereinbarungs- und Prüfregeln. |
| `src/application/` | Zusammensetzen der Anwendung, Matrixoperationen, Entwürfe, Auswahl und Navigation. |
| `src/infrastructure/` | Browserspeicher, Dateiaustausch und bestehende Migrationen. |
| `src/ui/` | Register, Editoren und gemeinsame UI-Bausteine. |
| `src/defaults/` | Bestehende Baseline und deren kompatible Initialisierung. |
| `src/styles/` | Formatierte Styles in der bewährten Kaskadenreihenfolge. |
| `src/shell.html` | HTML-Hülle mit expliziten Einbettungsstellen. |
| `src/manifest.json` | Reihenfolge, Quellen und Herkunftszeilen der ursprünglich eingebetteten Blöcke. |
| `release.json` | Version, Release-Stufe, Exportdateiname und Speichernamensraum. |
| `scripts/build.mjs` | Validierter Build zur einzelnen HTML-Datei. |
| `tests/` | Aktive Quellmodul-, Vergleichs-, Browser- und Buildprüfungen. |

Die Modulinitialisierer erhalten den Anwendungskontext `app` explizit. `bootstrap.js` erzeugt diesen Kontext und die isolierten Speicheradapter. Die Komposition wird über das Manifest gesteuert; die bisherigen Initialisierungspositionen bleiben erhalten. Die generierten Script-IDs werden für bestehende Regressionstests weitergeführt. Der Build bündelt auch echte Modulimporte, etwa von Vereinbarungsregeln, Katalogregeln und Drawer-Steuerung.

Browserunabhängige Regeln werden direkt importiert und gegen die gesicherte Referenz geprüft. `createAgreementService()` und `createInterfaceReview()` benötigen weder DOM noch Browserspeicher. Die Fachmodule importieren keine UI- oder Infrastrukturmodule.

## Bewusste Kompatibilitätsgrenzen

Die bisherigen `window.UTG…`-Namen bleiben als Weiterleitungen auf den Anwendungskontext bestehen. Die Quellen greifen über den injizierten Kontext auf andere Bausteine zu. Diese Weiterleitungen sichern bestehende Integrationstests und erlauben deren weitere schrittweise Ablösung. Es wird nicht behauptet, dass jede historische Schnittstelle bereits entfernt sei.

Die vorhandenen logischen Datenstrukturen und Mehrschlüssel-Schreibvorgänge bleiben erhalten. Ihre physischen Schlüssel erhalten in v3.17 den Präfix `utg-le-v317:`. Das gilt auch für Sitzungszustände. Storage-Ereignisse werden für die eigenen Module auf logische Schlüssel übersetzt; Änderungen aus RC2 werden ignoriert. Bestehende Fehlerbehandlung und Rollback bleiben erhalten. Die Erlaubnis eines neuen internen Formats wurde nicht für eine zusätzliche, zur Modularisierung unnötige Datenmigration genutzt. Eine atomare Mehrschlüsselspeicherung wird dadurch nicht neu zugesichert.

Die Drawer-Steuerung verwaltet eigene Dialoginstanzen. Native `HTMLDialogElement`-Prototypen bleiben unverändert. Die bestehenden visuellen Nachbearbeitungen und begrenzten DOM-Beobachter bleiben als Kompatibilitätsbausteine erhalten. Auch die CSS-Kaskade wurde nicht fachlich neu gestaltet. Ihr vollständiger Ersatz durch neue Renderer wäre ein weiterer, gesondert nachzuweisender Umbau; er ist keine Voraussetzung für die hier belegte Modultrennung.

Die HTML-Hülle behält ihre bestehenden Zwischenräume. JavaScript und CSS sind formatiert. Einzelne HTML-Strings und historisch kurze Variablennamen bleiben in den nun abgegrenzten UI-Modulen bestehen; die Modularisierung wird nicht als vollständige Neuentwicklung oder vollständige Typisierung bezeichnet.

## Entwicklung und Build

Node.js wird nur für Entwicklung und Tests benötigt. In dieser Ausführung wurde Node.js 26 verwendet; die Paketvorgabe ist mindestens Node.js 22. Entwicklungsabhängigkeiten sind über `package-lock.json` festgelegt. Es gibt keine externen Laufzeitabhängigkeiten der ausgelieferten HTML-Datei.

Im Verzeichnis des Konfigurators:

```sh
npm ci
npm run build
npm run lint
npm test
```

Der Build liest Quellen und Release-Metadaten, bündelt die Scriptmodule, kompaktisiert CSS und bettet alles in die HTML-Hülle ein. Er prüft Scriptsyntax, unaufgelöste Platzhalter und externe Script-/Stylesheet-Einbindungen. `build-manifest.json` enthält Version und SHA-256 der Ausgabedatei. Es werden keine zeitabhängigen Builddaten eingebettet. Der Build verwendet ein festgelegtes Arbeitsverzeichnis, damit sein Ergebnis unabhängig vom Aufrufverzeichnis ist.

Quelländerungen erfolgen unter `src/`; das erzeugte HTML wird nicht von Hand korrigiert. Die gesicherte RC2 unter `tests/fixtures/reference/` wird niemals aus neuen Quellen erzeugt oder aktualisiert. `npm test` prüft ihren gesicherten Hash. Eine zweite RC2-Datei im Hauptverzeichnis wird nicht mehr benötigt.

## Tests

`npm test` führt die statischen Prüfungen auf fehlende Variablen, Mehrfachdeklarationen und unerreichbaren Code, Build-/Isolationsprüfungen, direkt importierte Fachmodule, 128 deterministisch variierte Konfigurationen, die Basisfälle gegen beide Versionen, zusätzliche Flow-/Randfall-/Regelprüfungen und einen Vergleich der bekannten methodischen Befunde aus. Bekannte Produktfehler bleiben in ihren Einzelprüfungen rot. Grün ist ausschliesslich der Nachweis, dass Referenz und Kandidat dieselben Ergebnisse liefern.

Die übernommenen Codefragment-Tests verwenden einen dokumentierten Adapter in `tests/legacy-view.cjs`: Er vereinheitlicht ausschliesslich lexikalische Darstellung und den injizierten Anwendungskontext im DOM-losen Harness. Schnitte an Funktionsgrenzen werden mit dem Parser bestimmt. Die fachlichen Erwartungen der übernommenen Tests bleiben erhalten. Die Treiber liegen konsolidiert unter `tests/unit/` und `tests/browser/`; gemeinsame Pfade und Datengeneratoren liegen unter `tests/helpers/`. Historische Migrationseingaben sind kompakte Fixtures, keine Abhängigkeit auf entfernte Altanwendungen. Die RC2-Referenz bleibt unverändert. Die Browserprüfungen verwenden das tatsächliche, unveränderte Auslieferungsbundle ohne diesen Adapter.

Für HTTP-Browserprüfungen vom Repository-Hauptverzeichnis einen lokalen Testserver starten:

```sh
python3 -m http.server 8773 --bind 127.0.0.1
```

Anschliessend im Konfiguratorverzeichnis:

```sh
npm run test:browser
npm run test:flow
npm run test:edges
npm run test:roundtrip
npm run test:assessments
```

Playwright kann mit `PLAYWRIGHT_MODULE` aus einer lokalen Installation gewählt werden. Die bestehenden Prüftreiber besitzen zusätzlich den bisherigen lokalen Fallbackpfad. Chrome muss installiert sein. Der allgemeine Browservergleich unterstützt `BROWSER_CHANNEL`; eine andere Browserinstallation ist dadurch noch nicht automatisch geprüft.

```sh
PLAYWRIGHT_MODULE=/absoluter/pfad/zu/playwright npm run test:browser
```

`BASE_URL` überschreibt die Serveradresse; `OUTPUT_DIR` wählt ein separates Ergebnisverzeichnis. Neue Prüfungen verwenden isolierte Browserkontexte und synthetische Daten. Persönliche Profile werden nicht geöffnet. Rohdaten und Screenshots liegen standardmässig temporär beziehungsweise unter dem ignorierten `.test-output/`; der Releasebericht verweist auf kompakte Nachweise.

`npm run test:performance` misst beide Versionen über `file://` mit 20 Teams und 40 Produkten. Leistungsprüfungen werden ohne parallel laufende Last- oder Browserprüfungen ausgeführt. Eine Aufwärmrunde und fünf wechselweise Messrunden liefern Mediane. Die Nichtregressionsgrenze beträgt den grösseren Wert aus 20 Prozent der Referenzzeit und 100 ms.
