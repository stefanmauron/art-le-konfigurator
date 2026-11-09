# Refactoring v3.17 RC1 – Umsetzungs- und Testplan

Stand: 6. November 2026. Grundlage sind die zehn bestätigten [Umsetzungsvorgaben](refactoring-entscheidungen.md). Der Auftrag umfasst die eigenständige Umsetzung und Prüfung. Commit und Push sind nicht beauftragt.

## Ziel und unveränderliche Grenzen

Modularer, lesbarer Quellcode wird automatisiert in genau eine offline nutzbare HTML-Datei gebaut. Fachfunktionen, Texte, Bedienabläufe, Daten und sichtbare Zustände entsprechen der aktuellen v3.16 RC2 einschliesslich Cursor-Korrektur. Nur Versionsanzeige, Releaseinformation und Exportmetadaten kennzeichnen v3.17 RC1. Bestehende fachliche Einschränkungen bleiben dokumentiert erhalten.

RC2 und v3.17 verwenden getrennte lokale Daten und getrennte Sitzungszustände. Bestandsdaten werden ausdrücklich über JSON übertragen. Das interne Speicherformat darf sich ändern; die Übernahme ist verlustfrei und der Austausch bleibt bidirektional RC2-kompatibel. Die Zustimmung zu einem neuen Format verpflichtet nicht zu einer unnötigen Migration.

## Arbeitspakete und Reihenfolge

### 1. Referenz und Nachweisgrundlage

Die unveränderte aktuelle RC2 wird unter `tests/fixtures/reference/` kopiert. SHA-256, Dateigrösse und Zeitpunkt werden festgehalten. Bestehende Nutzeränderungen bleiben unverändert. Die Referenz wird weder generiert noch überschrieben. Referenztests und Kandidatentests laufen in isolierten Browserkontexten mit synthetischen Daten.

### 2. Lesbare Quellen und reproduzierbarer Build

Die HTML-Hülle, fachliche Scripts, Speicher-/Dateifunktionen, UI und Styles erhalten eigene Quellen mit einer expliziten Integrationsreihenfolge. Historische Script-IDs bleiben zunächst für Regressionstests nachvollziehbar. Quellcode wird formatiert. Ein Build mit festgelegten Werkzeugversionen bettet sämtliche Ressourcen ein und prüft Scriptsyntax, fehlende Ressourcen, Versionen und Wiederholbarkeit. Das erzeugte HTML liegt unter `dist/` und wird nicht von Hand bearbeitet. Das Quellmanifest dokumentiert die Herkunft jedes extrahierten Blocks.

### 3. Fachlogik, Anwendung und Schnittstellen

Browserunabhängige Regeln werden als importierbare Module extrahiert. Anwendungsoperationen und Speicheradapter erhalten explizite Zuständigkeiten. Initialisierung und Abhängigkeiten werden an einem Einstieg dokumentiert; erforderliche Übergangsadapter werden benannt. DOM-lose Fachtests importieren die extrahierten Regeln direkt. Kein pauschales Umbenennen von DOM-IDs oder fachlichen Datenelementen.

### 4. Datenhaltung und getrennte Arbeitsstände

Lokale Fach- und Sitzungsdaten von v3.17 werden von RC2 getrennt. Die JSON-Aussenschnittstelle bleibt bestehen. Prüfungen umfassen Import in beide Richtungen, alle gespeicherten fachlichen Felder, unbekannte erhaltene Felder, Speicherfehler, Retry, Reset und mehrere Tabs. Änderungen des internen Speicherformats werden nur vorgenommen, wenn sie einen belegbaren Vorteil haben und die gleiche Fehlersemantik erhalten. Kein gemeinsamer Speicher mit RC2 und keine implizite Übernahme fremder Browserdaten.

### 5. Gemeinsame UI und Styles

Drawer-Lebenszyklus, Dirty-Prüfung und Info-Komponenten erhalten gemeinsame Implementierungen. Globale Prototypänderungen werden durch explizite Instanzsteuerung ersetzt. Strukturelle DOM-Nachbearbeitung wird dort abgelöst, wo gleiches Verhalten durch direkte Komponentenerzeugung nachgewiesen werden kann. Fachlich verschiedene Tooltip-Interaktionen werden nicht still vereinheitlicht. Styles werden lesbar und nach Zuständigkeit gegliedert; Kaskadenreihenfolge und Layout bleiben erhalten. Ein Entfernen alter Regeln erfolgt nur mit Vergleichsnachweis.

### 6. Gleichheit und Regressionen

Aktive Tests werden mit einem gemeinsamen Zielparameter auf Referenz und Kandidat gerichtet. Alte Nachweise bleiben historisch. Die bestehenden fachlichen Negativfälle werden auf Abweichungen zwischen Referenz und Kandidat geprüft; ein bekannter Fehler ist kein neuer Erfolg. Vollständige Basisregressionen, zusätzliche Randfälle und der 20-Team-/40-Produkt-Rundlauf bilden den Kern. Unterschiede werden einzeln erklärt, nicht mit breit gefassten Feldfiltern versteckt.

### 7. Auslieferung und Abschluss

Geprüft wird die tatsächlich erzeugte HTML-Datei, auch beim direkten Öffnen per `file://` und ohne Netzwerk. Chrome/Edge auf Windows/macOS bilden den Unterstützungsrahmen. Nur tatsächlich ausgeführte Kombinationen werden als geprüft bezeichnet. Nicht verfügbare Kombinationen verhindern gemäss Antwort 8 nicht die Übergabe. Abschliessend werden Bedien-/Build-Anleitung, verbleibende Architekturgrenzen, Testresultate und Bundle-Prüfsumme dokumentiert.

## Vergleichsregeln

