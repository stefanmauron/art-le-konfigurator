# Qualitätsstrategie und Testreview – v3.16 RC3

Die folgenden Findings und Vorschläge beruhen auf der aktuellen Testorganisation, den Release-Nachweisen und den dokumentierten fachlichen Einschränkungen. Dies ist ein Review mit empfohlenem Zielzustand; es wurden dafür keine Anwendungsregeln, Tests oder Freigabestatus geändert. Die ursprüngliche 1:1-Vorgabe bleibt die Basis der Refactoringabnahme. Fachliche Korrekturen müssen künftig ausdrücklich als beabsichtigte Abweichungen mit eigenen Erwartungen behandelt werden.

## Ausgangslage

Die App besitzt direkte Fachmodultests, Regressionen gegen das erzeugte HTML, Browserabläufe, Datenrundläufe, Fehlerprüfungen und gesicherte Vergleichsdaten. Das ist eine tragfähige Grundlage. Ein umfassender Nachweis wird jedoch noch nicht durch einen einzelnen Releaseablauf erzwungen. `npm test` führt neun Unit-/Build-/Lint-Familien aus; die Browser-, Rundlauf-, Leistungs- und Release-Smoke-Tests sind eigene Befehle. Der letzte RC3-Nachweis dokumentiert neun Familien und sechs Offline-Releaseprüfungen, keinen neuen vollständigen 20×40-Lauf und keine Prüfung aller Zielplattformen.

Die Kompatibilitätsprüfung vergleicht 94 methodische Fälle und akzeptiert, dass in beiden Versionen dieselben 49 Fälle negativ ausfallen. Dies bestätigt den vereinbarten Erhalt der RC2-Eigenschaften. Es bestätigt nicht deren fachliche Richtigkeit. Der Vergleich verlangt aktuell sogar einen fehlschlagenden Einzelprüfprozess; eine fachliche Behebung muss deshalb aus der unveränderlichen Gleichheitserwartung herausgelöst werden.

## Findings und Empfehlungen

### QT-01 – Unabhängige fachliche Erwartungen festlegen

**Kategorie:** Methodische und fachliche Richtigkeit. **Priorität:** P1.

**Beschreibung:** Viele Erwartungen beruhen auf dem Vergleich mit RC2 oder auf Mustern in Standardtexten. Fachliche Entscheidungen zu Statusbedeutung, Phasengrenzen und gültigen Referenzen sind dadurch nicht vollständig unabhängig von der vorhandenen Implementierung geprüft.

**Begründung:** Ein Vergleich übernimmt auch Fehler des Vorgängers. Das Vorkommen von «DoD» in einem Text beweist keine stimmige Regel. Eine gespeicherte manuelle Bestätigung beweist keine tatsächliche Kriterienerfüllung.

**Empfehlung:** Einen fachlich geprüften Regelkatalog mit stabilen IDs aufbauen. Pro Regel Zweck, Geltungsbereich, erlaubte/unerlaubte Zustände, positive Beispiele, Gegenbeispiele, Grenzfälle und erwartete Meldung festhalten. ART-Governance, manuelle Teamvereinbarung und Kriterienbeurteilung getrennt behandeln. Fachliche Zustimmung erfolgt zu diesen Beispielen; Tests übersetzen sie anschliessend in ausführbare Erwartungen. Die erwarteten Ergebnisse werden nicht durch dieselbe zu prüfende Berechnungsfunktion erzeugt.

### QT-02 – Bekannte Fehler von grüner Kompatibilität trennen

**Kategorie:** Freigabe und Fehlerbehandlung. **Priorität:** P1.

**Beschreibung:** Der Gleichheitsvergleich ist erfolgreich, obwohl 49 methodische Fälle weiterhin fehlschlagen. Sechs dokumentierte Befundgruppen betreffen unter anderem offene Pflichtangaben, ungültige Referenzen und zu weitgehende positive Prüfaussagen.

**Begründung:** Eine ausschliesslich grüne Prozessanzeige kann eine höhere Produktqualität vermitteln, als tatsächlich geprüft ist. Der bestehende Gleichheitsvertrag würde zudem eine gewollte Korrektur als Abweichung beanstanden.

**Empfehlung:** Drei Ergebnisse getrennt führen: technische Regression, fachliche Akzeptanz und Vergleich mit dem Vorgänger. Normative Tests für bestätigte Regeln bleiben echte Freigabekriterien. Bekannte Fehler werden mit Befund-ID und Auswirkung geführt; nach einer Korrektur muss der fachliche Test erfolgreich werden. Der alte Referenzvergleich kennzeichnet exakt diese Regel als beabsichtigt geändert. Keine pauschale Normalisierung und keine Umdeklaration eines unerfüllten Fachtests zum Erfolg. Zuerst MP-01 und MP-06 fachlich klären und korrigieren; anschliessend MP-02 bis MP-05. Dies ist eine Empfehlung und keine bereits erteilte Freigabe zur Änderung der Regeln.

