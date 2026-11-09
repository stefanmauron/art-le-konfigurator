# Funktionaler Vergleich – bereitgestellte RC2 gegen RC3

## Ergebnis

In den ausgeführten Vergleichen wurde keine fachliche Abweichung gefunden. Bei identischen Eingaben und kontrollierter Testzeit erzeugen beide Versionen dieselben gespeicherten Konfigurationsdaten und dieselben fachlichen Exportinhalte. Beide Versionen sind dennoch nicht in jeder Hinsicht identisch: Releasekennzeichnung, About-Change-log, Exportdateiname und lokaler Speicherbereich unterscheiden sich.

Die Anwendungsdateien wurden für diesen Vergleich nicht verändert. Tests und Vergleichsnachweise wurden ergänzt.

## Tatsächlich untersuchte Dateien

| Version | Datei | SHA-256 |
|---|---|---|
| RC2 | Vom Auftraggeber bereitgestellt: `/Users/stefanmauron/Desktop/99_old/UTG-LE_Operating_Model_v3.16_RC2.html` | `b034bcc892018a7b3b5c64f801b92f7589c99a7a8c4b8486fe81e241caabe6ab` |
| RC3 | [Aktuelles Auslieferungsbundle](../dist/UTG-LE_Operating_Model_v3.16_RC3.html) | `cc48d64d0365a2e4b64473151add6a9e6131b5c403191a34fc8d0035f95e6522` |

Die bereitgestellte RC2 ist bytegleich mit der bereits gesicherten RC2-Testreferenz. Der direkte Bedienvergleich öffnete ausdrücklich die Desktop-Datei per `file://`. Die zusätzlich wiederholten Vertragstests verwendeten die bytegleiche Referenz unter `tests/fixtures/reference/`. Beide Prüfsummen wurden nach dem Vergleich nochmals bestätigt.

## Bedienung und gespeicherte Ergebnisse

21 gemeinsame Vergleichspunkte wurden mit derselben Sequenz auf beiden tatsächlichen HTML-Dateien ausgeführt. Ausgangspunkt waren identische Importdaten mit 20 Teams, 40 Produkten und vollständig befüllten Matrixeinträgen. Zusätzlich wurden je ein Team und ein Produkt über die Oberfläche angelegt und wieder gelöscht.

Geprüft wurden Standardzustand, Import, Teamwechsel, Matrixnotiz, technische Verantwortung, explizite Ausführung, Rückkehr zur Servicevererbung, Statusbestätigung, anschliessende Änderung einer ART-Regel, gemeinsame Team-DoD, Beurteilung eines Design-Kriteriums, Produktanlage, Teamanlage mit Produktzuordnung, Umbenennung einer Tätigkeit samt Beschreibung, Team-/Produktlöschung, Reload, Import beider Exportversionen, Standard-Reset und Wiederherstellung des bearbeiteten Stands.

Nach jedem Vergleichspunkt waren sämtliche gespeicherten Daten gleich. Die abschliessende Gleichheitsassertion entfernt keine Felder: Auch Auswahlzustände, Navigationskennung, Zeitpunkte und Bestätigungssignaturen stimmen im kontrollierten Lauf überein. Objekt-Schlüsselreihenfolgen sind für den semantischen Vergleich unerheblich; Array-Reihenfolgen bleiben Bestandteil der Prüfung.

Die Zeiten und Zufallsfolgen wurden für beide Versionen gleich gesteuert. Bei realen Aktionen zu unterschiedlichen Zeitpunkten dürfen erzeugte IDs und Zeitstempel naturgemäss abweichen. Ihre identischen Werte im Test sind kein Versprechen gleicher IDs bei zeitversetzter Nutzung.

## Tatsächlich erzeugte Exportdateien

| Merkmal | RC2 | RC3 |
|---|---|---|
| Dateiname | `UTG-LE_Konfiguration_v3.16_RC2.json` | `UTG-LE_Konfiguration_v3.16_RC3.json` |
| `format` | `utg-le-complete` | `utg-le-complete` |
| Formatversion | `4` | `4` |
| `appVersion` | `3.16` | `3.16` |
| `releaseStage` | `RC2` | `RC3` |
| Gesamter übriger JSON-Inhalt | gleich | gleich |

Es wurden echte Browserdownloads gelesen und vollständig verglichen. Der einzige unterschiedliche JSON-Wert war `$.releaseStage`. Kein fachlicher Datenbereich wurde aus dieser Exportassertion entfernt. Die Dateinamen unterscheiden sich zusätzlich ausserhalb des JSON-Inhalts. Anschliessend wurden sowohl der RC2- als auch der RC3-Export in beide Apps importiert und die Ergebnisse verglichen. Die vollständigen heruntergeladenen Dateien liegen temporär unter `/tmp/utg-rc2-rc3-direct/`; der dauerhafte Nachweis enthält ihre Hashes und das vollständige Ergebnis des Datenvergleichs.

