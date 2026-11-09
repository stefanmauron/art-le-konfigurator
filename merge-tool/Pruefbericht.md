# Prüfbericht · Konfigurationszusammenführung v1.0.1

Stand: 8. November 2026. Geprüft gegen die unveränderte Auslieferungsdatei `dist/UTG-LE_Operating_Model_v3.16_RC3.html`.

## Ergebnis

Der vollständige Ablauf von zwei RC3-Exporten über die Zusammenführung bis zum echten Import und erneuten Export im Konfigurator ist erfolgreich geprüft. Im konfliktfreien Beispiel bleiben sämtliche fachlichen Werte erhalten. Die fachlichen SHA-256-Werte der gemeinsamen Importdatei und des anschliessenden Exports stimmen überein; der maschinenlesbare [Datenvergleich](test-results/datenvergleich.json) hält beide Werte fest.

Die Prüfung umfasst zwei synthetische Arbeitsstände mit Team 1 / Team 2 und Produkt 1 / Produkt 2 sowie Team 3 / Team 4 und Produkt 3 / Produkt 4. Jedes Team besitzt 32 unterschiedlich konfigurierte Tätigkeiten. Insgesamt werden 128 Matrixeinträge sowie Produkte, Verträge, Team-Design-Kriterien, Team-Flow-Profile und gemeinsame Kataloge geprüft. Die Zufallswerte werden mit festen Seeds erzeugt. Beide Quelldateien werden über die tatsächliche Exportfunktion des RC3-Konfigurators heruntergeladen.

## Erfolgreiche Prüfungen

| Prüfung | Nachweis |
|---|---|
| 19 Browser-Prüfgruppen | [Browser-Testbericht](test-results/browser-tests.json), keine JavaScript-Seitenfehler. |
| 39 Unit-Prüfungen | [JUnit-Ergebnis](test-results/unit-tests.xml), keine Fehler oder übersprungenen Prüfungen. |
| 200 Zufallsvarianten innerhalb einer Unit-Prüfung | Variierende Matrixwerte, unveränderte Eingaben und identisches Ergebnis bei erneutem Zusammenführen mit B. |
| Vollständiger Roundtrip | Zwei echte Exporte → Download aus dem HTML-Werkzeug → echter RC3-Import → Export → erneuter Import und Export. Fachliche Daten bleiben identisch. |
| Team-Konflikte | A/B-Auswahl übernimmt die vollständige Team-Einheit. «Beide behalten» mit neuer Team-ID, ausdrücklich geändertem Namen und Produktkopie ist tatsächlich importiert und wieder exportiert. |
| Service-Konflikte | Betroffene Teams und Tätigkeiten sichtbar. Bei «Beide behalten» neue Service-ID mit angepassten Verweisen; tatsächlicher Import/Export ohne unbeabsichtigte Änderungen. |
| Produkt- und Tätigkeitskopien | Neue Produkt-IDs und namensbasierte Matrixschlüssel richtig zugeordnet; tatsächlicher Import/Export mit identischen fachlichen Daten. |
| Bestehende Freigabe | Originale Signatur, Kategoriesignatur, Zeit und Status bleiben im Roundtrip erhalten. |
| Fehlerfälle | Beschädigte Dateien, unbekannte Felder, ungeklärte Konflikte, falsche Versionen, doppelte IDs und gebrochene Verweise sperren die Ausgabe. Dateiaustausch verwirft frühere Entscheidungen. |
| Schutz des Zielstands | Abbruch eines echten RC3-Imports und eine abgelehnte Importdatei lassen den bisherigen lokalen Speicher unverändert. |
| Darstellung | 390 und 1440 Pixel geprüft; keine horizontale Seitenüberbreite. Mobilansicht und Konfliktansicht zusätzlich visuell kontrolliert. |
| Offline | Datei direkt über `file://` bedient; beide Dateien eingelesen und JSON sowie Bericht heruntergeladen. Keine Netzwerkanfragen während dieses Ablaufs. |
| Bestehender Konfigurator | `npm test`: Lint, Build, Domain, Flow, Edges, Contract, bekannte Findings sowie Referenz-/Kandidatenbasis erfolgreich. Bekannte Findings bleiben als bestehende Einschränkungen erhalten. |

## Aussagegrenzen

