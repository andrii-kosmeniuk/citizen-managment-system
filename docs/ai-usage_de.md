# Dokumentation der KI-Nutzung

## 1) Wie hast du KI verwendet?

KI wurde im gesamten Projekt hauptsaechlich fuer Erklaerungen und als Implementierungsassistent verwendet.

Um effizient zu arbeiten, wurde KI mit klaren und detaillierten Anweisungen aus `RULES.md` gesteuert. Jeder Schritt wurde einzeln umgesetzt und vor Freigabe und Commit gruendlich getestet. Dieser Ansatz hat die Effizienz verbessert, Fehler und Unklarheiten reduziert und ein tieferes Verstaendnis der einzelnen Projektprozesse ermoeglicht.


## 2) Wofür war sie hilfreich?

KI war besonders hilfreich bei:
- Debugging und der Identifikation wahrscheinlicher Fehlerursachen,
- der Erklaerung neuer Features und Implementierungsoptionen,
- der Beschleunigung repetitiver Arbeiten (Boilerplate, Dokumentationsstruktur, Route/Schema-Scaffolding),
- der Ausarbeitung klarer Schritt-fuer-Schritt-Anleitungen fuer Setup und Tests.

## 3) Wo war sie weniger hilfreich?

KI war weniger zuverlaessig bei:
- der Behebung von Problemen ohne spezifische und detaillierte Anweisungen (teilweise entstanden Schleifen),
- projektspezifischen Laufzeitproblemen, die vom lokalen Umgebungszustand abhaengen,
- Annahmen ueber den aktuellen Branch-/Commit-Status ohne Pruefung der realen Dateien,
- Randfaellen in den Business-Regeln, wenn diese nicht explizit beschrieben waren,
- der finalen Verhaltensvalidierung ohne das Ausfuehren realer Tests.

Deshalb wurden alle kritischen Ergebnisse manuell durch Code-Review, Skriptausfuehrung und Tests verifiziert.

## 4) Welche Prompts oder Arbeitsweise hast du verwendet?

### Verwendete Prompt-Muster
- "Implement phase X, run tests, and mark completion only if tests pass."
- "Suggest how the current database can be changed into a more scalable, production-ready schema."
- "Fix this API/CI error, without violating previous code progress and explain what changed."
- "Translate this documentation section and keep command examples unchanged."

### Verwendeter Workflow mit KI
1. Anforderungen in kleine, konkrete Aufgaben zerlegen.
2. KI um einen Implementierungsentwurf bitten.
3. Aenderungen in die Codebasis uebernehmen.
4. Lokale Checks/Tests ausfuehren (`check_backend.sh`, `check_frontend.sh`, `check_all.sh`).
5. Diffs manuell pruefen und Benennung/Konsistenz anpassen.
6. Dokumentation aktualisieren (README, Architektur/Spezifikation, KI-Nutzungsnotizen).
7. Push ausfuehren und CI-Ergebnisse pruefen.
8. In kleinen Schritten wiederholen, bis der gesamte Plan abgeschlossen ist.
