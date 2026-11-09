# Refactoring – Antworten und Umsetzungsvorgaben

Dieses Dokument hält die Antworten des Auftraggebers aus dem Vorbereitungsgespräch fest. Es bildet die Grundlage für den anschliessenden detaillierten Umsetzungs- und Testplan. Es ändert keinen strategischen Entscheidstatus von ngGEVER.

## Auftrag

Die App v3.16 (RC2) soll intern modularisiert werden und weiterhin als einzelne eigenständige HTML-Datei übergeben werden können. Der Auftraggeber verlangt umfangreiche Tests, die die Übereinstimmung mit der aktuellen v3.16 (RC2) belegen. Die Fragen werden einzeln im Chat beantwortet. Nach Abschluss der Klärung wird ein detaillierter Plan erstellt und anschliessend eigenständig umgesetzt. Commit und Push bleiben separat zu autorisieren.

## 1. Verbindliche Übereinstimmung

**Antwort vom 6. November 2026:** «a» – Verhalten und Darstellung erhalten.

Funktionen, Texte, Bedienabläufe, Daten und sichtbare Zustände bleiben erhalten. Bekannte fachliche Einschränkungen werden übernommen und dokumentiert. Technische Implementierungsdetails dürfen sich ändern. Unbeabsichtigte Abweichungen gelten als Fehler. Gestalterische Vereinheitlichungen und fachliche Fehlerkorrekturen sind nicht Bestandteil dieses Refactorings.

## 2. Verbindliche Vergleichsbasis

**Antwort vom 6. November 2026:** «a» – aktuelle v3.16 RC2 einschliesslich der Entfernung des Fragezeichen-Mauszeigers.

Die aktuelle Datei `UTG-LE_Operating_Model_v3.16_RC2.html` bildet die Vergleichsbasis. Vor dem Umbau wird dieser Stand unverändert gesichert und mit einer Prüfsumme gekennzeichnet. Die ursprünglich ausgelieferte RC2 ohne Cursor-Korrektur ist nicht die verbindliche Referenz.

## 3. Unterstützte Browser und Betriebssysteme

**Antwort vom 6. November 2026:** «a» – Chrome und Edge auf Windows und macOS.

Der verbindliche Prüfrahmen umfasst beide Browser auf beiden Betriebssystemen sowie das direkte Öffnen der einzelnen HTML-Datei ohne Server. Safari und Firefox gehören nicht zum vereinbarten Prüfrahmen. Technisch nicht ausführbare Prüfungen werden als offen ausgewiesen; sie dürfen nicht als bestanden gelten.

## 4. Speicherformat und Datenkompatibilität

**Antwort vom 6. November 2026:** «b» – neues internes Speicherformat zulassen.

Das interne Speicherformat darf geändert werden. Bestehende Daten müssen verlustfrei migriert werden. JSON-Import und -Export bleiben mit RC2 kompatibel: Bestehende RC2-Exporte bleiben importierbar, neue Exporte bleiben durch RC2 importierbar. Migration, Fehlerbehandlung und Erhalt individueller Daten benötigen gesonderte Prüfungen. Die Wahl eines neuen Formats bedeutet noch keine Festlegung auf eine bestimmte Speichertechnologie.

## 5. Übernahme bestehender Arbeitsstände

**Antwort vom 6. November 2026:** «a» – Übernahme über JSON-Export und -Import.

Nutzer exportieren ihren Arbeitsstand aus RC2 und importieren ihn in die refaktorierte App. Dieser Dateiaustausch ist der verbindliche Übernahmeweg, unabhängig von Dateiname und Ablagepfad der HTML-Datei. Eine automatische Übernahme vorhandener RC2-Browserdaten ist nicht beauftragt. Die in Antwort 4 verlangte Migration betrifft die verlustfreie Überführung importierter Bestandsdaten in das neue interne Format.

## 6. Verbindlicher Datenumfang der Abnahme

**Antwort vom 6. November 2026:** «a» – 20 Teams und 40 Produkte.

Der verbindliche Abnahmeumfang umfasst 20 Teams und 40 Produkte mit vollständigen Leistungsmatrizen sowie individuellen Kriterien, Beurteilungen und Vereinbarungen. Referenz und refaktorierte App werden mit identischen Testdaten verglichen. Der Umfang knüpft an das bestehende Rundlaufszenario an; daraus folgt noch keine zusätzliche Leistungszusage.

## 7. Leistungsanforderung

**Antwort vom 6. November 2026:** «a» – keine relevante Verschlechterung gegenüber RC2.

Referenz und refaktorierte App werden mit identischen Daten und Abläufen verglichen: Start, Teamwechsel, Öffnen von Editoren, Speichern sowie Import und Export. Wiederholte Messungen berücksichtigen normale Schwankungen. Messverfahren und konkrete Toleranzen werden vor dem Umbau im Testplan festgelegt. Eine verbindliche Beschleunigung oder zusätzliche gezielte Leistungsoptimierung ist nicht beauftragt.

## 8. Abschluss bei begrenzt verfügbaren Testumgebungen

**Antwort vom 6. November 2026:** «b» – Abschluss mit den verfügbaren Testumgebungen.

Die Umsetzung darf nach erfolgreicher Prüfung in den verfügbaren Testumgebungen abgeschlossen und übergeben werden. Nicht ausführbare Kombinationen aus Chrome/Edge und Windows/macOS werden ausdrücklich als ungeprüft ausgewiesen. Daraus darf keine vollständige browser- und betriebssystemübergreifende Verifikation abgeleitet werden. Der vereinbarte Unterstützungsrahmen aus Antwort 3 bleibt bestehen.

## 9. Kennzeichnung der refaktorierten Version

**Antwort vom 6. November 2026:** «a» – v3.17 RC1.

Die refaktorierte App wird als v3.17 RC1 gekennzeichnet. Versionsanzeige, About-Text und Exportmetadaten dürfen dafür angepasst werden. Diese Änderungen sind ausdrückliche Ausnahmen vom ansonsten verbindlichen 1:1-Vergleich mit der gesicherten RC2-Referenz. Der About-Text beschreibt den technischen Umbau und behauptet keine zusätzlichen fachlichen Funktionen oder behobenen bekannten Einschränkungen. Das JSON-Format bleibt RC2-kompatibel.

## 10. Trennung der lokalen Arbeitsstände

**Antwort vom 6. November 2026:** «a» – getrennte Speicherung.

RC2 und v3.17 verwenden getrennte lokale Speicherbereiche. Beide Versionen können parallel verglichen werden, ohne ihre Arbeitsstände gegenseitig zu verändern. Der Austausch erfolgt explizit über JSON. Die Synchronisation zwischen mehreren Tabs von v3.17 bleibt erhalten.

## Abschluss der Klärung

Die wesentlichen Vorgaben sind geklärt. Auf dieser Grundlage werden der detaillierte Umsetzungs- und Testplan erstellt und das Refactoring eigenständig ausgeführt. Technische Detailentscheidungen trifft der Entwickler innerhalb dieser Vorgaben; neue Abweichungen vom vereinbarten Verhalten benötigen eine ausdrückliche Entscheidung.

Die Umsetzung als v3.17 RC1 ist abgeschlossen. [Umsetzungsplan](refactoring-umsetzungsplan-v3.17-rc1.md) und [Verifikationsbericht](release-v3.17-rc1.md) dokumentieren Durchführung und Nachweise. Die Antworten oben bleiben unverändert die fachliche Vorgabe.
