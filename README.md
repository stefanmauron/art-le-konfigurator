# ART-/LE-Konfigurator v3.16 (RC4)

Teams und Leistungserbringer halten in dieser App ihre Zuständigkeiten, Leistungszuordnungen und Regeln für den gemeinsamen Flow fest. Der Konfigurator läuft als einzelne HTML-Datei lokal im Browser.

**[Konfigurator RC4 herunterladen](https://github.com/stefanmauron/art-le-konfigurator/raw/refs/heads/main/dist/UTG-LE_Operating_Model_v3.16_RC4.html)** · [Datei auf GitHub](dist/UTG-LE_Operating_Model_v3.16_RC4.html)

Die Datei herunterladen und im Browser öffnen. Für die Nutzung braucht es keine Installation und keinen Server. Arbeitsstände werden lokal im Browser gespeichert und über JSON exportiert oder importiert. Bei einem Wechsel der Dateiablage oder Browserumgebung den bisherigen Arbeitsstand vorher exportieren und anschliessend importieren. Ein Import ersetzt den aktuellen Arbeitsstand.

## Neu in RC4

Unter «Tätigkeiten verwalten» lassen sich Tätigkeiten am Ziehgriff neben der primären Flow-Phase mit der Maus verschieben. Eine Einfügelinie zeigt die Zielposition. Alternativ den Ziehgriff fokussieren und die Pfeiltasten verwenden.

Die Leistungsmatrix übernimmt die gespeicherte Reihenfolge. Namen, Beschreibungen, Phasenzuordnungen und bestehende Leistungszuordnungen bleiben beim Sortieren erhalten. JSON-Export und -Import führen die Reihenfolge mit.

RC4 verwendet denselben lokalen Speichernamensraum wie RC3. Die [RC3-Datei](dist/UTG-LE_Operating_Model_v3.16_RC3.html) bleibt im Repository erhalten. [Releasehinweis RC4](dokumentation/release-v3.16-rc4.md).

## Konfigurationen zusammenführen

Das separate **[Zusammenführungswerkzeug herunterladen](https://github.com/stefanmauron/art-le-konfigurator/raw/refs/heads/main/dist/UTG-LE_Konfiguration_zusammenfuehren_v1.0.1.html)** verbindet zwei JSON-Exporte ab v3.16 RC3. Es arbeitet lokal und verlangt bei unterschiedlichen Inhalten eine Entscheidung. [Bedienung und bestätigte Regeln](merge-tool/README.md).

## Geprüfter Datenbestand

Für RC4 wurden 20 Teams und 30 zufällig zugeordnete Produkte angelegt. Nach zwei neuen Tätigkeiten enthält der Teststand 34 Tätigkeiten und 680 Matrixzeilen mit insgesamt 5440 befüllten Feldern. Die Leistungsmatrix gilt gemeinsam pro Team; zusätzlich wurden alle 30 Produktkontexte kontrolliert.

Sieben protokollierte Export-/Importvergleiche – einschliesslich Sortieren, ergänzten Tätigkeiten, Standard-Reset und Neuladen – zeigen keine fachlichen Datenabweichungen. Alle 13 Testfamilien wurden ausgeführt. Die bekannten fachlichen Negativprüfungen bleiben unverändert offen; sie werden durch den erfolgreichen Vergleich nicht als behoben gewertet.

- [Prüfbericht RC4 mit Umfang und Grenzen](dokumentation/pruefbericht-v3.16-rc4.md)
- [Importierbare Testkonfiguration: 20 Teams / 30 Produkte](tests/fixtures/rc4/20-teams-30-produkte.json)
- [Maschinenlesbare Ergebnisse](tests/results/rc4/pruefergebnisse.json)
- [Testfälle und Vergleichsregeln](dokumentation/teststrategie-v3.16-rc4.md)

Die umfangreichen Datennachweise stammen aus dem ngGEVER-Arbeitsstand. Die zusätzliche Prüfung dieses eigenständigen Repositorys wird im [Veröffentlichungsnachweis RC4](dokumentation/veroeffentlichung-v3.16-rc4.md) getrennt dokumentiert. Browsernachweise gelten für Chrome auf macOS; andere Browser-/Betriebssystemkombinationen sind damit nicht bestätigt.

## Entwicklung

Voraussetzung: Node.js ab Version 22. Im Repository-Hauptverzeichnis:

```sh
npm ci
npm run build
npm test
```

Der Build erzeugt die einzelne HTML-Datei aus `src/`. Releasekennzeichnung, Exportdateiname und Speichernamensraum stehen in `release.json`. Erzeugtes HTML wird nicht manuell bearbeitet.

Für alle Testfamilien:

```sh
npm run test:all
```

Der Runner startet bei Bedarf einen lokalen Testserver auf `127.0.0.1:8773` und schreibt getrennte Protokolle nach `.test-output/all-rc4/`. Der vollständige UI-Aufbau mit 5440 Speicherereignissen braucht mehrere Minuten. Einzelne Familien lassen sich gezielt ausführen:

```sh
npm run test:activities
npm run test:release
npm run test:roundtrip
npm run test:merge
```

Für Browserprüfungen werden Chrome und Playwright benötigt. `PLAYWRIGHT_MODULE` kann auf ein installiertes Playwright-Modul zeigen; andernfalls wird der bisherige lokale Fallbackpfad verwendet. `node_modules/` und `.test-output/` gehören nicht zur Auslieferung.

## Verzeichnisse

| Pfad | Inhalt |
| --- | --- |
| `src/` | Fachlogik, Anwendung, UI, Styles und HTML-Hülle |
| `scripts/` | Build zur einzelnen HTML-Datei |
| `dist/` | Konfigurator RC4, Vorgänger RC3, Zusammenführungswerkzeug und Buildmanifest |
| `tests/` | Testtreiber, Referenzdaten und RC4-Prüfergebnisse |
| `dokumentation/` | RC4-Releasehinweis, Teststrategie und Prüfberichte |
| `merge-tool/` | Quellen und Tests des separaten Zusammenführungswerkzeugs |
| `pruefnachweise/` | Historische Nachweise mit dem jeweiligen damaligen Versionsstand |

Das Repository enthält Quellcode und herunterladbare HTML-Dateien. Die Nutzung erfolgt lokal; GitHub Pages ist dafür nicht erforderlich.
