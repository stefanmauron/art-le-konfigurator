# UTG-LE-Konfigurationen zusammenführen · v1.0.1

Die [einzelne HTML-Datei](../dist/UTG-LE_Konfiguration_zusammenfuehren_v1.0.1.html) lokal im Browser öffnen. Sie benötigt weder Server noch Installation oder Internetverbindung. Konfigurationsdaten werden nicht übertragen und nicht im Browser-Speicher abgelegt.

## Bedienung

1. Unter **Datei A** den bestehenden Export von Laptop 1 auswählen.
2. Unter **Datei B** den hinzuzufügenden Export von Laptop 2 auswählen.
3. Allfällige Unterschiede prüfen und entscheiden. Bei gleichen Namen unterschiedlicher Objekte einen eindeutigen Namen für das Objekt aus B eingeben und das Eingabefeld verlassen.
4. Die gemeinsame Import-JSON und bei Bedarf den Zusammenführungsbericht herunterladen.
5. Vor dem Import den aktuellen Stand im Konfigurator exportieren. Anschliessend die gemeinsame JSON mit der bestehenden Importfunktion laden. Dieser Import ersetzt den dortigen Stand durch das zusammengeführte Ergebnis.

Für einen direkten Versuch stehen zwei echte, im RC3-Konfigurator erzeugte Exporte bereit: [Laptop 1 mit Team 1 / Team 2 und Produkt 1 / Produkt 2](tests/fixtures/Laptop-1.json) und [Laptop 2 mit Team 3 / Team 4 und Produkt 3 / Produkt 4](tests/fixtures/Laptop-2.json). Matrizen, Rollen, Team-Kriterien und Verantwortlichkeiten enthalten unterschiedliche, mit festen Seeds erzeugte Testwerte. Das [zusammengeführte Ergebnis](tests/fixtures/Zusammengefuehrt.json) ist ebenfalls vorhanden. Alle Personen, Produkte und Vereinbarungen darin sind synthetisch.

## Bestätigte Regeln

Die folgenden Regeln wurden im Chat vor der Umsetzung einzeln bestätigt.

| Gegenstand | Verhalten |
|---|---|
| Auslieferung | Separate, vollständig lokale HTML-Datei. |
| Versionen | Ab v3.16 RC3; spätere App-Versionen nur mit bekanntem, geprüftem Exportformat. Unbekannte Felder oder Schemas sperren die Ausgabe, statt Daten wegzulassen. |
| Quellen | A ist der bestehende Stand, B die Ergänzung. Keine automatische Konfliktpriorität. |
| Umfang | Alle unterstützten exportierten fachlichen Daten einschliesslich Beziehungen, Team-Vereinbarungen, Kriterien, Services und bekannter historischer Archive. |
| Fehlende Inhalte | Kein Löschauftrag; Inhalte der jeweils anderen Datei bleiben erhalten. |
| Identische Objekte | Einmal übernehmen. JSON-Schlüsselreihenfolge ist für den Vergleich unerheblich. |
| Gleiche ID, unterschiedliche Inhalte | A, B oder bei Katalogobjekten und Teams «Beide behalten». Ein Team wird zusammen mit seiner Matrix, seinen Kriterien, Verantwortlichkeiten und Bestätigungen ausgewählt. |
| Gleicher Name, unterschiedliche IDs | Objekte bleiben getrennt. RC3 lehnt doppelte Namen ab; deshalb ist vor dem Download eine ausdrückliche Umbenennung für B nötig. Das Werkzeug führt Objekte nicht nach Namen zusammen. |
| Beide behalten | Neue kollisionsfreie ID für B. Typisierte Verweise, Team-Schlüssel und namensbasierte Tätigkeitszuordnungen werden angepasst. Freitext wird nicht durchsucht oder verändert. |
| Gemeinsame Inhalte | Konfliktanzeige mit betroffenen Teams und Tätigkeiten; die Auswahl eines Services gilt für seine Verwendungen im Ergebnis. |
| Produktverantwortung | Ein Produkt darf nur ein verantwortliches Team haben. Bei einer Kollision verantwortliches Team wählen oder ausdrücklich getrennte Produktkopien erzeugen; deren neue Namen und IDs erscheinen im Ergebnis und Bericht. |
| Globale Regeln | Unterschiedliche Policies, ART-Kriterien und Governance-Werte ausdrücklich auswählen. Sie können nicht gleichzeitig in zwei widersprüchlichen Fassungen gelten. |
| Fehler | Ungeklärte Konflikte, ungültige Daten und gebrochene Verweise sperren den JSON-Download. Hinweise allein sperren ihn nicht. |
| Nachweis | Vorschau und JSON-Bericht mit Dateinamen, SHA-256 der Eingaben, Entscheidungen, Umbenennungen und Prüfergebnis. Ein Bericht kann auch einen noch ungeklärten Stand dokumentieren; `ready` zeigt den Status. |

## Datenerhalt und Grenzen

