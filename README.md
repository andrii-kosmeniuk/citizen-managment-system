# Citizen Request Management System

## 1) Problem Identification

This project is designed to manage citizen requests and resolve them faster.

There are two main roles: "Citizen" and "Worker":
- "Citizen" can open requests, ask for help, and write comments about the problem.
- "Worker" can view citizen requests, assign requests, update request status, and add comments.

The goal of this project is to demonstrate a clean project architecture and a scalable database system with backend and simple UI integration. As well as show the efficiency of developing with AI Agents.

## 2) Quick Start (Docker)

### Prerequisites
- Docker
- Docker Compose

### 2.1) Clone

```bash
git clone https://github.com/andrii-kosmeniuk/citizen-managment-system.git && cd citizen-managment-system
```

### 2.2) Run

```bash
docker compose up --build
```

Open in browser:
- Frontend: `http://localhost:5173`
- Backend API docs: `http://localhost:8000/docs`

### 2.3) Stop

```bash
docker compose down
```

### 2.4) Stop & Reset DB

```bash
docker compose down -v
```

### 2.5) Additional checks (optional)

```bash
./scripts/check_all.sh --fast   # quick local checks
./scripts/check_all.sh          # full checks + security scan
```

Reset DB (optional, clean state):

```bash
./scripts/run_fullstack.sh --fresh
```


## 3) Database only

### 3.1) Start only DB

```bash
docker compose up -d db
```

### 3.2) Open SQL shell

```bash
docker compose exec db psql -U postgres -d citizen_requests
```

### 3.3) Test queries

```sql
\dt
SELECT * FROM category;
SELECT * FROM citizen_request;
```

### 3.4) Exit SQL shell

```sql
\q
```

## 4) Full stack without Docker

### 4.1) Run Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
export DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/citizen_requests"
uvicorn app.main:app --reload --port 8000
```

### 4.2) Run Frontend

```bash
cd frontend
npm install
npm run dev
```

### API Examples
- `GET /health`
- `GET /categories`
- `POST /categories`
- `GET /requests`
- `POST /requests`
- `GET /requests/{id}`
- `POST /requests/{id}/claim`
- `PATCH /requests/{id}/status`
- `POST /requests/{id}/comments`

### 4.3) Quality checks

Backend checks:

```bash
./scripts/check_backend.sh
```

Frontend checks:

```bash
./scripts/check_frontend.sh
```

Run all checks:

```bash
./scripts/check_all.sh
```

Optional security scan (if `trivy` is installed):

```bash
./scripts/security_scan.sh
```

## 5) Static Analysis + Security + CI/CD (GitHub)

This repository now includes:
- Static code analysis in CI:
  - Backend: `ruff` + tests
  - Frontend: typecheck/lint + tests + build
- Security scan in CI:
  - `trivy` filesystem scan on `HIGH,CRITICAL`
- CD pipeline:
  - After CI succeeds on `main`, Docker images are built and pushed to `ghcr.io`

### CI files
- `.github/workflows/ci.yml`
- `.github/workflows/cd.yml`

### How to enable on GitHub
1. Push repository to GitHub.
2. In GitHub repo settings, enable Actions.
3. Protect `main` branch and require `CI` workflow checks before merge.
4. For CD image publishing, ensure workflow has permission to write packages (already set in workflow).

### What CD publishes
- `ghcr.io/<owner>/<repo>-backend:latest`
- `ghcr.io/<owner>/<repo>-frontend:latest`

You can see pushed images in GitHub: `Packages` tab of the repository/account.

## 6) Assumptions

- The system uses two operational roles only: "Citizen" and "Worker".
- Authentication is out of scope for this version; role selection is simulated in the UI.
- PostgreSQL is the primary datastore, and Docker is the recommended runtime environment.
- Request lifecycle is strictly controlled by predefined status-transition rules.
- Data traceability is required: comments and status history are stored as audit records.

## 7) Business View

### Business Actors
- Citizen
- Worker

### Business Relationships
- One citizen can create many requests.
- One worker can handle many requests.
- One category can contain many requests.
- One request can contain many comments.
- One request can contain many status-history entries.

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
        string citizen_first_name
        string citizen_last_name
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

    PERSON ||--o{ CITIZEN_PROFILE : "has"
    PERSON ||--o{ STAFF_PROFILE : "has"
    PERSON ||--o{ PERSON_ROLE : "maps"
    ROLE ||--o{ PERSON_ROLE : "maps"

    CATEGORY ||--o{ CITIZEN_REQUEST : "contains"
    STAFF_PROFILE ||--o{ CITIZEN_REQUEST : "assigned"
    PERSON ||--o{ CITIZEN_REQUEST : "citizen"
    PERSON ||--o{ CITIZEN_REQUEST : "created_by"
    PERSON ||--o{ CITIZEN_REQUEST : "assigned_to"

    CITIZEN_REQUEST ||--o{ REQUEST_COMMENT : "has"
    STAFF_PROFILE ||--o{ REQUEST_COMMENT : "author"
    PERSON ||--o{ REQUEST_COMMENT : "author"

    CITIZEN_REQUEST ||--o{ REQUEST_STATUS_HISTORY : "has"
    STAFF_PROFILE ||--o{ REQUEST_STATUS_HISTORY : "changed_by"
    PERSON ||--o{ REQUEST_STATUS_HISTORY : "changed_by"
```

### Request Lifecycle (Business Process)
- NEW -> IN_PROGRESS or CLARIFICATION_NEEDED
- IN_PROGRESS -> CLARIFICATION_NEEDED or RESOLVED
- CLARIFICATION_NEEDED -> IN_PROGRESS
- RESOLVED -> CLOSED
- CLOSED is terminal (no further lifecycle transitions).

### Business Rules
- Every request must have exactly one current status.
- Invalid status transitions are rejected.
- Every accepted status change must be written to status history.
- Role boundaries:
  - Citizen: create request, view/filter requests, add comment.
  - Worker: all citizen capabilities plus claim request, update status, manage categories.
- Historical records (comments, status history) are retained for traceability.

## 8) Use Cases

- This system can be used by property managers to quickly identify problems people face while living in a specific building.
- This system can also be used by government agencies to provide instructions for municipal sanitation workers and better understand local issues through citizen feedback.

## 9) Architecture Overview

### Layers
- Frontend: React + Vite
- Backend: FastAPI + SQLAlchemy
- Database: PostgreSQL

### Separation
- `frontend/` only UI/API calls
- `backend/app/api/` HTTP routes
- `backend/app/services/` business logic
- `backend/app/db/models/` persistence model

### Project structure
- `backend/`: FastAPI REST API + business logic
- `frontend/`: React app scaffold
- `database/migrations/`: SQL migrations
- `docs/`: assessment artifacts (spec, architecture, AI usage)
- `scripts/`: helper scripts

Note: `RULES.md` contains the implementation plan and progress tracking used during development.

## 10) Important Design Decisions

- Database structure: the first version worked, but it was not sufficient for long-term scalability. The schema was redesigned into a more scalable model where "Citizen" and "Worker" are derived from the "Person" entity.
- Clear separation between backend, frontend, and database: this provides a cleaner project structure and easier file navigation.

## 11) Suggestions & Alternatives

- Instead of selecting roles from a dropdown, an authentication system with email and password should be implemented for stronger security.
- UI/UX can be improved and made more engaging to provide a better user experience.
- An additional admin role can be introduced to supervise task execution and manage workers.
- A person can have multiple roles later; the database structure is already prepared for this.