### QT-03 – Direkt importierbare Module als primäre Unit-Testgrenze nutzen

**Kategorie:** Testbarkeit. **Priorität:** P1.

**Beschreibung:** Ein Teil der aktuellen Regressionen extrahiert Scriptblöcke oder Codefragmente aus HTML. Ein Adapter vereinheitlicht dabei die lexikalische Form und den Anwendungskontext. Andere Fachprüfungen importieren bereits die Module direkt.

**Begründung:** Quelltextsuche kann bei einer Umbenennung scheitern, obwohl das Verhalten unverändert ist. Ein eigener DOM-Harness kann zugleich Browserunterschiede übersehen. Eine hohe Assertionszahl beseitigt diese Grenzen nicht.

**Empfehlung:** Die bestehenden fachlichen Erwartungen schrittweise auf öffentliche Modul- und Anwendungsschnittstellen übertragen. Fachregeln ohne DOM testen; Anwendungsbefehle mit kontrollierten Speicheradaptern prüfen. Schema-, Migrations- und Speicherintegration gesondert testen. Die alten Prüfungen erst ablösen, wenn ihre konkreten Anforderungen gleichwertig abgedeckt sind. Ein kleiner Bundle-Vertragstest bestätigt weiterhin, dass die getesteten Module korrekt eingebettet und initialisiert werden.

### QT-04 – Zustandsfolgen und Fehlereintritt systematisch prüfen

**Kategorie:** Funktionale Zuverlässigkeit und Datenintegrität. **Priorität:** P1.

**Beschreibung:** Speicherfehler, Retry, individuelle Teamdaten, Kriterienänderungen und Rundläufe sind bereits in Tests enthalten. Viele Fehler können jedoch erst aus einer Reihenfolge von Aktionen oder einer Kollision mehrerer Bearbeitungen entstehen.

**Begründung:** Ein einzelner erfolgreicher Speichervorgang belegt nicht das Verhalten nach Löschen, Kontextwechsel, Wiederholung und Reload. Ein statisch eingefrorener Zeitpunkt ist für Vergleiche hilfreich, deckt aber zeitliche Konflikte nicht allein ab.

**Empfehlung:** Modellbasierte Aktionsfolgen mit reproduzierbaren Seeds ergänzen. Beispielsweise Team anlegen, Produkt zuordnen, Service umbenennen, Vereinbarung bestätigen, Kriterien ändern, Tab wechseln, Speicherfehler auslösen, erneut speichern und exportieren. Nach jedem Schritt dieselben Invarianten prüfen: gültige Beziehungen, Isolation anderer Teams, unveränderte nicht betroffene Daten und nachvollziehbarer Bestätigungsstand. Fehlereintritt nach jedem Teil-Schreibvorgang sowie beim Rollback prüfen. Zeit und IDs kontrollierbar, aber gezielt fortschreitend machen; weitere Browserfälle mit echter Zeit und echten Storage-Ereignissen behalten. Wenn ein Test eine architektonisch ungesicherte Schreibkonkurrenz nachweist, muss die Speicherung verbessert werden; zusätzliche Tests allein lösen den Konflikt nicht.

### QT-05 – Reproduzierbare Browserprüfungen mit Fehlerdiagnose statt Erfolg durch Wiederholung

**Kategorie:** Testdurchführung und Darstellung. **Priorität:** P1.

**Beschreibung:** Strikte Screenshotvergleiche zeigten bereits schwankende Resultate. Ein expliziter Schalter kann Pixelprüfungen überspringen; der Bereinigungslauf dokumentiert diese Einschränkung korrekt.

**Begründung:** Ein Test, der zufällig scheitert, verliert als Freigabekriterium seinen Wert. Ein erneuter erfolgreicher Lauf erklärt den ersten Fehlschlag nicht. Umgekehrt ist nicht jede Rasterabweichung ein fachlicher oder funktionaler Fehler.