Die Eingabedateien werden ausschliesslich gelesen. Die Merge-Engine arbeitet mit Kopien. Im konfliktfreien Prüffall bleiben sämtliche fachlichen Werte beider Quellen erhalten. Eine bewusst gewählte Fassung A/B, eine ausdrückliche Umbenennung oder eine Produktkopie kann das Ergebnis ändern; der Bericht weist diese Entscheidungen aus. «Keine Datenänderung» bedeutet daher keine unbeabsichtigte Änderung und keine Änderung der Originaldateien, nicht die gleichzeitige Gültigkeit widersprüchlicher Angaben.

Navigation, Exportzeitpunkt und Export-Metadaten stammen aus A. Der Konfigurator erzeugt beim Import einen neuen Navigationskontext und beim Export einen neuen Zeitstempel. Diese technischen Angaben sind vom fachlichen Vergleich ausgenommen. Unkonfigurierte Teams dürfen ohne Matrix erhalten bleiben; vorhandene Matrixwerte werden vollständig bewahrt.

Bestehende Statusbestätigungen werden als ursprüngliche Nachweise erhalten. Ihre Signaturen werden nicht neu berechnet: Das wäre eine neue fachliche Bestätigung. Geänderte gemeinsame Inhalte oder neue IDs können deshalb im Konfigurator eine erneute Bestätigung erforderlich machen.

Unterstützt werden das vollständige Exportformat `utg-le-complete`, Exportversion 4, Daten-Schema 3, `seven-states-v1` und Flow-Kriterienversion 1. Bekannte Datenstrukturen werden zusätzlich zur originalen RC3-Importvalidierung auf ihre Verweise geprüft. Legacy-Produktmatrizen und nicht leere Legacy-Team-Assignments werden abgelehnt. Historische Organisationsdaten bleiben erhalten; bei solchen Daten wird «Beide behalten» blockiert, weil darin enthaltene Identitätsbezüge nicht sicher umgeschrieben werden können. Globale Auswahlkataloge werden additiv vereinigt. Pro Eingabedatei gilt eine Grössenbegrenzung von 30 MB.

Eine spätere App-Version allein ist kein Kompatibilitätsnachweis. Das Werkzeug kann dieselbe bekannte Struktur verarbeiten, benötigt bei neuen Strukturen aber eine Erweiterung. Die tatsächlichen Import-/Export-Prüfungen beziehen sich auf den vorhandenen v3.16-RC3-Konfigurator. Die Tests verwenden isolierte Chrome-Profile; bestehende Benutzerarbeitsstände werden nicht berührt. Safari und Firefox sind nicht separat geprüft.

## Entwicklung und Prüfung

Im übergeordneten Konfiguratorverzeichnis:

```sh
npm run build:merge
npm run test:merge
```

`test:merge` baut die einzelne HTML-Datei, erzeugt die beiden RC3-Testexporte über echte Browser-Downloads, prüft den Download und Import der Zusammenführung, führt Konflikt-/Fehlerfälle aus und startet danach die Unit- und Zufallstests. Für Browserprüfungen wird Playwright über `PLAYWRIGHT_MODULE` oder den bestehenden lokalen Fallbackpfad geladen. Chrome muss installiert sein. Der Testtreiber startet seinen eigenen kurzlebigen lokalen Server und beendet ihn wieder; die ausgelieferte HTML-Datei braucht keinen Server.

Die fachlichen Validatoren werden direkt aus dem bestehenden Konfigurator eingebunden. Seine Anwendung und seine Auslieferungsdatei werden für dieses Werkzeug nicht geändert. [Prüfergebnisse](test-results/browser-tests.json), [Datenvergleich mit fachlichen SHA-256-Werten](test-results/datenvergleich.json) und [Zusammenführungsbericht des Beispiels](test-results/zusammenfuehrungsbericht.json) dokumentieren den erfolgreichen Lauf. Der [Prüfbericht](Pruefbericht.md) beschreibt die Aussagegrenzen.

## Korrektur v1.0.1

Die erweiterten Tests zeigten zwei blockierende Randfälle: unterschiedliche Namen derselben Tätigkeit und zwischen zwei Tätigkeits-IDs vertauschte Namen. Die A/B-Auswahl passt jetzt namensbasierte Matrixverweise über die stabile Tätigkeits-ID an. Alle Schlüssel werden in einem Schritt umgeordnet, damit vertauschte Namen keine Matrixwerte überschreiben. Namensprüfungen berücksichtigen die gewählten Katalogfassungen. Verweisanpassungen stehen in Vorschau und Zusammenführungsbericht.

Die [vorherige Fassung v1.0](../dist/UTG-LE_Konfiguration_zusammenfuehren_v1.0.html) bleibt unverändert als historischer Stand erhalten; für neue Zusammenführungen v1.0.1 verwenden. Die zusätzlichen Roundtrips sind mit fachlichen Prüfsummen im [ergänzenden Testnachweis](test-results/additional-roundtrips.json) dokumentiert.
