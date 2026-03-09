# Citizen Request Management System

##  1) Problem identification

This project is designed to manage citizen requests and to resolve them faster. 

There are 2 main roles "Citizen" and "Worker":
 - "Citizen" can open requests and ask for help, as well as write comments about the problem.
 - "Worker" can see citizen requests, assign them to each other, update request status, add comments for the requests.

The idea of a project is to understand how to design clean project architecture and easily scalable database system with integration of backend and simple UI. 

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

### 2.4) Additional checks (optional)

```bash
./scripts/check_all.sh --fast   # quick local checks
./scripts/check_all.sh          # full checks + security scan
```

Reset DB (optional, clean state):

```bash
./scripts/run_fullstack.sh --fresh
```


## 3) Database only (simple)

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

###  4.1) Run backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
export DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/citizen_requests"
uvicorn app.main:app --reload --port 8000
```

### 4.2) Run frontend

```bash
cd frontend
npm install
npm run dev
```

### API examples
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

##  6) Assumptions

- The system uses two operational roles only: "Citizen" and "Worker".
- Authentication is out of scope for this version; role selection is simulated in the UI.
- PostgreSQL is the primary datastore, and Docker is the recommended runtime environment.
- Request lifecycle is strictly controlled by predefined status-transition rules.
- Data traceability is required: comments and status history are stored as audit records.

##  7) Business View

### Business actors
- Citizen
- Worker

### Business relationships
- One citizen can create many requests.
- One worker can handle many requests.
- One category can contain many requests.
- One request can contain many comments.
- One request can contain many status-history entries.

```mermaid
erDiagram
    PERSON {
        BIGSERIAL id PK
        VARCHAR first_name
        VARCHAR last_name
        VARCHAR email
        VARCHAR phone
        BOOLEAN is_active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    CITIZEN_PROFILE {
        BIGSERIAL id PK
        BIGINT person_id FK
        VARCHAR preferred_contact_method
        VARCHAR address_line
        VARCHAR district
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    STAFF_PROFILE {
        BIGSERIAL id PK
        BIGINT person_id FK
        VARCHAR employee_code
        VARCHAR department
        VARCHAR position_title
        BOOLEAN is_available
        BIGINT legacy_staff_user_id FK
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    ROLE {
        BIGSERIAL id PK
        VARCHAR code
        VARCHAR description
        BOOLEAN is_active
        TIMESTAMPTZ created_at
    }

    PERSON_ROLE {
        BIGSERIAL id PK
        BIGINT person_id FK
        BIGINT role_id FK
        TIMESTAMPTZ assigned_at
    }

    STAFF_USER {
        BIGSERIAL id PK
        VARCHAR first_name
        VARCHAR last_name
        VARCHAR email
        BOOLEAN is_active
        BIGINT person_id FK
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    CATEGORY {
        BIGSERIAL id PK
        VARCHAR name
        VARCHAR description
        BOOLEAN is_active
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    CITIZEN_REQUEST {
        BIGSERIAL id PK
        VARCHAR title
        TEXT description
        BIGINT category_id FK
        request_priority priority
        request_status status
        VARCHAR citizen_first_name
        VARCHAR citizen_last_name
        BIGINT assigned_to_user_id FK
        BIGINT citizen_person_id FK
        BIGINT created_by_person_id FK
        BIGINT assigned_to_person_id FK
        TIMESTAMPTZ resolved_at
        TIMESTAMPTZ closed_at
        TIMESTAMPTZ created_at
        TIMESTAMPTZ updated_at
    }

    REQUEST_COMMENT {
        BIGSERIAL id PK
        BIGINT request_id FK
        BIGINT author_user_id FK
        BIGINT author_person_id FK
        VARCHAR author_role
        VARCHAR author_display_name
        TEXT comment_text
        TIMESTAMPTZ created_at
    }

    REQUEST_STATUS_HISTORY {
        BIGSERIAL id PK
        BIGINT request_id FK
        request_status from_status
        request_status to_status
        BIGINT changed_by_user_id FK
        BIGINT changed_by_person_id FK
        VARCHAR change_note
        TIMESTAMPTZ changed_at
    }

    PERSON ||--o| CITIZEN_PROFILE : has
    PERSON ||--o| STAFF_PROFILE : has
    PERSON ||--o{ PERSON_ROLE : gets
    ROLE ||--o{ PERSON_ROLE : assigned

    PERSON ||--o{ STAFF_USER : linked_legacy
    STAFF_USER ||--o| STAFF_PROFILE : mapped_by_legacy_id

    CATEGORY ||--o{ CITIZEN_REQUEST : classifies
    STAFF_USER ||--o{ CITIZEN_REQUEST : assigned_legacy
    PERSON ||--o{ CITIZEN_REQUEST : citizen_person
    PERSON ||--o{ CITIZEN_REQUEST : created_by
    PERSON ||--o{ CITIZEN_REQUEST : assigned_to

    CITIZEN_REQUEST ||--o{ REQUEST_COMMENT : has
    STAFF_USER ||--o{ REQUEST_COMMENT : author_legacy
    PERSON ||--o{ REQUEST_COMMENT : author_person

    CITIZEN_REQUEST ||--o{ REQUEST_STATUS_HISTORY : tracks
    STAFF_USER ||--o{ REQUEST_STATUS_HISTORY : changed_by_legacy
    PERSON ||--o{ REQUEST_STATUS_HISTORY : changed_by_person
```

### Request lifecycle (business process)
- NEW -> IN_PROGRESS or CLARIFICATION_NEEDED
- IN_PROGRESS -> CLARIFICATION_NEEDED or RESOLVED
- CLARIFICATION_NEEDED -> IN_PROGRESS
- RESOLVED -> CLOSED
- CLOSED is terminal (no further lifecycle transitions)

### Business rules
- Every request must have exactly one current status.
- Invalid status transitions are rejected.
- Every accepted status change must be written to status history.
- Role boundaries:
  - Citizen: create request, view/filter requests, add comment.
  - Worker: all citizen capabilities plus claim request, update status, manage categories.
- Historical records (comments, status history) are retained for traceability.

##  8) Use Cases

- This system can be efficiently used for property managers to quickly identify problems, that people face when living in specific house.
- This can be used by government to give specific instructions for municipal sanitation workers. Easier to understand problems and weaknesses through people feedback.

##  9) Architecture Overview

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

## 10) Important Design Decisions

- Databse structure. First version was good but if we are thinking about scalability then it wasn't enough. Due to this problem the database structure was rewriten into more scalable where "Citizen" and "Worker" will be inherited from "Person" entity. 
- Clear separation between backend, frontend and database. This gave project a better structure and file searching system.

## 11) Suggetions & Alternatives

- Instead of changing roles above from the dropdown menu, it is better to implement authentication system with email and password for higher security.
- UI/UX can be better implemented and in more vibrant way to provide better experience for the user.
- One more role as administration can be added to track that workers will implement correctly all the tasks
- Person can have multiple roles later, database structure is already prepared for this
