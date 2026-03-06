# RULES.md

## Project Context
- Project: **Citizen Request Management System** (`Buergeranliegen-System`)
- Domain: City administration workflow for citizen-reported issues and inquiries.
- Goal: Provide a system to **capture, process, and track** citizen requests.

## Assessment Goal
- Demonstrate professional software engineering via **Specification Driven Development (SDD)**.
- Focus is not coding speed.
- Evaluation emphasizes:
  - Problem understanding
  - Requirement structuring
  - Architecture decisions
  - Meaningful AI usage in development
  - Professional implementation quality

## Mandatory Technical Requirements
- Use **Python** for implementation.
- Deliver a **Web GUI**.
- Deliver a **REST backend**.
- Use a **persistent database**.
- Ensure clear separation of:
  - Frontend
  - Backend
  - Data model
- **No LLM integration required**.

## Mandatory Functional Requirements

### 1) Request Creation
Each citizen request must contain at least:
- Title
- Description
- Category
- Priority
- Creation date
- Status
- Optional citizen name

### 2) Category Management
- Categories must be manageable (create/update/list/deactivate).
- Example categories:
  - Infrastructure
  - Environment
  - Traffic
  - Other

### 3) Status Workflow
Required statuses:
- New
- In Progress
- Clarification Needed
- Resolved
- Closed

Business rules:
- Closed requests must not be editable.
- Every status change must be stored in history (audit trail).
- Resolved requests can be moved to Closed.
- Clarification Needed means further processing is still required.

### 4) Staff Processing Actions
Staff users must be able to:
- Claim/take ownership of a request
- Change request status
- Add comments
- Keep comments historically (no loss of comment history)

### 5) Dashboard / GUI Minimum Scope
The GUI must provide at least:
- List of all requests
- Filters by status/category/priority
- Request detail view
- Status change action
- Add comment action

## Expected Development Approach (SDD)
Before implementation, provide structured specification work including:
- Problem understanding
- Assumptions
- Domain model
- Use cases / user stories
- Architecture overview
- Key design decisions
- Discussion of alternatives

## Required Deliverables (for submission)

### 1) Concept & Specification (e.g., Markdown)
Must include:
- Problem understanding
- Assumptions
- Domain model
- Use cases / user stories
- Architecture overview
- Key design decisions
- Alternatives discussion

### 2) Quality Assurance
Must include:
- Unit tests
- Basic GUI or integration tests
- Reproducible application startup

Optional bonus:
- Static code analysis (e.g., Sonar)
- Security scan (e.g., Trivy)
- CI/CD setup
- Docker setup

### 3) Development Documentation
Must include:
- How AI was used
- Where AI helped
- Where AI did not help
- Prompts/workflow used

## Non-goals / Not Decisive
- Framework choice is not decisive.
- Pixel-perfect UI is not required.
- Maximum number of features is not required.

## Execution / Implementation Plan (Detailed)

### Phase 0: Foundation & Setup
- [x] Create directory structure (`backend/`, `frontend/`, `database/`, `docs/`, `scripts/`).
- [x] Add root config files (`README.md`, `.env.example`, `docker-compose.yml`, `.gitignore`).
- [x] Define local run commands for backend/frontend.
- [x] Define reproducible startup flow (`docker compose up`, migration apply, app start).

#### Test checkpoint after Phase 0
- [x] Verify Docker services start without errors.
- [x] Verify environment variables are loaded correctly.
- [ ] Verify project can be started from a clean clone using documented commands.

### Phase 1: Database Design & Migration
- [x] Finalize schema entities: `staff_user`, `category`, `citizen_request`, `request_comment`, `request_status_history`.
- [x] Add required constraints (non-empty text, enum checks, required timestamps for resolved/closed states).
- [x] Add FK relationships and cascading behavior where needed.
- [x] Add indexes for API filter/query patterns (`status`, `category_id`, `priority`, `assigned_to_user_id`, timestamps).
- [x] Add DB triggers/functions for workflow integrity and immutable closed requests.
- [x] Keep migration as run-once; provide separate dev reset script.

#### Test checkpoint after Phase 1 (Database)
- [x] Execute migration on empty DB successfully.
- [x] Run dev reset script and reapply migration successfully.
- [x] Insert sample records to verify FK constraints and enum validation.
- [x] Verify invalid status transitions fail.
- [x] Verify updates/comments on closed requests fail.

### Phase 2: Backend Domain & API
- [ ] Implement DB/ORM models mapped to actual schema names.
- [ ] Implement service layer for business rules (claim, transition, history write, closed-lock behavior).
- [ ] Implement category REST endpoints (list/create/update/deactivate).
- [ ] Implement request REST endpoints (create/list/detail).
- [ ] Implement request action endpoints (claim/status change/add comment).
- [ ] Implement request validation and consistent error responses.
- [ ] Add health endpoint and config loading.

#### Test checkpoint after Phase 2 (Backend)
- [ ] Unit tests for workflow logic and service methods.
- [ ] API tests for each endpoint (happy path + invalid input + forbidden transition).
- [ ] Verify status history is written for each status change.
- [ ] Verify closed requests are immutable via API.
- [ ] Verify filtering works (`status/category/priority`).

### Phase 3: Frontend Implementation
- [ ] Build dashboard list view for all requests.
- [ ] Implement filter UI (status/category/priority) and backend query integration.
- [ ] Build request detail page with comments and status history.
- [ ] Implement actions: claim request, change status, add comment.
- [ ] Add loading/error/empty states.
- [ ] Ensure responsive behavior on desktop and mobile.

#### Test checkpoint after Phase 3 (Frontend)
- [ ] Component tests for key UI blocks (list, filters, detail, status form, comment form).
- [ ] E2E/basic GUI test: create request.
- [ ] E2E/basic GUI test: claim request.
- [ ] E2E/basic GUI test: run status change sequence.
- [ ] E2E/basic GUI test: add comment.
- [ ] E2E/basic GUI test: verify blocked action on closed request.

### Phase 4: Integration, Quality, and Hardening
- [ ] Validate frontend-backend integration end-to-end.
- [ ] Standardize API contracts and error handling.
- [ ] Add logging and basic observability for key operations.
- [ ] Add lint/format/test commands and optional CI pipeline.
- [ ] Optionally add static analysis and security scan tools.

#### Test checkpoint after Phase 4 (Integration/Quality)
- [ ] Full integration test suite passes.
- [ ] Regression test for core workflow passes.
- [ ] Security/static scans run (if enabled) without critical findings.
- [ ] Startup/run/test commands are reproducible on a fresh environment.

### Phase 5: Documentation & Submission Packaging
- [ ] Complete `docs/specification.md` with SDD artifacts and assumptions.
- [ ] Complete `docs/architecture.md` with decisions and alternatives.
- [ ] Complete `docs/ai-usage.md` with prompt/workflow reflection.
- [ ] Ensure README contains exact setup, run, reset, and test instructions.
- [ ] Prepare final ZIP with code + docs + test assets.

#### Test checkpoint after Phase 5 (Final Verification)
- [ ] Validate submission contents against required deliverables checklist.
- [ ] Re-run full test suite before packaging.
- [ ] Confirm all acceptance criteria are demonstrably met.

## Acceptance Criteria
- [ ] Users can create requests with all required fields.
- [ ] Categories are manageable.
- [ ] Staff can claim requests, update status, and add comments.
- [ ] Closed requests cannot be modified.
- [ ] Status history is recorded and queryable.
- [ ] Dashboard supports list/filter/detail/status/comment operations.
- [ ] Project runs reproducibly and tests are executable.
