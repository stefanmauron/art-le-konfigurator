# v3.16 RC3 – Releasekennzeichnung

Die bisherige Refactoringbasis v3.17 RC1 wird auf Wunsch des Auftraggebers als v3.16 (RC3) gekennzeichnet. Geändert wurden die zentralen Releaseangaben, Paket- und Lockdateiversion, die aktiven Testziele und die Kennzeichnung im About-Dialog. Die fachliche Implementierung und das JSON-Speicherformat bleiben erhalten. Der lokale Speichernamensraum `utg-le-v317:` bleibt bewusst gleich, damit bereits gespeicherte Arbeitsstände erreichbar bleiben.

Die verteilbare Datei ist [UTG-LE_Operating_Model_v3.16_RC3.html](../dist/UTG-LE_Operating_Model_v3.16_RC3.html). Die frühere Refactoringdokumentation und deren Prüfnachweise beschreiben weiterhin ihren damaligen v3.17-RC1-Stand; ihre Versionsangaben wurden nicht nachträglich umgeschrieben.

## Prüfung

Alle neun aktiven Unit-/Build-/Lint-Familien bestehen, einschliesslich je 111 Basisfällen gegen Referenz und Kandidat. Sechs zusätzliche Browserprüfungen bestätigen den Offline-Start, Titel und Versionsanzeige, die aktuelle About-Kennzeichnung, Laufzeitmetadaten sowie einen echten JSON-Download mit Dateiname `UTG-LE_Konfiguration_v3.16_RC3.json`, `appVersion: "3.16"` und `releaseStage: "RC3"`. Keine unbehandelten Browserfehler.

Die Prüfungen wurden in Chrome auf macOS ausgeführt. Ein neuer vollständiger 20-Team-/40-Produkt-Lauf oder eine neue plattformübergreifende Freigabe wurde für diese Kennzeichnungsänderung nicht ausgeführt. Bekannte fachliche Einschränkungen bleiben bestehen. [Kompakter Nachweis](../pruefnachweise/release/v3.16_RC3/verification.json).

## Erneut bauen

Im Konfiguratorverzeichnis:

```sh
npm run build
npm test
npm run test:release
```

`npm ci` ist nur erforderlich, wenn Entwicklungsabhängigkeiten fehlen oder aus der Lockdatei neu installiert werden sollen. Der Release-Smoke-Test liest seine Dateinamen und Erwartungen direkt aus `release.json`. Die übrigen aktiven Vergleichstests wurden auf v3.16 RC3 nachgeführt.

Die npm-Hinweise zur abgekündigten ESLint-Version und zum blockierten esbuild-Postinstall waren keine Ursache für die bisherige falsche Versionsnummer. Der Build selbst wurde erfolgreich ausgeführt; zuvor standen die Releaseangaben noch auf v3.17 RC1. Diese Kennzeichnungsänderung beinhaltet keine Aktualisierung der Entwicklungsabhängigkeiten. Commit und Push wurden nicht ausgeführt.