## Zusätzliche Regressionen auf beiden Versionen

| Prüfung | RC2 | RC3 |
|---|---|---|
| Basisregressionen | 111 bestanden | 111 bestanden |
| Flow-Modulgruppen | 18 bestanden | 18 bestanden |
| Modul-Randfälle | 68 bestanden | 68 bestanden |
| Regelvertragsfälle | 55 bestanden | 55 bestanden |
| Browserfälle zur Flow-Steuerung | 71 bestanden | 71 bestanden |
| Browser-Randfälle | 15 bestanden | 15 bestanden |
| Weitere Flow-Browsergruppen einschliesslich Import/Export | 13 bestanden | 13 bestanden |

Die Browser-Vertragstests wurden mit denselben fachlichen Erwartungen ausgeführt. Lediglich der Pfad des zu öffnenden Artefakts und der erwartete versionsabhängige Exportdateiname wurden unterschieden. Speicherfehler wurden passend zum jeweiligen physischen Speicherbereich ausgelöst. Die Ergebnislisten der 71 Steuerungs- und 15 Randfälle stimmen überein. Keine unbehandelten Browserfehler wurden gemeldet. Die Zahlen beschreiben unterschiedlich grosse Fälle und Gruppen und sind keine Coverage-Prozentzahl.

Beim Abgleich mit dem ursprünglichen Testkatalog wurde der Fall `criteria-order` als fehlend erkannt: Er war bei der früheren Konsolidierung nicht im aktiven Randfallkatalog geblieben. Seine ursprüngliche Erwartung aus Git wurde wieder aufgenommen und gegen beide Versionen bestanden. Das ist eine Korrektur des Testkatalogs, keine Änderung an einer App.

Die 94 methodischen Fälle liefern weiterhin identische Ergebnisse mit je 49 bekannten negativen Fällen. Der Vergleich belegt also auch den Erhalt dieser bekannten Einschränkungen; er erklärt sie nicht für fachlich korrekt.

## Tatsächliche Unterschiede

### F-01 – Kennzeichnung und Nutzerinformation

**Kategorie:** Releaseinformationen. **Beschreibung:** Titel, Versionsschaltfläche und Change-log zeigen unterschiedliche Releases. Der About-Change-log von RC3 beschreibt die technische Überarbeitung. **Begründung:** Diese sichtbaren Texte sind Versionsinformationen. **Bewertung:** Kein in den geprüften Fällen beobachteter Unterschied der fachlichen Berechnung oder Datenverarbeitung. **Priorität:** Hinweis.

### F-02 – Getrennter lokaler Speicher

**Kategorie:** Datenübernahme. **Beschreibung:** RC2 verwendet die drei Schlüssel `gever-art-leistungsmatrix-v1`, `gever-art-v3-config` und `gever-art-v34-decisions`. RC3 verwendet diese Schlüssel mit dem Präfix `utg-le-v317:`. **Begründung:** Beide Arbeitsstände sind dadurch getrennt. **Empfehlung:** Den RC2-Arbeitsstand explizit exportieren und in RC3 importieren. Das blosse Öffnen von RC3 übernimmt den RC2-Arbeitsstand nicht automatisch. **Priorität:** Wichtig für den Versionswechsel.

### F-03 – Exportkennzeichnung

**Kategorie:** Dateiaustausch. **Beschreibung:** Der Dateiname und `releaseStage` unterscheiden sich. Alle anderen Werte des kontrollierten Exportlaufs waren gleich. **Bewertung:** Fachliche Inhalte und Importierbarkeit sind in den geprüften Fällen gleich; die Dateien sind wegen der Kennzeichnung nicht byteidentisch. **Priorität:** Hinweis.

## Grenzen

Geprüft wurde Chrome 156.0.8078.80 auf macOS, mit isolierten Kontexten und synthetischen Daten. Der direkte Bedienvergleich lief offline über `file://`; zusätzliche Browser-Verträge liefen über den lokalen Testserver. Keine Aussage wird über bisher ungeprüfte Windows-/Edge-Kombinationen, identische Laufzeit oder jeden denkbaren Bedienablauf getroffen. Die 20 Teams und 40 Produkte wurden für diesen Vergleich identisch importiert; ein neuer vollständiger CRUD-Aufbau aller 60 Objekte in beiden Versionen wurde nicht behauptet.

Der [kompakte Gesamtnachweis](../pruefnachweise/release/v3.16_RC3/vergleich-rc2/ergebnis.json) und der [Bedienvergleich mit Datenhashes je Schritt](../pruefnachweise/release/v3.16_RC3/vergleich-rc2/bedienvergleich.json) halten den Umfang fest. Commit und Push wurden nicht ausgeführt.
