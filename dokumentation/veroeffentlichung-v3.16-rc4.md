# Veröffentlichung v3.16 (RC4)

Das eigenständige Repository `stefanmauron/art-le-konfigurator` übernimmt RC4 mit Tätigkeits-Sortierung, den erweiterten Tests und dem importierbaren Teststand mit 20 Teams und 30 Produkten. Die README verweist auf den aktuellen Download, erklärt die Sortierung und führt durch Nutzung und Tests.

Die zwischenzeitliche Löschung der früheren Dokumentation in Commit `152a64739d6d4ed17d77829bb73ba45c33859587` bleibt erhalten. Ergänzt werden ausschliesslich die neuen RC4-Unterlagen. RC3 und das Zusammenführungswerkzeug bleiben als Dateien erhalten.

## Eigenständiger Build und Herkunft

Die Build- und Testpfade sind auf das Repository-Hauptverzeichnis ausgerichtet. Das Repository benötigt keine übergeordneten ngGEVER-Verzeichnisse. Die ursprünglichen RC4-Prüfnachweise unter `tests/results/rc4/` beschreiben den vorausgehenden ngGEVER-Prüflauf; sie werden nicht nachträglich als neuer vollständiger CRUD-Aufbau im eigenständigen Repository ausgegeben.

Der eigenständige Build hat eine andere Byte-Prüfsumme, weil die erzeugten Quellpfad-Kommentare kürzer sind. Alle 57 JavaScript-Scriptblöcke wurden mit Acorn geparst und ihre vollständigen Syntaxbäume ohne Quellpositionen und rohe Literalschreibweisen verglichen. Sie sind gleich. Auch das gesamte HTML und CSS ausserhalb der Scriptblöcke ist identisch.

| Artefakt | SHA-256 |
| --- | --- |
| RC4 aus dem ngGEVER-Prüflauf | `d2aa4d8e976e2298f378d5320206d2c780ab3bce0ae3d78e679e21011360aaeb` |
| Eigenständig gebautes RC4 | `19fba46f55ea2782ed42f06431508ea91913224ad6cd5997be8c18ed37726885` |

## Erneuter Datenvergleich

Die bereitgestellte Konfiguration mit 20 Teams, 30 Produkten, 34 Tätigkeiten und 5440 befüllten Matrixfeldern wurde über den tatsächlichen Importdialog des eigenständig gebauten RC4 geladen. Der vollständige fachliche Inhalt stimmt mit der Eingabedatei überein.

Anschliessend wurde eine Tätigkeit mit der Maus verschoben und eine weitere Tätigkeit über den Drawer hinzugefügt. Alle vorhandenen Matrixeinträge blieben unverändert. Ein tatsächlicher JSON-Download, dessen Reimport und anschliessendes Neuladen erhielten den gesamten resultierenden fachlichen Datenbestand. Die vier Navigationsfelder werden wie im ursprünglichen Prüfbericht separat behandelt. Keine unbehandelten Browserfehler wurden gemeldet.

[Maschinenlesbarer Daten- und Artefaktvergleich](../tests/results/rc4/veroeffentlichung-datenpruefung.json).

## Regressionen für die Veröffentlichung

Alle zwölf zusätzlichen Testfamilien sind bestanden. Die [Ergebnisse des Sammellaufs](../tests/results/rc4/veroeffentlichung-testfamilien.json) halten den geprüften Artefakt-Hash und die Einzelergebnisse fest. Der Lauf umfasst Buildprüfung, Unit-/Domänen-/Vertragsregressionen, Tätigkeiten, Flow-Abläufe, Flow-Steuerung, Randfälle, Beurteilungen, Browser-Kompatibilität, Versionsvergleich, Performance, Merge-Werkzeug und Releaseprüfung.

Der vollständige Aufbau aller 5440 Felder wird für die Veröffentlichung nicht erneut durchgeführt. Sein bereits ausgeführter Nachweis bleibt im [RC4-Prüfbericht](pruefbericht-v3.16-rc4.md) erhalten; der zusätzliche Import-/Exportlauf oben prüft die Übernahme dieses Datenbestands in das tatsächlich veröffentlichte Artefakt. Die bekannten fachlichen Negativprüfungen bleiben unverändert offen.