**Empfehlung:** Browser-, Betriebssystem-, Schrift-, Viewport-, Bewegungs- und Renderingprofil festlegen. Auf benannte UI-/Speicherzustände warten, nicht auf beliebige Pausen. Fehlgeschlagene Abläufe mit Screenshotpaar, relevanten Daten und Browsertrace nachvollziehbar machen. Layout, zugängliche Texte, Bedienbarkeit und Pixelvergleich als unterschiedliche Aussagen führen. Visuelle Vergleichsbilder getrennt pro Plattform pflegen. Wiederholungen sind ein Diagnosemittel und werden ausgewiesen; ein erst beim zweiten Versuch bestandener Pflichtfall zählt nicht still als stabil. Übersprungene Pflichtprüfungen sperren eine uneingeschränkte Freigabe.

### QT-06 – Genau das geprüfte Bundle freigeben

**Kategorie:** Releaseprozess. **Priorität:** P1.

**Beschreibung:** Build und Testbefehle sind getrennt. Mehrere Prüftreiber enthalten konkrete Release-Dateinamen und Versionserwartungen. Ein manueller Versionswechsel musste deshalb an mehreren Stellen nachgeführt werden.

**Begründung:** Ein erfolgreiches `npm run build` sagt nichts über die vollständige Releaseprüfung aus. Ein späterer Neubau oder eine manuelle Auswahl des falschen HTML kann den Zusammenhang zwischen Nachweis und verteiltem Artefakt auflösen.

**Empfehlung:** Einen Releaseablauf entwerfen, der Version und Zielpfad zentral aus `release.json` ableitet, Paketmetadaten auf Konsistenz prüft, einmal in ein separates Prüfverzeichnis baut und genau diese Datei durch alle Pflichtprüfungen führt. Vor und nach jeder Familie den Hash prüfen. Erst nach bestandenem Gate wird dieselbe Datei zur Verteilung übernommen; danach kein weiterer Neubau. Der Bericht nennt Hash, Quellstand, Werkzeug-/Browserstände, Fall-IDs, Fehler, Wiederholungen, übersprungene Fälle und akzeptierte Einschränkungen. Erwartete Fachbefunde und technische Abbrüche dürfen nicht verwechselt werden.

### QT-07 – Plattformen und lokale Datei als eigenen Vertrag prüfen

**Kategorie:** Kompatibilität. **Priorität:** P1 für Zielplattformen, P2 für zusätzliche Bedienfälle.

**Beschreibung:** Unterstützungsziel sind Chrome und Edge auf Windows und macOS. Aktuelle Nachweise stammen aus Chrome auf macOS. Der direkte Offline-Dateistart ist vorhanden, aber nicht auf allen vier Kombinationen belegt.

**Begründung:** Tests mit einer Browserengine oder einem HTTP-Server ersetzen nicht sämtliche Datei-, Download-, Dialog- und Speicherbedingungen der tatsächlich verteilten HTML-Datei.

**Empfehlung:** Die vier vereinbarten Kombinationen in einer verfügbaren automatisierten Umgebung oder einem wiederholbaren manuellen Abnahmeablauf prüfen. Priorität haben direkter Start per `file://`, gesperrtes Netzwerk, Import, Export, Speicherausfall, Reload, mehrere Tabs und Tastaturbedienung. Installation und Infrastruktur werden erst bei Umsetzung gewählt. Fehlende Plattformnachweise bleiben sichtbar. Die bisherige Zustimmung zum Abschluss mit verfügbaren Umgebungen ist keine allgemeine Bestätigung der ungeprüften Plattformen; eine künftig strengere Freigaberegel muss ausdrücklich vereinbart werden.

### QT-08 – Wirksamkeit und Wartbarkeit des Testkatalogs messen

**Kategorie:** Testqualität und Betrieb. **Priorität:** P2.

**Beschreibung:** Die Nachweise zählen Fälle, Gruppen und Assertions unterschiedlich. Sie liefern keine einheitliche Aussage darüber, welche kritische Regel durch welchen Test abgesichert ist.

**Begründung:** Viele Tests können dieselbe Verzweigung prüfen und eine andere unbeobachtet lassen. Eine hohe globale Coverage-Zahl kann dasselbe Problem verdecken.

**Empfehlung:** Eine Zuordnung von Regel-ID über Risiko und Modul bis zum automatisierten Fall führen. Branch-Coverage auf kritischen Fach-, Validierungs-, Migrations- und Fehlerpfaden nutzen. Für diese Module gezielte Mutationstests einsetzen: Eine absichtlich veränderte Bedingung muss mindestens einen relevanten Test scheitern lassen. Unentdeckte Mutationen beurteilen, nicht durch belanglose Assertions einen Score erhöhen. Jeden behobenen Nutzerfehler zunächst reproduzieren und als Regression behalten. Werkzeuge und Abhängigkeiten kontrolliert warten; Infrastrukturfehler, Produktfehler und instabile Tests gesondert erfassen.

