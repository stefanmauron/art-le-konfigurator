# Testeingaben für v3.17 RC1

Diese Dateien sind aktive Testabhängigkeiten der aktuellen Version, keine zusätzlich auszuliefernden Apps.

| Datei | Verwendung |
|---|---|
| `reference/UTG-LE_Operating_Model_v3.16_RC2.html` und `reference/manifest.json` | Eine einzige unveränderte Vergleichsreferenz mit gesicherter Prüfsumme für Fach-, Browser-, Import-/Export- und Leistungsprüfungen. Die vom Nutzer gelöschte Kopie im Hauptverzeichnis ist nicht erforderlich. |
| `import-compatibility.json` und zugehörige Provenienz | Bytegleich übernommene Importkonfiguration für Kompatibilität und reproduzierbare Lastdaten. |
| `migration-criteria.json` | Aus den früheren Kriterienmodellen abgeleitete Datensätze, ein Teamprofil und eine historische Signatur als unabhängige Regressionseingaben. Herkunfts-Commit und Quellprüfsummen sind eingebettet. Alte HTML-Anwendungen werden dafür nicht geladen. |

Die Daten sind synthetisch. Die Referenzdatei und die Herkunft bestehender Fixtures dürfen nicht durch neu generierte aktuelle Daten ersetzt werden, nur um einen Test grün zu machen. Die früheren 18 Flow-Gruppen und 68 Randfälle bleiben mit diesen Eingaben erhalten.
