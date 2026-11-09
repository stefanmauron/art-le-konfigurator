# v3.17 RC1 – Refactoring und Verifikation

Stand: 6. November 2026. Die Umsetzung folgt den zehn [bestätigten Vorgaben](refactoring-entscheidungen.md) und dem [Umsetzungsplan](refactoring-umsetzungsplan-v3.17-rc1.md).

## Geltung nach der Bereinigung

Dieser Bericht dokumentiert den ursprünglichen v3.17-Verifikationslauf vor der Verzeichnisbereinigung. Aussagen zur damals vorhandenen zweiten RC2-Kopie und zu früheren Prüftreiberpfaden sind historisch. Die aktuelle Struktur und ihre Nachprüfung stehen im [Bereinigungsnachweis](bereinigung-v3.17-rc1.md). Die zwölf ursprünglichen Einzelnachweise und ihre Prüfsummen bleiben unverändert erhalten.

## Ergebnis und Übergabe

Die [einzelne HTML-Datei v3.17 RC1](../dist/UTG-LE_Operating_Model_v3.17_RC1.html) enthält die gesamte ausführbare App. Sie ist 577’802 Bytes gross. Nutzer benötigen keine weiteren Dateien und keinen Server. Das Dateiformat für JSON-Konfigurationen bleibt mit RC2 kompatibel. Bestehende Arbeitsstände werden ausdrücklich per Export und Import übernommen; die lokalen Speicher von RC2 und v3.17 sind getrennt.

Im Repository liegen formatierte JavaScript- und CSS-Quellen mit getrennten Fachmodulen, Anwendungskontext, Speicher-/Dateiadaptern und UI-Bausteinen. Der Build bettet diese in ein eigenständiges HTML ein. Die Versionsangaben werden zentral geführt. Native Dialogprototypen werden nicht mehr überschrieben. Statische Prüfungen, direkt importierte Fachtests und Bundlevergleiche sind im aktuellen Testeinstieg zusammengeführt. [Architektur und Entwicklungsanleitung](refactoring-architektur-v3.17-rc1.md).

Die bisherige RC2-Datei und die gesicherte Referenz sind gegenüber dem vereinbarten Ausgangsstand einschliesslich Cursor-Korrektur unverändert. Es wurden keine bekannten fachlichen Einschränkungen korrigiert. Ein Commit oder Push wurde nicht ausgeführt.

## Geprüfter Stand

```text
RC2-Referenz: b034bcc892018a7b3b5c64f801b92f7589c99a7a8c4b8486fe81e241caabe6ab
v3.17 RC1:   827644997f5d838950b2d4e0e4a4399e2dafa5dbfec4ac301d495e8973267877
```

Der [Gesamtnachweis](../pruefnachweise/release/v3.17_RC1/verification.json) verknüpft die kompakten Einzelnachweise über Prüfsummen. Der Build wurde aus verschiedenen Aufrufverzeichnissen mit identischem Ergebnis geprüft. Ein früher gefundener Unterschied in generierten Quellkommentaren wurde durch ein festes Build-Arbeitsverzeichnis beseitigt. Alle abschliessenden Browser- und Rundlaufnachweise beziehen sich auf die oben genannte Bundle-Prüfsumme.

## Verhalten, Daten und Darstellung

| Prüfung | Ergebnis |
|---|---|
| Statische Prüfungen | Keine fehlenden Variablen, Mehrfachdeklarationen oder unerreichbaren Anweisungen gemäss den aktivierten Regeln. |
| Build und Speicherisolation | 23 Prüfungen bestanden; Referenzschutz, Wiederholbarkeit und Namensraumtrennung eingeschlossen. |
| Basisregressionen | Dieselben 111 Fälle gegen Referenz und Kandidat bestanden. |
| Direkt importierte Fachmodule | 128 deterministisch variierte Konfigurationen; 2’821 Assertions bestanden. Das ist keine Coverage-Prozentzahl. |
| Zusätzliche Unit-Prüfungen | 18 Flow-Gruppen, 68 Randfälle und 55 Regelvertragsfälle bestanden. |
| Vergleich beider Apps | 101 Browserprüfpunkte bestanden: gespeicherte Daten, sichtbare Texte, Layout-Geometrien, berechnete Styles, Dateiaustausch, Tab-Synchronisation und Offline-Start. |
| Bildvergleich | 45 pixelgleiche Viewport-Bilder: fünf Register × drei Breiten × obere, mittlere und untere Scrollposition. |
| Weitere Browserprüfungen | 71 Flow-Steuerungsfälle, 15 Randfälle und 13 Flow-Ablaufgruppen bestanden. |
| Grosser Oberflächenrundlauf | 50 Prüfgruppen bestanden; 20 Teams und 40 Produkte tatsächlich per CRUD erstellt, alle 5’120 Matrixfelder über die echten Handler befüllt und 160 Kriterien-Editorvorgänge gespeichert. |
| Beurteilungen und Vereinbarungen | 44 zusätzliche Prüfgruppen bestanden; alle 180 Beurteilungen und 20 Statusbestätigungen über die tatsächliche Oberfläche erfasst und auf Erhalt geprüft. |

Die Angaben zählen unterschiedlich grosse Fälle, Gruppen und Assertions und werden deshalb nicht zu einer vermeintlichen Gesamtabdeckung addiert.

