# v3.16 (RC4)

Tätigkeiten können unter «Tätigkeiten verwalten» am Ziehgriff neben der primären Flow-Phase mit der Maus verschoben werden. Eine Linie zeigt die Einfügeposition; am oberen und unteren Fensterrand scrollt die Seite während des Ziehens. Alternativ verschieben die Pfeiltasten den fokussierten Griff nach oben oder unten.

Die Reihenfolge wird im bestehenden Tätigkeitskatalog gespeichert und von der Leistungsmatrix übernommen. Phasenzuordnungen und Inhalte bleiben erhalten. JSON-Export und -Import führen die Reihenfolge mit. RC4 verwendet denselben lokalen Speichernamensraum wie RC3; beim Wechsel über einen anderen Dateiablageort kann ein JSON-Export und -Import nötig sein.

Die RC3-Datei bleibt unverändert unter `dist/` erhalten. RC4 wird als einzelne offline nutzbare HTML-Datei ausgeliefert.

Prüfung: `npm run verify`, `npm test`, `npm run test:release` und `node tests/activity-order.cjs`. Der Browsercheck verschiebt eine der 32 Tätigkeiten mit der Maus, prüft die unveränderten Tätigkeitsinhalte, die Reihenfolge nach Neuladen, die Pfeiltastenbedienung, die tatsächlichen Zeilen der Leistungsmatrix und den JSON-Download.

Die ergänzte Gesamtsuite und der Datentest sind im [Prüfbericht RC4](pruefbericht-v3.16-rc4.md) mit importierbarer Testkonfiguration dokumentiert.