Ein Test beweist nicht die Fehlerfreiheit jeder denkbaren oder zukünftigen Konfiguration. Die genannten Prüfungen belegen den Datenerhalt für die dokumentierten Szenarien und die Ablehnung der getesteten Fehlerfälle. Spätere App-Versionen sind nur bei bekanntem Exportformat unterstützt; ihre tatsächliche Laufzeit wurde nicht vorweggenommen. Andere Browser als Chrome wurden nicht separat geprüft.

Die Dateien bleiben unverändert; die Engine verändert ihre Eingabeobjekte auch bei Konflikten nicht. Gewollte A/B-Entscheidungen, Umbenennungen und neue IDs verändern das Ergebnis ausdrücklich und werden im Bericht ausgewiesen. Exportzeitpunkt, technische Navigationsauswahl und Aktualisierungszeit sind kein fachlicher Inhalt und vom Roundtrip-Vergleich ausgenommen. Die bestehenden fachlichen Freigaben werden nicht neu erteilt und ihre Signaturen nicht neu berechnet.

Die ursprüngliche Anwendung wurde nicht fachlich geändert. Es wurde weder ein Commit noch ein Push ausgeführt. Die reproduzierbaren Testbefehle und Formatgrenzen stehen in der [Werkzeugbeschreibung](README.md).

## Repository-Prüfungen

`git diff --check` und die zusätzliche Whitespace-Prüfung der neuen Textdateien sind ohne Befund. `python3 scripts/check_links.py` prüft 434 lokale Dateiverweise und meldet 80 fehlende Ziele in unveränderten Bestandsdateien. Die neuen und geänderten Dokumente verursachen keinen fehlenden Dateiverweis. Die RC3-Konfigurator-HTML ist bytegleich mit dem bisherigen Git-Stand.

## Zusätzlicher Prüflauf und behobene Findings

Die nachträglich ergänzten neun Unit-Prüfungen decken gleichzeitige Konflikte, drei nacheinander zusammengeführte Dateien, leere Team-/Produktstände, Unicode und mehrzeilige Freitexte, Namensgleichheit mit anderer Grossschreibung, Wechsel einer Konfliktentscheidung und 100 weitere gemischte A/B-Konfliktsätze ab.

**Finding 1 – Tätigkeitsname bei gleicher ID geändert:** Kategorie Datenverknüpfung, Priorität hoch. Die gewählte Katalogfassung konnte Matrixschlüssel der anderen Quelle zurücklassen; der Download blieb wegen unbekannter Tätigkeiten blockiert. Empfehlung und Umsetzung: Matrixverweise aus beiden Quellen anhand der stabilen Tätigkeits-ID an die gewählte Fassung anpassen. A und B wurden jeweils über die Werkzeugoberfläche gewählt und tatsächlich im RC3-Konfigurator importiert und wieder exportiert.

**Finding 2 – Namen zwischen zwei Tätigkeits-IDs vertauscht:** Kategorie Konfliktprüfung, Priorität hoch. Die Prüfung berücksichtigte auch verworfene Katalogfassungen und verlangte unnötige Umbenennungen. Empfehlung und Umsetzung: gewählte Fassungen berücksichtigen und Matrixschlüssel atomar umordnen. Die Zusatzprüfung belegt den Erhalt der Zuordnung zu jeder Tätigkeits-ID; der tatsächliche Import/Export bleibt fachlich identisch.

Die korrigierte Auslieferung heisst v1.0.1. Die ursprüngliche v1.0 bleibt mit der zuvor dokumentierten SHA-256 unverändert erhalten. Beide ursprünglichen Fehler blockierten die Fertigstellung des getesteten Ergebnisses; die vorherigen Standardfälle bleiben weiterhin erfolgreich.

Die fünf zusätzlichen Browser-Prüfgruppen enthalten insgesamt 21 weitere echte Import-/Export-Roundtrips: zwei A/B-Auswahlen bei umbenannter Tätigkeit, einen Namenstausch, zwei Kombinationen mit mehreren gleichzeitigen Konflikten, 15 zusätzliche Zufallsstände und einen grossen Stand aus zehn sukzessiv zusammengeführten Exporten. Dieser grosse Stand enthält 20 Teams, 20 Produkte und 640 Matrixeinträge. In allen 21 Vergleichen stimmen die fachlichen SHA-256-Werte vor und nach Import/Export überein; siehe [Zusatznachweis](test-results/additional-roundtrips.json).
