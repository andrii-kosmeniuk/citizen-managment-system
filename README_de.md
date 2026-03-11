# Bürgeranliegen-Management-System

## 1) Problemstellung

Dieses Projekt wurde entwickelt, um Bürgeranliegen zu verwalten und schneller zu lösen.

Es gibt zwei Hauptrollen: "Citizen" und "Worker":
- "Citizen" kann Anliegen erstellen, um Hilfe bitten und Kommentare zum Problem schreiben.
- "Worker" kann Bürgeranliegen ansehen, Anliegen zuweisen, den Status aktualisieren und Kommentare hinzufügen.

Das Ziel dieses Projekts ist es, eine saubere Projektarchitektur und ein skalierbares Datenbanksystem mit Backend- und einfacher UI-Integration zu demonstrieren. Ebenso soll die Effizienz der Entwicklung mit KI-Agenten gezeigt werden.

## 2) Schnellstart (Docker)

### Voraussetzungen
- Docker
- Docker Compose

### 2.1) Klonen

```bash
git clone https://github.com/andrii-kosmeniuk/citizen-managment-system.git && cd citizen-managment-system
```

### 2.2) Starten

```bash
docker compose up --build
```

Im Browser öffnen:
- Frontend: `http://localhost:5173`
- Backend-API-Dokumentation: `http://localhost:8000/docs`

### 2.3) Stoppen

```bash
docker compose down
```

### 2.4) Stoppen & DB zurücksetzen

```bash
docker compose down -v
```

### 2.5) Zusätzliche Prüfungen (optional)

```bash
./scripts/check_all.sh --fast   # schnelle lokale Prüfungen
./scripts/check_all.sh          # vollständige Prüfungen + Security-Scan
```

DB zurücksetzen (optional, sauberer Zustand):

```bash
./scripts/run_fullstack.sh --fresh
```

DB-Hinweis:
- Frische Resets/Bootstrap verwenden `database/current_schema.sql`.
- Inkrementelle Aenderungen fuer bestehende Datenbanken bleiben in `database/migrations/`.


## 3) Nur Datenbank

### 3.1) Nur DB starten

```bash
docker compose up -d db
```

### 3.2) SQL-Shell öffnen

```bash
docker compose exec db psql -U postgres -d citizen_requests
```

### 3.3) Testabfragen

```sql
\dt
SELECT * FROM category;
SELECT * FROM citizen_request;
```

### 3.4) SQL-Shell verlassen

```sql
\q
```

## 4) Full Stack ohne Docker

Es gibt zwei Moeglichkeiten:
- das Hilfsskript verwenden, um alles auf einmal zu starten (4.1)
- DB, Backend und Frontend manuell starten (4.2 - 4.4)

### 4.1) Alles mit einem Befehl starten

```bash
./scripts/run_fullstack.sh
./scripts/run_fullstack.sh --fresh   # DB vorher zuruecksetzen
```

### 4.2) DB starten

```bash
docker compose up -d db
docker compose ps   # pruefen, ob sie laeuft
```

