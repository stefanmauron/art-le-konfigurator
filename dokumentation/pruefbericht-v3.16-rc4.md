# Prüfbericht v3.16 (RC4)

Prüfung vom 10. November 2026. Alle 13 Testfamilien wurden gegen die RC4-Datei ausgeführt. Die sieben Export-/Importdurchläufe des Datenszenarios zeigen keine fachlichen Datenabweichungen. Die bekannten fachlichen Negativprüfungen bleiben separat offen.

## Datenszenario

Über die Oberfläche wurden 20 Teams und 30 Produkte angelegt. Die mit Seed `20261106` gemischte Zuordnung enthält jedes Produkt genau einmal; jedes Team hat ein oder zwei Produkte. Zwei zusätzliche Tätigkeiten erweitern den Katalog von 32 auf 34 Tätigkeiten. Alle 680 Matrixzeilen enthalten acht befüllte Felder, insgesamt 5440 Werte. Nach der zweiten Sortierung wurden sämtliche 30 Produktkontexte gegen die erwarteten Team-Matrizen geprüft. Die frühere Produktauswahl ist in der gemeinsamen Team-Matrix ausgeblendet; der Test durchläuft dafür den vorhandenen Auswahl-Handler und vergleicht die sichtbaren Zeilen. Nach dem abschliessenden Reset und Reimport wurden alle 20 Matrizen erneut in der Oberfläche verglichen.

Die Matrixbefüllung verwendet die tatsächlichen Speicherhandler. Neue Tätigkeiten und Produkt-/Teamdatensätze werden über ihre Dialoge erstellt. Der zusätzliche Tätigkeiten-Test prüft ausserdem das Ergänzen und Verschieben einer neuen Tätigkeit bei bereits bestehenden befüllten Zuordnungen.

Zusätzlich wurden 160 Kriterieneditoren für zehn Teams und sieben Phasen gespeichert und die unveränderten übrigen Teamprofile sowie ART-Regeln geprüft.

[Importierbare Testkonfiguration](../tests/fixtures/rc4/20-teams-30-produkte.json) · [Maschinenlesbare Ergebnisse](../tests/results/rc4/pruefergebnisse.json) · [Testfälle und Befehle](teststrategie-v3.16-rc4.md)

## Export und Import

Der grosse UI-Lauf wurde nach der vollständigen Befüllung und fünf erfolgreichen Roundtrips fortgesetzt: Der Test hatte beim anschliessenden Produktvergleich eine sichtbare Produktauswahl erwartet. Der korrigierte Zugriff verwendet den bestehenden ausgeblendeten Auswahl-Handler. Die Fortsetzung prüft die 20 erfolgreichen Matrixgruppen und die fünf gespeicherten Prüfsummen, importiert den geprüften Zwischenstand und vergleicht dessen vollständigen Inhalt erneut. Die ursprünglichen Prüfprotokolle bleiben unter `.test-output/roundtrip-matrix-checkpoint/` erhalten; der Wiederherstellungsnachweis ist in den maschinenlesbaren Ergebnissen enthalten.

| Zwischenstand | Vor Export / Datei / Import / Neuladen |
| --- | --- |
| 20 Teams / 30 Produkte angelegt | identisch |
| erste Sortierung | identisch |
| zwei neue Tätigkeiten | identisch |
| alle 20 Matrizen mit 34 Tätigkeiten vollständig befüllt | identisch |
| Sortierung nach vollständiger Befüllung | identisch |
| Kriterien und übrige Konfiguration vollständig | identisch |
| Export → Standard-Reset → Import → Neuladen | identisch |

Jeder Zwischenstand wurde tatsächlich heruntergeladen und über die Importoberfläche eingelesen. Beim letzten Durchlauf wurde die App vor dem Import auf Standardwerte zurückgesetzt. Namen, Beschreibungen, IDs, Produktzuordnungen, Matrixwerte und die Tätigkeitsreihenfolge blieben erhalten. JSON-Objektschlüssel werden für den Vergleich sortiert; die Reihenfolge von Arrays bleibt Bestandteil des Vergleichs.

Nur `v2.selected`, `v3.team`, `v3.product` und `v3.navigationEpoch` werden als Navigationskontext separat protokolliert. Der Import erzeugt eine neue Navigationskennung. Das Exportdatum gehört zur Dateihülle. Der Export selbst verändert keinen gespeicherten Wert.

Fachliche Prüfsumme des abschliessenden Durchlaufs, identisch vor Export, in der Datei, nach Import und nach Neuladen:

`4fc84081c8fdc816eb935edb77bd05154f9a660ea07d25bfb20ec36749a222d0`

## Testfamilien

| Familie | Ergebnis |
| --- | --- |
| `npm run verify` | bestanden |
| `npm run test` | bestanden |
| `npm run test:flow-basic` | bestanden |
| `npm run test:flow` | bestanden |
| `npm run test:edges` | bestanden |
| `npm run test:assessments` | bestanden |
| `npm run test:browser` | bestanden |
| `npm run test:compare-versions` | bestanden |
| `npm run test:performance` | bestanden |
| `npm run test:merge` | bestanden |
| `npm run test:release` | bestanden |
| `npm run test:activities` | bestanden |
| `npm run test:roundtrip` | bestanden |

