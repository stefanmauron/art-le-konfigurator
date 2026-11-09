# Bekannte Einschränkungen in v3.17 RC1

Die folgenden Beschreibungen stammen aus der [historischen Plausibilisierung von v3.15.5](https://github.com/stefanmauron/ngGEVER/blob/c75067e0c82c977b0623629423b9dcf37ac70606/version%203.3/40%20Misc/03%20UTG-Transformation/02_art-le_konfigurator/dokumentation/pruefberichte/methodische-plausibilisierung-v3.15.5-2026-11-06.md). Sie wurden für v3.17 bewusst unverändert übernommen. Der Gleichheitsvergleich von 94 methodischen Prüffällen zeigt dieselben 49 negativen Ergebnisse wie die RC2-Referenz. Die ursprünglichen Browseraussagen unten beschreiben den damaligen Prüfstand; die Bereinigung begründet keinen neuen fachlichen Entscheid.

## Findings

### MP-01 – Offene Platzhalter können als Vereinbarung gelten

**Kategorie:** Vereinbarungsstatus und Verantwortung. **Priorität:** P1.

**Beschreibung:** «Noch zu vereinbaren» wird in allen zwölf Governance-Feldern sowie in Entscheidrolle und Nachweis der sieben ART-Regeln als nichtleerer Text akzeptiert. Die Governance lässt sich damit als «Vereinbart» speichern. Der Browser reproduziert das mit der Entscheidrolle. Die anschliessende Plausibilitätsprüfung zeigt keinen entsprechenden Befund.

**Begründung:** Ein explizit offener Inhalt erhält denselben Status wie eine belastbare Vereinbarung. Die UI-Hinweise ersetzen diese fehlende Prüfung nicht. Betroffen sind 26 Modulfälle und ein Browserfall.

**Empfehlung:** Eine gemeinsame Prüfung für die bereits verwendeten Systemplatzhalter einsetzen. Als Vorschlag speichern lassen; bei «Vereinbart» offene Pflichtangaben ablehnen oder den offenen Prüfstand sichtbar beibehalten. Individuelle Freitexte nicht automatisch überschreiben. Rollen und erwartete Nachweise in ART-Regeln ebenfalls mit dieser Prüfung beurteilen.

### MP-02 – Widersprüchliche SLE wird unbeanstandet vereinbart

**Kategorie:** Flow-Prognose. **Priorität:** P2.

**Beschreibung:** Beispielsweise «110% in −3 Tagen» wird im echten Governance-Dialog als «Vereinbart» gespeichert. Die Modulprüfung erkennt auch weitere unmögliche oder klärungsbedürftige Angaben nicht. Fünf Modul- und ein Browserfall bleiben rot.

**Begründung:** Eine vorhandene Zeichenfolge sagt nichts darüber aus, ob eine nutzbare Zeit-/Wahrscheinlichkeitsaussage vorliegt. Eine ausdrücklich unbegrenzte Garantie ist keine belastbare Durchlaufzeitprognose.

**Empfehlung:** Wahrscheinlichkeit, Zeitdauer, Zeiteinheit, Geltungsbereich und Grundlage getrennt erfassen beziehungsweise einen expliziten fachlichen Prüfstatus ergänzen. Vorhandene Freitexte verlustfrei erhalten. Nicht versuchen, jede natürliche Sprache durch einige zusätzliche Regex-Regeln vollständig zu beurteilen. Vorläufige Schätzung und empirisch abgeleitete SLE unterscheiden.

### MP-03 – WIP-Angaben ohne erkennbare Begrenzung bleiben unbeanstandet

**Kategorie:** Pull und WIP-Kontrolle. **Priorität:** P2.

**Beschreibung:** «0 Features», «−2 Features», «unbegrenzt» und «Keine WIP-Begrenzung» führen in der übergreifenden Governance zu keinem Hinweis. «0 Features» lässt sich über den Dialog als vereinbart speichern. Vier Modul- und ein Browserfall bleiben rot. Die bereits vorhandene numerische WIP-Prüfung einzelner ART-Regeln ist davon getrennt und besteht weiterhin.

**Begründung:** Der Status kann eine geklärte Flusssteuerung vermitteln, obwohl die normale Begrenzung fehlt oder die Aussage eine besondere Sperrregel voraussetzt. Ein bewusstes temporäres Null-Limit muss als Ausnahme verständlich dokumentiert sein.

**Empfehlung:** Begrenzung und Geltungsbereich prüfbar modellieren. Fehlende normale Begrenzung oder Sonderfälle sichtbar zur Klärung stellen. Sonderregeln nicht stillschweigend als positive operative Kapazität interpretieren.

### MP-04 – Widersprüchliche Messgrenzen werden nicht erkannt

**Kategorie:** Flow-Messung. **Priorität:** P2.

**Beschreibung:** Start «Eintritt in Done» und Ende «Eintritt in Implementing» bleiben ebenso ohne Befund wie zweimal dasselbe Ereignis «Eintritt in Implementing». Zwei Modulprüfungen bleiben rot. Ein eigener Browser-Speicherfall wurde hierfür nicht ausgeführt.

**Begründung:** In der lokal modellierten Folge ergibt das keine eindeutig definierte positive Durchlaufzeit. Die vollständige Texteingabe ersetzt keine stimmige Messdefinition.

**Empfehlung:** Den messbaren Start und das Ende als Ereignisreferenzen mit Geltungsbereich erfassen. Gleiches oder umgekehrtes Ereignis beanstanden; getrennte Analyse- und Liefermessung ausdrücklich zulassen. Bei komplexeren Messdefinitionen einen fachlichen Prüfhinweis statt einer pauschalen linearen Annahme verwenden.

### MP-05 – ART-Policy-Typ widerspricht dem lokalen Phasenmodell

**Kategorie:** Flow-Regeln. **Priorität:** P2.

**Beschreibung:** In allen sechs frühen Zuständen wird «Abschluss» akzeptiert; bei Done bleibt «Übergang» unbeanstandet. Im Browser kann Funnel ausdrücklich als Abschluss gespeichert werden, während seine Phasenkriterien unverändert Eintritt und Übergang beschreiben. Sieben Modul- und ein Browserfall bleiben rot.

**Begründung:** Die bestehende Konsistenzprüfung beanstandet dieselbe Typverwechslung in den strukturierten Phasenkriterien, aber nicht in der zugehörigen ART-Regel.

**Empfehlung:** Policy und Phasenkriterien gemeinsam prüfen. Für dieses Modell Abschluss auf Done begrenzen oder eine bewusst abweichende Modellierung ausdrücklich kennzeichnen. Zulässige Ausführungs- und Schnittstellenregeln nicht pauschal entfernen.

### MP-06 – Import- und Review-Prüfung übersehen ungültige Referenzen

**Kategorie:** Datenintegrität und Prüfaussage. **Priorität:** P1.

**Beschreibung:** Unbekannte primäre und begleitende Tätigkeitsphasen, eine Matrixzeile ohne Katalogtätigkeit, ein Flow ohne existierendes Team und ein unbekannter Matrixstatus werden akzeptiert und vom geprüften Review nicht gemeldet. Im Browser zeigt die ART-Plausibilitätsprüfung bei der Tätigkeitsphase «Freigabekomitee» ausdrücklich «Prüfung abgeschlossen · keine Befunde». Fünf Modul- und ein Browserfall bleiben rot.

**Begründung:** Formale Zeichenfolgenprüfung sichert die fachlichen Referenzen nicht ab. Vor allem die grüne Aussage ist für diese Konfiguration zu weitgehend. In diesen Tests wurde kein Verlust gültiger Nutzerdaten beobachtet; der Befund betrifft die akzeptierte Inkonsistenz und den fehlenden Hinweis.

**Empfehlung:** Referenzen auf Zustände, Teams und Tätigkeiten sowie erlaubte Vereinbarungsstatus vor dem Import prüfen. Historische Team-Produkt-Schlüssel und bekannte Altformate ausdrücklich über bestehende Migrationen behandeln. Bei nicht eindeutig migrierbaren Resten einen präzisen Importhinweis mit Pfad anzeigen; nichts stillschweigend löschen. Die Review-Prüfung muss solche bereits gespeicherten Altbestände ebenfalls benennen können.