Beim grossen Rundlauf wurden Export, Standard-Reset, Reimport und zusätzlicher Reload geprüft. Alle fachlichen Daten blieben gleich. Die vier bekannten Navigationsfelder `v2.selected`, `v3.team`, `v3.product` und `v3.navigationEpoch` wurden gesondert geprüft; ihre behandelten Unterschiede sind im Rundlaufnachweis ausgewiesen. Individuelle Texte, Kriterien, Matrixfelder und Vereinbarungen wurden nicht aus dem Vergleich entfernt.

Die 180 Beurteilungen und 20 Bestätigungen blieben einschliesslich ihrer Notizen, Zeitpunkte und Signaturen beim Import in die originale RC2 sowie nach Reset, Reimport und Reload in v3.17 erhalten. Zusätzlich blieb ein synthetisches unbekanntes Erweiterungsfeld im allgemeinen Austausch erhalten.

Die Bildvergleiche liefen seriell mit derselben Chrome-Version, reduzierter Bewegung, neutraler Mausposition und festem Renderingprofil. Ausschliesslich die ausdrücklich abweichende Versionsanzeige wurde ausgeblendet. Berechnete Styles und Geometrien wurden zusätzlich verglichen. Die normalen Desktop- und Mobilansichten wurden separat visuell geprüft. Frühere schwankende Aufnahmen mit laufenden Animationen beziehungsweise parallelen Compositor-Aufnahmen wurden nicht als neuer Layoutfehler oder als erfolgreicher Abschlussnachweis gewertet.

Der direkte Offline-Start über `file://` wurde mit gesperrtem Netzwerk geprüft. Die App lud keine externen Ressourcen nach. Der Austausch nach RC2 verwendet einen echten Browserdownload und den tatsächlichen Importdialog. Speicherfehler, Retry, Konflikte und das Erhalten offener Eingaben sind in den Basis- und Browserfällen enthalten.

## Unveränderte fachliche Einschränkungen

Von 94 methodischen Prüfungen schlagen in beiden Versionen dieselben 49 fehl. Die vollständigen Einzelresultate sind identisch. Diese Ergebnisse gehören zu den bereits akzeptierten Befundgruppen MP-01 bis MP-06; sie bleiben offen. Grün ist hier ausschliesslich der Gleichheitsvergleich, nicht die fachliche Erfüllung dieser negativen Fälle. [Nachweis der unveränderten Befunde](../pruefnachweise/release/v3.17_RC1/known-findings.json).

## Geschwindigkeit

Gemessen wurde in Chrome auf macOS über `file://` mit identischen 20 Teams und 40 Produkten, einer Aufwärmrunde und fünf wechselweise ausgeführten Messrunden. Die Werte enthalten Browserautomatisierung und sind Vergleichswerte, keine verbindlichen Antwortzeiten für andere Rechner. Während dieser Messungen liefen keine weiteren Browser- oder Lastprüfungen.

| Vorgang | RC2: Median | v3.17: Median | Nichtregression |
|---|---|---|---|
| Start | 314 ms | 314 ms | bestanden |
| Teamwechsel | 200 ms | 198 ms | bestanden |
| Speichern | 223 ms | 223 ms | bestanden |
| Editor öffnen | 43 ms | 34 ms | bestanden |
| Export | 63 ms | 63 ms | bestanden |
| Import | 424 ms | 427 ms | bestanden |

Alle sechs Vergleiche bestehen die vorab festgelegte Grenze: höchstens 20 Prozent oder 100 ms langsamer, massgeblich ist der grössere Toleranzwert. Es wird keine allgemeine Beschleunigung und keine Freigabe grösserer Konfigurationen behauptet. [Messwerte und Einzelrunden](../pruefnachweise/release/v3.17_RC1/performance.json).

## Grenzen und verbleibende Architekturarbeit

Tatsächlich geprüft wurde Chrome 156.0.8078.80 auf macOS. Edge auf macOS sowie Chrome und Edge auf Windows waren nicht verfügbar und bleiben ungeprüft. Gemäss Antwort 8 verhindert dies die Übergabe nicht. Eine Prüfung dieser drei Kombinationen wird durch diesen Bericht nicht behauptet.

Die früheren 22 historischen Prüffamilien wurden nicht unverändert als Gesamtaudit wiederholt. Der neue aktive Prüfrahmen ist oben und in den Einzelnachweisen aufgeführt. Umfangreiche Szenarien belegen Übereinstimmung für die geprüften Zustände; sie garantieren nicht jeden denkbaren Ablauf.

Die bestehenden globalen API-Namen bleiben als Weiterleitungen erhalten. Visuelle DOM-Nachbearbeitungen und CSS-Kaskaden wurden für die belegte Darstellungsübereinstimmung beibehalten. Das interne logische Mehrschlüsselformat mit seiner bestehenden Rollbackbehandlung wurde nicht durch eine neue atomare Speichertechnologie ersetzt. Dies sind dokumentierte Kompatibilitätsgrenzen; der Umbau wird nicht als vollständiger Ersatz aller historischen Implementierungsmuster dargestellt.

`git diff --check` besteht. Die lokale Linkprüfung meldet weiterhin 81 bereits bestehende fehlende Ziele und 34 historische Pfadnennungen. Die neuen Verweise wurden separat mitgeprüft; es entstanden keine neuen fehlenden lokalen Ziele. Externe Linkziele wurden nicht geprüft.