Der Regressionsteil umfasst unter anderem 2821 Domänenprüfungen, 18 Flow-Gruppen, 68 Randfallprüfungen, 55 Vertragsprüfungen und je 111 Basistests für Referenz und RC4. Die neuen Tätigkeiten-Tests umfassen 16 Prüfgruppen; die Browser-Kompatibilität umfasst 101 Prüfgruppen ohne ausgelassene Fälle. Die Performanceprüfung besteht für Start, Teamwechsel, Speicherung, Editor, Export und Import. Die Merge-Familie umfasst 39 Unit-Tests sowie ihre Browser- und Import-/Exportprüfungen gegen RC4.

Die historischen Darstellungsvergleiche bleiben für unveränderte Ansichten aktiv. Die Konfiguration prüft gezielt die neuen Ziehgriffe und erstellt Screenshots bei 390, 768 und 1440 Pixeln; dort wird keine Pixelgleichheit zur RC2-Konfiguration behauptet.

## Offene Befunde und Prüfgrenzen

Die bestehende methodische Negativsuite enthält 94 Prüfungen, davon 49 erwartungsgemäss negative Ergebnisse. Das Muster entspricht exakt der RC2-Referenz. Diese fachlichen Befunde wurden durch RC4 nicht behoben; sie sind keine beim Daten-Roundtrip neu entstandenen Abweichungen.

Geprüft wurde mit isoliertem Chrome auf macOS. Automatisches Scrollen ist im neuen Maus-Test am unteren Fensterrand nachgewiesen, einschliesslich Abbruch mit Escape. Andere Browser und ein manueller Touch-Test sind nicht Teil dieses Nachweises.

Die lokale Linkprüfung meldet weiterhin drei bestehende historische Zielverweise im Konfiguratorbereich. Die neuen Bericht-, Ergebnis- und Fixture-Verweise wurden geprüft. `git diff --check` ist ohne Befund.

RC3 bleibt byte-identisch zum bestehenden Git-Stand. In diesem Prüfauftrag wurde kein Anwendungscode geändert und kein Commit oder Push ausgeführt.

## Produktzuordnung

| Team | Zugeordnete Produkte |
| --- | --- |
| Roundtrip-Team 01 | Roundtrip-Produkt 13, Roundtrip-Produkt 18 |
| Roundtrip-Team 02 | Roundtrip-Produkt 12, Roundtrip-Produkt 17 |
| Roundtrip-Team 03 | Roundtrip-Produkt 08, Roundtrip-Produkt 21 |
| Roundtrip-Team 04 | Roundtrip-Produkt 09, Roundtrip-Produkt 30 |
| Roundtrip-Team 05 | Roundtrip-Produkt 19, Roundtrip-Produkt 25 |
| Roundtrip-Team 06 | Roundtrip-Produkt 23, Roundtrip-Produkt 27 |
| Roundtrip-Team 07 | Roundtrip-Produkt 05, Roundtrip-Produkt 24 |
| Roundtrip-Team 08 | Roundtrip-Produkt 16, Roundtrip-Produkt 20 |
| Roundtrip-Team 09 | Roundtrip-Produkt 03, Roundtrip-Produkt 26 |
| Roundtrip-Team 10 | Roundtrip-Produkt 02, Roundtrip-Produkt 15 |
| Roundtrip-Team 11 | Roundtrip-Produkt 22 |
| Roundtrip-Team 12 | Roundtrip-Produkt 10 |
| Roundtrip-Team 13 | Roundtrip-Produkt 28 |
| Roundtrip-Team 14 | Roundtrip-Produkt 07 |
| Roundtrip-Team 15 | Roundtrip-Produkt 04 |
| Roundtrip-Team 16 | Roundtrip-Produkt 01 |
| Roundtrip-Team 17 | Roundtrip-Produkt 11 |
| Roundtrip-Team 18 | Roundtrip-Produkt 29 |
| Roundtrip-Team 19 | Roundtrip-Produkt 14 |
| Roundtrip-Team 20 | Roundtrip-Produkt 06 |

## Artefakt

Geprüfte Datei: `dist/UTG-LE_Operating_Model_v3.16_RC4.html`

SHA-256: `d2aa4d8e976e2298f378d5320206d2c780ab3bce0ae3d78e679e21011360aaeb`

Der Gesamtlauf lässt sich mit `npm run test:all` wiederholen. Die Ausführung dieses Nachweises erfolgte in zwei überlappenden Läufen: elf Familien im Sammelrunner und die Tätigkeiten- sowie vollständige Roundtrip-Familie separat. Die maschinenlesbaren Ergebnisse führen alle 13 Familien zusammen. Die ursprünglichen Einzelprotokolle liegen unter `.test-output/all-rc4/`, `.test-output/activities/` und `.test-output/roundtrip/`.
