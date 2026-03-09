# Citizen Request Management System

## Project description

This project is designed to manage citizen requests and to resolve them faster. There are 2 main roles "Citizen" and "Worker":
 - "Citizen" can open requests and ask for help, as well as write comments about the problem.
 - "Worker" can see citizen requests, assign them to each other, update request status, add comments for the requests.

The idea of a project is to understand how to design clean project architecture and easily scalable database system with integration of backend and simple UI. 

## Project structure
- `backend/`: FastAPI REST API + business logic
- `frontend/`: React app scaffold
- `database/migrations/`: SQL migrations
- `docs/`: assessment artifacts (spec, architecture, AI usage)
- `scripts/`: helper scripts

## 1) Start database

```bash
docker compose up -d db
```

## Full stack with Docker (recommended)

Run DB + backend + frontend with all dependencies inside containers:

```bash
docker compose up --build
```

Open:
- Frontend: `http://localhost:5173`
- Backend API docs: `http://localhost:8000/docs`

Stop:

```bash
docker compose down
```

## 2) Apply schema

```bash
psql "postgresql://postgres:postgres@localhost:5432/citizen_requests" -f database/migrations/001_initial_schema.sql
```

Note: in Docker mode, backend container applies pending migrations automatically on startup.

## Dev DB reset (drop + recreate schema + migrate)

```bash
./scripts/reset_db.sh
```

## 3) Run backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -e .[dev]
export DATABASE_URL="postgresql+psycopg://postgres:postgres@localhost:5432/citizen_requests"
uvicorn app.main:app --reload --port 8000
```

## 4) Run frontend

```bash
cd frontend
npm install
npm run dev
```

## API examples
- `GET /health`
- `GET /categories`
- `POST /categories`
- `GET /requests`
- `POST /requests`
- `GET /requests/{id}`
- `POST /requests/{id}/claim`
- `PATCH /requests/{id}/status`
- `POST /requests/{id}/comments`

## Quality checks

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

## Static Analysis + Security + CI/CD (GitHub)

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

## 5) Important Design Decisions

- Databse structure. First version was good but if we are thinking about scalability then it wasn't enough. Due to this problem the database structure was rewriten into more scalable where "Citizen" and "Worker" will be inherited from "Person" entity. 
- Clear separation between backend, frontend and database. This gave project a better structure and file searching system.

## 6) Suggetions & Alternatives

- Instead of changing roles above from the dropdown menu, it is better to implement authentication system with email and password for higher security.
- UI/UX can be better implemented and in more vibrant way to provide better experience for the user.
- 
