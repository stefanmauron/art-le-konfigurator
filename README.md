# ART-/LE-Konfigurator v3.16 RC3

Für die Übergabe genügt [UTG-LE_Operating_Model_v3.16_RC3.html](dist/UTG-LE_Operating_Model_v3.16_RC3.html). Die Datei enthält die ganze App und benötigt weder Server noch Begleitdateien. Arbeitsstände werden als JSON exportiert und importiert.

Die aktuelle Kennzeichnung ist v3.16 (RC3). Die darunterliegende Refactoringbasis und deren historische Nachweise heissen weiterhin v3.17 RC1. Der Speichernamensraum bleibt für bestehende lokale Arbeitsstände erhalten. [Releasehinweis RC3](dokumentation/release-v3.16-rc3.md).

## Konfigurationen zusammenführen

Das separate [Zusammenführungswerkzeug](dist/UTG-LE_Konfiguration_zusammenfuehren_v1.0.1.html) verbindet zwei JSON-Exporte ab v3.16 RC3 zu einer neuen Importdatei. Es arbeitet lokal und verlangt bei unterschiedlichen Inhalten eine Entscheidung. [Bedienung, Testdateien und bestätigte Regeln](merge-tool/README.md).

## Struktur

| Pfad | Zweck |
|---|---|
| `src/` | Aktuelle Fachlogik, Anwendung, UI, Styles und HTML-Hülle. |
| `scripts/` | Build zur einzelnen HTML-Datei. |
| `tests/` | Sämtliche aktiven v3.17-Tests mit gemeinsamen Helfern und benötigten Testreferenzen. |
| `dist/` | Auslieferungsdatei und Buildmanifest. |
| `dokumentation/` | Bestätigte Vorgaben, Architektur, Umsetzung, Einschränkungen und Bereinigungsnachweis für v3.17. |
| `pruefnachweise/release/v3.17_RC1/` | Kompakte Nachweise für diesen Release. |
| `package.json`, `package-lock.json` | Entwicklungsbefehle und festgelegte Abhängigkeiten. |
| `release.json` | Releasekennzeichnung und Speichernamensraum. |
| `eslint.config.js`, `.gitignore` | Statische Prüfungen und Ausschluss erzeugter Arbeitsdateien. |

## Build und Tests

Im Repository-Hauptverzeichnis:

```sh
npm ci
npm run build
npm test
```

`npm ci` stellt die Entwicklungswerkzeuge wieder her. `node_modules/` und `.test-output/` werden nicht ausgeliefert und dürfen lokal neu entstehen. Das erzeugte HTML wird nicht manuell bearbeitet.

Für Browserprüfungen im Repository-Hauptverzeichnis einen lokalen Server starten:

```sh
python3 -m http.server 8773 --bind 127.0.0.1
```

In einem zweiten Terminal im selben Verzeichnis:

```sh
npm run test:browser
npm run test:flow
npm run test:edges
npm run test:roundtrip
npm run test:assessments
```

Playwright wird über `PLAYWRIGHT_MODULE` gewählt; die Prüftreiber besitzen zusätzlich den bisherigen lokalen Fallbackpfad. Die Browserprüfungen benötigen eine Chrome-Installation. `BASE_URL` und `OUTPUT_DIR` überschreiben Testadresse und Ergebnisablage. `npm run test:performance` misst die beiden Vergleichsversionen über `file://` und soll ohne parallele Browserlast ausgeführt werden.

## Dokumentation

- [Bestätigte Umsetzungsvorgaben](dokumentation/refactoring-entscheidungen.md)
- [Umsetzungsplan](dokumentation/refactoring-umsetzungsplan-v3.17-rc1.md)
- [Architektur und Entwicklung](dokumentation/refactoring-architektur-v3.17-rc1.md)
- [Release und ursprüngliche Verifikation](dokumentation/release-v3.17-rc1.md)
- [Bekannte Einschränkungen](dokumentation/bekannte-einschraenkungen.md)
- [Bereinigung auf v3.17](dokumentation/bereinigung-v3.17-rc1.md)

Dieses Repository enthält die aus ngGEVER übernommene Konfiguratoranwendung einschliesslich des separaten Zusammenführungswerkzeugs. Die wenigen Referenzdaten unter `tests/fixtures/` werden weiterhin von den v3.17-Prüfungen benötigt. Ihre Herkunft und ihr Zweck stehen in der [Fixture-Beschreibung](tests/fixtures/README.md). Die entfernte RC2 im Hauptverzeichnis und `99_old/` werden nicht wiederhergestellt.

## Herunterladen und lokal verwenden

1. Die [HTML-Datei des Konfigurators](dist/UTG-LE_Operating_Model_v3.16_RC3.html) öffnen und auf GitHub über «Download raw file» herunterladen.
2. Die heruntergeladene Datei im Browser öffnen. Für die Nutzung ist keine Installation erforderlich.
3. Arbeitsstände über den JSON-Export sichern und bei Bedarf wieder importieren.

Das [Zusammenführungswerkzeug](dist/UTG-LE_Konfiguration_zusammenfuehren_v1.0.1.html) kann ebenso heruntergeladen werden. Die App wird als lokale HTML-Datei bereitgestellt; GitHub Pages ist dafür nicht erforderlich.

Bei einem Wechsel der Browser-Umgebung bestehende Arbeitsstände vorher als JSON exportieren und anschliessend importieren.