### 4.3) Backend starten

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
export DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/citizen_requests"
uvicorn app.main:app --reload --port 8000
```

### 4.4) Frontend starten

```bash
cd frontend
npm install
npm run dev
```

### API-Beispiele
- `GET /health`
- `GET /categories`
- `POST /categories`
- `GET /requests`
- `POST /requests`
- `GET /requests/{id}`
- `POST /requests/{id}/claim`
- `PATCH /requests/{id}/status`
- `POST /requests/{id}/comments`

### 4.5) Qualitaetspruefungen

Backend-Prüfungen:

```bash
./scripts/check_backend.sh
```

Frontend-Prüfungen:

```bash
./scripts/check_frontend.sh
```

Alle Prüfungen ausführen:

```bash
./scripts/check_all.sh
```

Optionaler Security-Scan (wenn `trivy` installiert ist):

```bash
./scripts/security_scan.sh
```

## 5) Statische Analyse + Sicherheit + CI/CD (GitHub)

Dieses Repository enthält jetzt:
- Statische Codeanalyse in der CI:
  - Backend: `ruff` + Tests
  - Frontend: Typecheck/Lint + Tests + Build
- Security-Scan in der CI:
  - `trivy`-Dateisystemscan für `HIGH,CRITICAL`
- CD-Pipeline:
  - Nach erfolgreicher CI auf `main` werden Docker-Images gebaut und nach `ghcr.io` gepusht

### CI-Dateien
- `.github/workflows/ci.yml`
- `.github/workflows/cd.yml`

### Aktivierung auf GitHub
1. Repository zu GitHub pushen.
2. In den GitHub-Repository-Einstellungen Actions aktivieren.
3. Den `main`-Branch schützen und `CI`-Workflow-Checks vor dem Merge verpflichtend machen.
4. Für die Veröffentlichung von CD-Images sicherstellen, dass der Workflow Schreibrechte für Packages hat (bereits im Workflow gesetzt).

### Was CD veröffentlicht
- `ghcr.io/<owner>/<repo>-backend:latest`
- `ghcr.io/<owner>/<repo>-frontend:latest`

Die gepushten Images sind auf GitHub im Tab `Packages` des Repositories/Accounts sichtbar.

## 6) Annahmen

- Das System verwendet nur zwei operative Rollen: "Citizen" und "Worker".
- Authentifizierung ist in dieser Version außerhalb des Scopes; die Rollenauswahl wird in der UI simuliert.
- PostgreSQL ist der primäre Datenspeicher, und Docker ist die empfohlene Laufzeitumgebung.
- Der Request-Lebenszyklus wird strikt durch vordefinierte Status-Transitionsregeln gesteuert.
- Datennachvollziehbarkeit ist erforderlich: Kommentare und Statushistorie werden als Audit-Daten gespeichert.

## 7) Business View

### Business-Akteure
- Citizen
- Worker

### Business-Beziehungen
- Ein Citizen kann viele Requests erstellen.
- Ein Worker kann viele Requests bearbeiten.
- Eine Kategorie kann viele Requests enthalten.
- Ein Request kann viele Kommentare enthalten.
- Ein Request kann viele Statushistorien-Einträge enthalten.

```mermaid
erDiagram
    PERSON {
        bigint id PK
        string first_name
        string last_name
        string email
        string phone
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    CITIZEN_PROFILE {
        bigint id PK
        bigint person_id FK
        string preferred_contact_method
        string address_line
        string district
        datetime created_at
        datetime updated_at
    }

    STAFF_PROFILE {
        bigint id PK
        bigint person_id FK
        string employee_code
        string department
        string position_title
        boolean is_available
        datetime created_at
        datetime updated_at
    }

    ROLE {
        bigint id PK
        string code
        string description
        boolean is_active
        datetime created_at
    }

    PERSON_ROLE {
        bigint id PK
        bigint person_id FK
        bigint role_id FK
        datetime assigned_at
    }

    CATEGORY {
        bigint id PK
        string name
        string description
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    CITIZEN_REQUEST {
        bigint id PK
        string title
        string description
        bigint category_id FK
        string priority
        string status
        string citizen_first_name nullable
        string citizen_last_name nullable
        bigint assigned_to_staff_profile_id FK
        bigint citizen_person_id FK
        bigint created_by_person_id FK
        bigint assigned_to_person_id FK
        datetime resolved_at
        datetime closed_at
        datetime created_at
        datetime updated_at
    }

    REQUEST_COMMENT {
        bigint id PK
        bigint request_id FK
        bigint author_staff_profile_id FK
        bigint author_person_id FK
        string author_role
        string author_display_name
        string comment_text
        datetime created_at
    }

    REQUEST_STATUS_HISTORY {
        bigint id PK
        bigint request_id FK
        string from_status
        string to_status
        bigint changed_by_staff_profile_id FK
        bigint changed_by_person_id FK
        string change_note
        datetime changed_at
    }

    PERSON ||--o{ CITIZEN_PROFILE : "hat"
    PERSON ||--o{ STAFF_PROFILE : "hat"
    PERSON ||--o{ PERSON_ROLE : "zugeordnet"
    ROLE ||--o{ PERSON_ROLE : "zugeordnet"

    CATEGORY ||--o{ CITIZEN_REQUEST : "enthaelt"
    STAFF_PROFILE ||--o{ CITIZEN_REQUEST : "zugewiesen"
    PERSON ||--o{ CITIZEN_REQUEST : "citizen"
    PERSON ||--o{ CITIZEN_REQUEST : "created_by"
    PERSON ||--o{ CITIZEN_REQUEST : "assigned_to"

    CITIZEN_REQUEST ||--o{ REQUEST_COMMENT : "hat"
    STAFF_PROFILE ||--o{ REQUEST_COMMENT : "author"
    PERSON ||--o{ REQUEST_COMMENT : "author"

    CITIZEN_REQUEST ||--o{ REQUEST_STATUS_HISTORY : "hat"
    STAFF_PROFILE ||--o{ REQUEST_STATUS_HISTORY : "changed_by"
    PERSON ||--o{ REQUEST_STATUS_HISTORY : "changed_by"
```

### Request-Lebenszyklus (Business-Prozess)
- NEW -> IN_PROGRESS oder CLARIFICATION_NEEDED
- IN_PROGRESS -> CLARIFICATION_NEEDED oder RESOLVED
- CLARIFICATION_NEEDED -> IN_PROGRESS
- RESOLVED -> CLOSED
- CLOSED ist terminal (keine weiteren Lebenszyklus-Transitions).

### Business-Regeln
- Jeder Request muss genau einen aktuellen Status haben.
- Ungueltige Status-Transitions werden abgelehnt.
- Jede akzeptierte Statusaenderung muss in die Statushistorie geschrieben werden.
- Rollenabgrenzung:
  - Citizen: Request erstellen, Requests ansehen/filtern, Kommentar hinzufuegen.
  - Worker: alle Citizen-Faehigkeiten plus Request claimen, Status aktualisieren, Kategorien verwalten.
- Historische Daten (Kommentare, Statushistorie) werden zur Nachvollziehbarkeit aufbewahrt.

## 8) Use Cases

### Anwendungsfaelle
- Citizen erstellt einen neuen Request:
  - Ziel: ein kommunales Problem oder eine Anfrage mit Titel, Beschreibung, Kategorie, Prioritaet und optionalem Namen erfassen.
  - Ergebnis: ein neuer Request wird mit Status `NEW` und einem initialen Historieneintrag gespeichert.
- Citizen prueft bestehende Requests:
  - Ziel: Requests nach Status, Kategorie und Prioritaet durchsuchen und filtern.
  - Ergebnis: der Citizen kann relevante Requests finden und die Detailansicht oeffnen.
- Citizen fuegt Folgeinformationen hinzu:
  - Ziel: nach der Erstellung einen Kommentar mit zusaetzlichem Kontext hinterlassen.
  - Ergebnis: der Kommentar wird als historischer Eintrag gespeichert, solange der Request noch nicht geschlossen ist.
- Worker uebernimmt einen Request:
  - Ziel: Verantwortung fuer einen offenen oder noch nicht zugewiesenen Request uebernehmen.
  - Ergebnis: der Request wird einem Worker-Profil zugeordnet.
- Worker aktualisiert den Request-Status:
  - Ziel: den Request durch den erlaubten Lebenszyklus bewegen (`NEW` -> `IN_PROGRESS` -> `CLARIFICATION_NEEDED`/`RESOLVED` -> `CLOSED`).
  - Ergebnis: gueltige Statuswechsel werden gespeichert, Zeitstempel aktualisiert und jede Aenderung in die Statushistorie geschrieben.
- Worker verwaltet Kategorien:
  - Ziel: neue Kategorien anlegen oder veraltete Kategorien deaktivieren.
  - Ergebnis: die Klassifikation der Requests bleibt pflegbar, ohne historische Daten zu loeschen.

### User Stories
- Als Citizen moechte ich ein lokales Problem schnell melden, damit die Stadtverwaltung es bearbeiten kann.
- Als Citizen moechte ich den Status meines Requests verfolgen, damit ich weiss, ob er bearbeitet wird.
- Als Worker moechte ich einen Request uebernehmen, damit die Verantwortung fuer die Bearbeitung klar ist.
- Als Worker moechte ich Kommentare und Statuswechsel dokumentieren, damit der komplette Bearbeitungsverlauf nachvollziehbar bleibt.
- Als Worker moechte ich, dass geschlossene Requests nicht mehr veraendert werden koennen, damit abgeschlossene Faelle konsistent bleiben.

## 9) Architekturuebersicht

### Schichten
- Frontend: React + Vite
- Backend: FastAPI + SQLAlchemy
- Datenbank: PostgreSQL

### Trennung
- `frontend/` nur UI/API-Aufrufe
- `backend/app/api/` HTTP-Routen
- `backend/app/services/` Business-Logik
- `backend/app/db/models/` Persistenzmodell

### Projektstruktur
- `backend/`: FastAPI REST API + Business-Logik
- `frontend/`: React-App-Scaffold
- `database/current_schema.sql`: kanonischer Schema-Snapshot fuer frische Installationen
- `database/migrations/`: SQL-Migrationen
- `docs/`: Assessment-Artefakte (Spezifikation, Architektur, AI-Nutzung)
- `scripts/`: Hilfsskripte

Hinweis: `RULES.md` enthaelt den Implementierungsplan und die Fortschrittsdokumentation aus der Entwicklung.

## 10) Wichtige Designentscheidungen

- Datenbankstruktur: Die erste Version hat funktioniert, war aber fuer langfristige Skalierbarkeit nicht ausreichend. Das Schema wurde in ein besser skalierbares Modell ueberfuehrt, in dem "Citizen" und "Worker" vom "Person"-Entity abgeleitet sind.
- Klare Trennung zwischen Backend, Frontend und Datenbank: Das sorgt fuer eine saubere Projektstruktur und einfachere Navigation.

## 11) Vorschlaege & Alternativen

- Statt Rollen per Dropdown auszuwaehlen, sollte ein Authentifizierungssystem mit E-Mail und Passwort fuer mehr Sicherheit implementiert werden.
- UI/UX kann weiter verbessert und ansprechender gestaltet werden, um die Nutzererfahrung zu erhoehen.
- Eine zusaetzliche Admin-Rolle kann eingefuehrt werden, um die Aufgabenbearbeitung zu ueberwachen und Worker zu verwalten.
- Eine Person kann spaeter mehrere Rollen haben; die Datenbankstruktur ist bereits darauf vorbereitet.