### Daten und Verhalten

Exportierte Nutzdaten müssen nach einer expliziten Normalisierung von Versionen, tatsächlich erzeugten IDs/Zeitpunkten und Navigationskontext semantisch gleich sein. Jede Normalisierung wird pro Feld begründet. Individuelle Nutztexte, Matrixfelder, Kriterien, Beurteilungen und Vereinbarungen dürfen nicht ausgeblendet werden. Dynamische Signaturen werden anhand ihrer enthaltenen Daten geprüft. Referenz und Kandidat müssen gleiche Fehlereingaben zurückweisen und gleiches Abbrechen-/Retry-Verhalten zeigen.

### Darstellung

Bei identischem Browser, Viewport, Testdatensatz und Zustand werden DOM-Inhalte, relevante Geometrien und Screenshots verglichen. Ziel ist Pixelgleichheit ausser ausdrücklich abweichenden Versionsbereichen. Abweichungen durch Rendering und dynamische Inhalte werden separat untersucht; keine pauschale Toleranz für neue Layoutunterschiede. Viewports: 1440, 768 und 390 Pixel; ergänzende Randfallprüfung bei 320 Pixeln.

### Leistung

Messungen erfolgen mit identischen 20 Teams und 40 Produkten im selben Browser auf demselben Rechner, mit einer Aufwärmrunde und mindestens fünf Messrunden je Kandidat. Start, Teamwechsel, Editor öffnen, Speichern, Import und Export werden verglichen. Vergleichswert ist der Median; Wiederholung bei auffälliger Streuung. Vorab festgelegte Nichtregressionsgrenze: höchstens 20 Prozent oder 100 ms langsamer, massgeblich ist der grössere Toleranzwert. Überschreitungen werden wiederholt und untersucht. Diese Grenzen sind eine technische Testentscheidung, keine zusätzliche Leistungszusage. Die Messwerte ersetzen keine Bedienprüfung.

## Abnahmematrix

| Prüfung | Erwartung |
|---|---|
| Referenzschutz | Referenzdatei und bisherige RC2 unverändert |
| Build | Wiederholbare einzelne HTML-Datei, keine externen Laufzeitressourcen |
| Basisregressionen | 111 bestehende Prüfungen gegen Kandidat erfolgreich |
| Fach-/Randfalltests | Keine unbegründeten Unterschiede zur Referenz |
| JSON-Austausch | RC2 → v3.17 → RC2 ohne Verlust individueller Fachdaten |
| 20 × 40 | Vollständige Matrizen, Kriterien, Beurteilungen und Vereinbarungen erhalten |
| Fehler | Speicherausfall, ungültiger Import, Abbruch und Retry abgesichert |
| Mehrere Tabs | v3.17 synchronisiert; RC2-Arbeitsstand bleibt unverändert |
| Darstellung | Gleiche Zustände und Layouts ausser Releasekennzeichnung |
| Offline | Direkt geöffnete HTML-Datei lädt keine Ressourcen nach |
| Leistung | Vorab festgelegte Vergleichstoleranzen eingehalten oder offen ausgewiesen |
| Abschluss | Tatsächlich geprüfte Browser/OS, Einschränkungen und Hash dokumentiert |

Ein Nachweis kann umfangreiche Gleichheit für die vereinbarten Fälle belegen, aber keine mathematische Garantie für jeden denkbaren Ablauf liefern. Nicht geprüfte Bereiche werden ausdrücklich benannt.

## Technische Festlegungen während der Umsetzung

Die Fach- und Sitzungsdaten werden durch einen isolierten Speicheradapter getrennt; JSON-Datenformen und logische Strukturen bleiben erhalten. Die Zustimmung zu einem neuen Format wird als Erlaubnis und nicht als Pflicht zu einer zusätzlichen Migration verstanden. Dies erhält insbesondere bestehende Validierungs-, Retry- und Rollbackpfade.

Der explizit injizierte Anwendungskontext ersetzt direkte globale Modulzugriffe in den Quellen. Die bisherigen globalen API-Namen bleiben als Kompatibilitätsweiterleitungen bestehen. Die bisherige Initialisierungsreihenfolge und die CSS-Kaskade werden im Buildmanifest festgehalten. Native Dialogprototypen werden nicht mehr verändert. Die bestehenden visuellen DOM-Nachbearbeitungen werden als benannte Kompatibilitätsbausteine erhalten; ihre vollständige Ablösung wird nicht als bereits umgesetzt dargestellt.

Die aktive Gleichheitsprüfung umfasst zusätzlich direkt importierte Fachmodule, den unveränderten Ausgang bekannter negativer Methodikfälle sowie 45 Viewport-Screenshotvergleiche über fünf Register, drei Bildschirmbreiten und drei Scrollpositionen. Die Screenshots werden bei gleicher Schrift, reduzierter Bewegung und neutraler Mausposition verglichen. Ausschliesslich die erlaubte Versionsanzeige wird in diesen Vergleichsbildern ausgeblendet; normale Desktop-/Mobilansichten werden separat visuell geprüft.

## Abschlussstand

Die Umsetzung und die Prüfungen in der verfügbaren Umgebung sind abgeschlossen. Die Ergebnisse und verbleibenden Grenzen stehen im [Release- und Verifikationsbericht](release-v3.17-rc1.md). Alle sechs Leistungsvorgänge bestehen die vorab festgelegte Nichtregressionsgrenze. 180 Beurteilungen und 20 Bestätigungen wurden zusätzlich über die Oberfläche erfasst und auf Datenerhalt geprüft. Die drei nicht verfügbaren Browser-/Betriebssystemkombinationen bleiben gemäss Antwort 8 ausdrücklich ungeprüft. Commit und Push wurden nicht ausgeführt.
