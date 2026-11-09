# Bereinigung auf v3.17 RC1

Der Konfigurator enthält nur noch die aktuelle Entwicklung, Auslieferung, v3.17-Dokumentation und die dafür benötigten Tests und Nachweise. Die vom Auftraggeber entfernte RC2-Datei im Hauptverzeichnis und `99_old/` wurden nicht wiederhergestellt.

## Entfernt und konsolidiert

- Zehn benötigte Prüftreiber und Helfer wurden unter `tests/unit/`, `tests/browser/` und `tests/helpers/` zusammengeführt. Das frühere `test-scripts/` wurde anschliessend vollständig entfernt.
- Die notwendige Importkonfiguration liegt bytegleich unter `tests/fixtures/import-compatibility.json`. Das frühere `testdaten/` wurde entfernt.
- Zwei Migrationstests verwenden kompakte, aus einem geprüften Git-Stand extrahierte Datensätze und eine historische Signatur. Sie benötigen keine vollständigen alten Anwendungen. Herkunft und Quellprüfsummen stehen in `migration-criteria.json`.
- Eine einzige unveränderte RC2-Datei bleibt unter `tests/fixtures/reference/` als benötigte Eingabe der v3.17-Vergleichstests erhalten. Der Test verlangt keine zweite Kopie im Hauptverzeichnis mehr.
- Frühere Releaseberichte, alte Testläufe und überholte Reviews wurden entfernt. Vorgaben, Plan, Architektur, v3.17-Releasebericht und aktuelle Einschränkungen bleiben erhalten. Historische Links der übergeordneten README führen auf den geprüften Git-Commit `c75067e0c82c977b0623629423b9dcf37ac70606`.
- `node_modules/`, `.test-output/` und Finder-Metadaten wurden entfernt. Für neue Builds und Tests zuerst `npm ci` ausführen.

Neben den bereits vom Nutzer gelöschten Anwendungen wurden 247 entbehrliche Dateien mit 1’930’439 Bytes entfernt; die verschobenen aktiven Prüftreiber zählen nicht als gelöschte Testfälle. Die zusätzlich entfernten regenerierbaren Bestände sind im maschinenlesbaren Nachweis separat gezählt.

## Prüfung nach der Konsolidierung

Alle neun aktiven Unit-/Build-/Lint-Familien bestehen. Dazu gehören je 111 Basisfälle gegen Referenz und Kandidat, 128 variierte Fachkonfigurationen, 18 Flow-Gruppen, 68 Randfälle und 55 Regelvertragsfälle. Die 94 methodischen Prüffälle zeigen unverändert dieselben 49 bekannten negativen Ergebnisse in beiden Versionen. Der Build-/Isolationscheck umfasst nun 22 statt 23 Prüfungen, weil der Vergleich mit der entfernten zweiten RC2-Kopie entfällt.

Nach den Pfadänderungen wurden 56 Browserprüfpunkte für Daten, Styles, Layout, Dateiaustausch, Tab-Synchronisation und Offline-Start sowie 71 Flow-Steuerungsfälle, 15 Randfälle und 13 Flow-Ablaufgruppen bestanden. Ein erneuter strenger Screenshotlauf zeigte eine Renderabweichung trotz identischer App-Datei, Texte, Geometrien und berechneter Styles. Die 45 Pixelvergleiche wurden deshalb im anschliessenden funktionalen Bereinigungslauf ausdrücklich übersprungen und nicht als neue Erfolge gezählt. Der frühere erfolgreiche Pixelnachweis für genau dasselbe Bundle bleibt unverändert erhalten. Standardmässig verlangt `npm run test:browser` weiterhin strikte Pixelgleichheit; `UTG_COMPARE_PIXELS=0` ist eine ausdrückliche Einschränkung des Prüfumfangs.

Der verifizierte vollständige 20-Team-/40-Produkt-Aufbau aus dem ursprünglichen Oberflächenlauf wurde als geprüfter Checkpoint geladen. Die 23 früheren Setup-Prüfungen wurden als übernommen gekennzeichnet. Anschliessend bestanden 28 neue Prüfungen für Wiederherstellung, Export, Standard-Reset, Reimport, Reload und die gerenderten Matrizen aller Teams. Es wird kein erneut von Grund auf ausgeführter CRUD-Aufbau behauptet.

Die Auslieferungsdatei ist bytegleich geblieben:

```text
827644997f5d838950b2d4e0e4a4399e2dafa5dbfec4ac301d495e8973267877
```

Auch die zwölf ursprünglichen Release-Einzelnachweise sind unverändert. Ihre Aussagen gelten für den damaligen Verifikationslauf vor der Bereinigung; historische Prüftreiberpfade in diesen JSON-Daten sind keine heutigen Dateiverweise. Der [Bereinigungsnachweis](../pruefnachweise/release/v3.17_RC1/cleanup-verification.json) dokumentiert die neue Strukturprüfung separat. Die weiterhin ungeprüften Browser-/Betriebssystemkombinationen und bekannten fachlichen Einschränkungen bleiben bestehen.

Commit und Push wurden nicht ausgeführt.