## Konkrete Beispiele für einen fachlichen Testvertrag

| Regelbeispiel | Zu entscheidende Erwartung und Test |
|---|---|
| Governance erhält «Vereinbart» trotz offener Entscheidrolle | Verbindlich festlegen, ob Speichern abzuweisen ist oder der offene Prüfstand den vereinbarten Status ausschliesst. Als Vorschlag muss die unvollständige Eingabe verlustfrei erhalten bleiben. Nicht pauschal mit dem separaten manuellen Teamstatus gleichsetzen. |
| Import enthält Matrix für unbekanntes Team | Zulässiges Altformat ausdrücklich migrieren; eine tatsächlich ungültige Referenz präzise melden. Kein stiller Verlust und kein Überschreiben des bisherigen Arbeitsstands bei Ablehnung. |
| Tätigkeit wird nach einer Bestätigung geändert | Bestätigungszeitpunkt und damalige Bestätigung erhalten; den abweichenden aktuellen Stand sichtbar markieren. Keine automatische neue Freigabe. |
| Beschreibung wird ohne Namensänderung bearbeitet | Alle Zuordnungen, Notizen und anderen Teamprofile bleiben unverändert. Bereits vorhandene Handlerprüfungen um weitere Aktionsfolgen und Dateirundläufe ergänzen. |
| Nach Teilfehler wird erneut gespeichert | Entwurf bleibt erhalten, kein falsches Erfolgsfeedback, Wiederholung erzeugt keinen doppelten Datensatz. |

## Empfohlene Durchführung

| Zeitpunkt | Pflichtumfang im vorgeschlagenen Zielprozess |
|---|---|
| Jede Änderung | Statische Prüfung, direkte Modul-/Anwendungs-/Integrationstests, Buildvertrag und kurzer Browser-Smoke. |
| Änderung an einem Fachbereich | Zusätzlich alle zugeordneten positiven, negativen, Grenz- und Migrationsfälle sowie zugehörige Browserabläufe. |
| Release Candidate | Frischer vollständiger End-to-End-Lauf mit 20 Teams und 40 Produkten, 5’120 Matrixfeldern, individuellen Kriterien, Beurteilungen und Bestätigungen; Fehler-/Konfliktfälle, Import/Export, Offlineprüfung, vorgeschriebene Plattformen und Nichtregressionsmessung auf dem unveränderten Kandidaten. |
| Stabilitätsprüfung | Variierte Seeds, längere Aktionsfolgen, neue Tabs, wiederholte Reloads und Speicherdruck. Laufzeit und Seeds werden protokolliert. |

Eine automatisierte Umgebung soll aus einer frischen Installation der Lockdatei starten. Im lokalen Repository wurde kein `.github`-Workflow gefunden; damit ist keine Aussage über eine ausserhalb des Repositorys eingerichtete Testumgebung verbunden. Ob die Ausführung lokal, auf einem CI-Rechner oder in einer Plattformmatrix erfolgt, ist nach Verfügbarkeit festzulegen. Die Nutzer erhalten weiterhin nur eine HTML-Datei.

## Vorgeschlagenes Freigabegate

Keine unbehandelten Laufzeitfehler; kein Datenverlust oder stilles Überschreiben konkurrierender Änderungen; keine offenen bestätigten kritischen bzw. hoch priorisierten Produktfehler; alle fachlich bestätigten Pflichtregeln erfüllt; alle vorgeschriebenen Tests tatsächlich ausgeführt; keine unbegründete Änderung visueller Baselines; bestehende Konfigurationen verlustfrei übernommen; Leistungsgrenzen innerhalb der festgelegten Toleranz; Nachweise gehören exakt zum verteilten Bundle. Verbleibende niedrigere Risiken werden einzeln bewertet und vom verantwortlichen Produktentscheider akzeptiert, nicht durch einen pauschalen grünen Vergleich verdeckt.

Die Umsetzung sollte mit dem unabhängigen Fachkatalog und den sechs bekannten Befundgruppen beginnen. Danach folgen zentrale Releasekonfiguration, ein gemeinsamer Gate-Runner und die Ablösung der Quelltext-Schnittprüfungen. Zustandsfolgen, Plattformmatrix und Wirksamkeitsmessung werden auf dieser Grundlage ausgebaut. Eine Fehlerfreiheitsgarantie ergibt sich daraus nicht; der messbare Fortschritt ist ein nachweislich erfüllter Regelkatalog ohne bekannte kritische Fehler und mit reproduzierbaren Freigaben.
