# Testfälle v3.16 (RC4)

## Gesamtlauf

`npm run test:all` führt alle 13 gepflegten Testfamilien gegen RC4 aus. Falls erforderlich, startet der Runner einen lokalen HTTP-Server auf `127.0.0.1:8773` und beendet diesen anschliessend wieder. Ein bereits laufender Server bleibt bestehen. Browserprüfungen verwenden isolierte Browserkontexte ohne persönliche Arbeitsstände. Die Protokolle liegen unter `.test-output/all-rc4/`.

Einzelne Familien können als Argumente angegeben werden, beispielsweise `npm run test:all -- test:activities test:roundtrip`. Die vollständige Konfiguration braucht wegen der tatsächlichen Speicherereignisse für 5440 Matrixfelder mehrere Minuten.

## Tätigkeiten sortieren und ergänzen

`npm run test:activities` prüft die genaue Einfügeposition vor und nach einer Zielzeile, unveränderte Inhalte und Leistungszuordnungen, Speicherung nach Neuladen, Übernahme der Reihenfolge in die Leistungsmatrix und den tatsächlichen JSON-Download. Die Pfeiltasten werden in beide Richtungen und am Listenanfang sowie am Listenende geprüft. Ein nativer Maus-Drag prüft das Scrollen am unteren Fensterrand und den Abbruch mit Escape. Neue Tätigkeiten müssen bestehende befüllte Matrixeinträge erhalten und anschliessend ebenfalls verschiebbar sein.

## Vollständiger Daten-Roundtrip

`npm run test:roundtrip` legt über die Oberfläche 30 Produkte und 20 Teams an. Die Produktzuordnung wird mit Seed `20261106` gemischt; jedes Produkt gehört genau einem Team, zehn Teams erhalten zwei Produkte und zehn Teams eines. Die Anwendung führt Leistungszuordnungen gemeinsam pro Team und blendet die frühere Produktauswahl in der Matrix aus. Deshalb umfasst der Test 20 Matrizen. Zusätzlich werden alle 30 Produktkontexte über den vorhandenen Auswahl-Handler durchgeschaltet und die sichtbaren Matrixzeilen verglichen.

Der Test verschiebt bestehende Tätigkeiten, ergänzt zwei Tätigkeiten mit eigenem Namen und eigener Beschreibung und füllt danach alle acht editierbaren Matrixfelder für sämtliche 34 Tätigkeiten jedes Teams: Ausführung, Einbindung, Zusammenarbeit, fachliche Verantwortung, technische Verantwortung, Betriebsverantwortung, LE-Service und Notiz. Das ergibt 680 Matrixzeilen und 5440 befüllte Felder. Die Matrixwerte werden über DOM-Änderungsereignisse den realen Speicherhandlern übergeben; die gespeicherten Matrizen werden nicht direkt geschrieben.

Zwischenstände werden nach dem Anlegen der Teams und Produkte, nach der ersten Sortierung, nach den neuen Tätigkeiten, nach der vollständigen Matrixbefüllung, nach der erneuten Sortierung sowie nach der Bearbeitung weiterer Konfigurationsdaten exportiert und wieder importiert. Jeder dieser sechs Durchläufe vergleicht den vollständigen fachlichen Datenbestand vor dem Export, in der heruntergeladenen Datei, nach Import und nach Neuladen. Ein abschliessender siebter Durchlauf setzt die App zuerst auf Standardwerte zurück und prüft anschliessend den Import der exportierten Konfiguration sowie alle 20 dargestellten Matrizen.

Geprüft werden auch 160 gespeicherte Kriterieneditoren für zehn Teams in sieben Phasen. Die anderen zehn Teamprofile und die ART-Regeln müssen unverändert bleiben.

## Vergleichsgrenzen

Der Vergleich enthält alle Felder von `v2`, `v3` und `organisations`, einschliesslich unbekannter Erweiterungsfelder. Die Reihenfolge von Arrays bleibt relevant; die Reihenfolge von JSON-Objektschlüsseln wird für Prüfsummen vereinheitlicht. Exportdatum und Versionsmetadaten werden separat behandelt.

Nur `v2.selected`, `v3.team`, `v3.product` und `v3.navigationEpoch` sind vom fachlichen Vergleich ausgenommen. Sie steuern die aktuelle Navigation; insbesondere erzeugt der Import eine neue Navigationskennung. Rohdaten und Navigationswerte werden zusätzlich protokolliert. Der Export darf überhaupt keinen gespeicherten Wert verändern.

Die historischen Pixelvergleiche bleiben für die unveränderten Ansichten aktiv. In der Konfiguration prüft RC4 stattdessen die unveränderten Texte und Stile bestehender Bedienelemente sowie die Position der neuen Ziehgriffe innerhalb der ursprünglichen Tabelle mit sechs Spalten. Screenshots werden bei 390, 768 und 1440 Pixeln erstellt. Die neuen Bedienelemente begründen dort eine beabsichtigte Abweichung zur RC2-Referenz.

Die Testfamilie für bekannte fachliche Negativprüfungen verlangt weiterhin dasselbe Ergebnismuster wie die RC2-Referenz. Ein erfolgreicher Vergleich dieser Familie bedeutet keine Behebung der bekannten fachlichen Befunde.

Ein bereits vollständig befüllter und geprüfter Matrixstand kann über `UTG_ROUNDTRIP_MATRIX_CHECKPOINT` fortgesetzt werden. Der Test verlangt dafür 20 erfolgreiche Matrixprüfgruppen sowie fünf übereinstimmende Roundtrip-Prüfsummen, importiert den gespeicherten Export und vergleicht dessen vollständigen fachlichen Inhalt erneut. Dieser Pfad dient der Wiederaufnahme nach einem Fehler im späteren Testablauf; ein normaler Gesamtlauf baut alle Eingaben neu auf.
