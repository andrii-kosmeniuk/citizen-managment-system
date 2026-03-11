# RULES.md

## Project Context
- Project: **Citizen Request Management System** (`Buergeranliegen-System`)
- Goal: Provide a system to capture, process, and track citizen requests.
- Scope now: working CRUD/workflow system with role-based behavior (`Citizen` / `Worker`) **without full authentication**.
- Scope later: scale schema and architecture for authentication and larger functionality.

## Core Principles
- Prioritize data integrity, auditability, and backward-compatible migrations.
- Prefer soft-delete for domain records unless explicitly required otherwise.
- Use expand -> migrate -> contract for all structural refactors.
- No destructive production changes without backup + reconciliation proof.

## Mandatory Technical Requirements
- Python backend (REST API)
- Web GUI frontend
- Persistent PostgreSQL database
- Clear separation: frontend / backend / data model
- Reproducible startup and test flow

## Mandatory Functional Requirements

### 1) Request Creation
Each request must include:
- Title
- Description
- Category
- Priority
- Creation date
- Status
- Optional citizen first and last name

### 2) Category Management
- Categories must be manageable by workers.
- Worker can:
  - create category
  - deactivate (soft-delete) category
  - list categories
- Citizen can only consume categories for requests.

### 3) Status Workflow
Allowed statuses:
- `NEW`
- `IN_PROGRESS`
- `CLARIFICATION_NEEDED`
- `RESOLVED`
- `CLOSED`

Rules:
- Closed requests are immutable.
- Every status change must be written to status history.
- Transitions must follow workflow constraints.

### 4) Request Processing
Workers can:
- claim/assign request
- change status
- add comments

Citizens can:
- create request
- list/filter/view requests
- add comments

### 5) Dashboard / GUI
Must provide:
- request list
- filters (`status`, `category`, `priority`)
- request details
- comments
- status history
- worker-only management actions

## Execution / Implementation Plan

### Phase 0: Foundation & Setup
- [x] Create project structure and root configs.
- [x] Add reproducible run/reset/test scripts.
- [x] Dockerized PostgreSQL setup.

#### Test Gate
- [x] Project starts from scripts.
- [x] DB container starts and is reachable.

### Phase 1: Database Core
- [x] Implement base schema (`person`, `staff_profile`, `category`, `citizen_request`, `request_comment`, `request_status_history`).
- [x] Add constraints, indexes, status transition triggers, closed-request protections.
- [x] Add dev reset script and DB validation script.

#### Test Gate
- [x] Migration applies cleanly.
- [x] FK/enums/workflow validations pass.

### Phase 2: Backend API
- [x] Implement models/schemas/routes/services.
- [x] Implement category endpoints and request endpoints.
- [x] Add consistent errors, validation, logging, health route.

#### Test Gate
- [x] Backend unit/integration tests pass.

### Phase 3: Frontend
- [x] Implement list/filter/detail/create flows.
- [x] Implement claim/status/comment actions.
- [x] Add loading/error/empty states.

#### Test Gate
- [x] Frontend tests and build pass.

### Phase 4: Integration & Quality
- [x] Integrate frontend/backend flows.
- [x] Add lint/test/build check scripts.
- [x] Add reproducible full checks.

#### Test Gate
- [x] `./scripts/check_all.sh` passes.

### Phase 5: Role-Based Behavior (No Auth Yet)
- [x] Role selector in UI (`Citizen` / `Worker`).
- [x] Backend role guard via request header (`X-Actor-Role`) for protected actions.
- [x] Citizen vs Worker permissions enforced in UI and API.
- [x] Worker-only worker list table added.
- [x] Worker category add/delete UI added.

#### Test Gate
- [x] Role-based API and UI tests pass.

### Phase 6: Scalable DB Refactor (Auth-Ready, Auth Not Implemented)

#### Objective
Move toward scalable identity model now, while keeping current no-auth runtime behavior.

#### Required New Entities
- [x] `person`
- [x] `citizen_profile` (1:1 with `person`)
- [x] `staff_profile` (1:1 with `person`)
- [x] `role` (role catalog: `CITIZEN`, `WORKER`, optional `ADMIN`)
- [x] `person_role` (M:N mapping between `person` and `role`)

#### Detailed Entity Blueprint (Target Structure)

##### `person`
- `id` `BIGSERIAL` PK
- `first_name` `VARCHAR(50)` NOT NULL
- `last_name` `VARCHAR(50)` NOT NULL
- `email` `VARCHAR(255)` NULL UNIQUE (nullable for citizens without account)
- `phone` `VARCHAR(30)` NULL
- `is_active` `BOOLEAN` NOT NULL DEFAULT `TRUE`
- `created_at` `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`
- `updated_at` `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`
- Constraints:
  - non-blank `first_name`, `last_name`
  - if `email` exists, it must be normalized in app layer (lowercase, trimmed)

##### `citizen_profile`
- `id` `BIGSERIAL` PK
- `person_id` `BIGINT` NOT NULL UNIQUE FK -> `person(id)` ON DELETE CASCADE
- `preferred_contact_method` `VARCHAR(20)` NULL (`EMAIL`/`PHONE`/`NONE`)
- `address_line` `VARCHAR(255)` NULL
- `district` `VARCHAR(100)` NULL
- `created_at` `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`
- `updated_at` `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`

##### `staff_profile`
- `id` `BIGSERIAL` PK
- `person_id` `BIGINT` NOT NULL UNIQUE FK -> `person(id)` ON DELETE CASCADE
- `employee_code` `VARCHAR(50)` NOT NULL UNIQUE
- `department` `VARCHAR(100)` NULL
- `position_title` `VARCHAR(100)` NULL
- `is_available` `BOOLEAN` NOT NULL DEFAULT `TRUE`
- `created_at` `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`
- `updated_at` `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`

##### `role`
- `id` `BIGSERIAL` PK
- `code` `VARCHAR(30)` NOT NULL UNIQUE (examples: `CITIZEN`, `WORKER`, `ADMIN`)
- `description` `VARCHAR(255)` NULL
- `is_active` `BOOLEAN` NOT NULL DEFAULT `TRUE`
- `created_at` `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`

##### `person_role`
- `id` `BIGSERIAL` PK
- `person_id` `BIGINT` NOT NULL FK -> `person(id)` ON DELETE CASCADE
- `role_id` `BIGINT` NOT NULL FK -> `role(id)` ON DELETE RESTRICT
- `assigned_at` `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`
- Unique constraint:
  - `UNIQUE(person_id, role_id)`

##### `category`
- `id` `BIGSERIAL` PK
- `name` `VARCHAR(100)` NOT NULL
- `description` `VARCHAR(255)` NULL
- `is_active` `BOOLEAN` NOT NULL DEFAULT `TRUE`
- `created_at` `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`
- `updated_at` `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`
- Constraints/indexes:
  - non-blank `name`
  - unique normalized name index: `UNIQUE (LOWER(BTRIM(name)))`

##### `citizen_request`
- `id` `BIGSERIAL` PK
- `title` `VARCHAR(100)` NOT NULL
- `description` `TEXT` NOT NULL
- `category_id` `BIGINT` NOT NULL FK -> `category(id)`
- `priority` `request_priority` NOT NULL (`LOW|MEDIUM|HIGH|CRITICAL`)
- `status` `request_status` NOT NULL DEFAULT `NEW`
- `created_by_person_id` `BIGINT` NOT NULL FK -> `person(id)` ON DELETE RESTRICT
- `assigned_to_person_id` `BIGINT` NULL FK -> `person(id)` ON DELETE SET NULL
- `resolved_at` `TIMESTAMPTZ` NULL
- `closed_at` `TIMESTAMPTZ` NULL
- `created_at` `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`
- `updated_at` `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`
- Constraints:
  - non-blank `title`, `description`
  - `resolved_at` required when status in (`RESOLVED`, `CLOSED`)
  - `closed_at` required when status = `CLOSED`

##### `request_comment`
- `id` `BIGSERIAL` PK
- `request_id` `BIGINT` NOT NULL FK -> `citizen_request(id)` ON DELETE CASCADE
- `author_person_id` `BIGINT` NOT NULL FK -> `person(id)` ON DELETE RESTRICT
- `author_role_code` `VARCHAR(30)` NOT NULL (snapshot: `CITIZEN` or `WORKER`)
- `author_display_name` `VARCHAR(150)` NOT NULL
- `comment_text` `TEXT` NOT NULL
- `created_at` `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`
- Constraints:
  - non-blank `comment_text`
  - non-blank `author_display_name`

##### `request_status_history`
- `id` `BIGSERIAL` PK
- `request_id` `BIGINT` NOT NULL FK -> `citizen_request(id)` ON DELETE CASCADE
- `from_status` `request_status` NULL
- `to_status` `request_status` NOT NULL
- `changed_by_person_id` `BIGINT` NOT NULL FK -> `person(id)` ON DELETE RESTRICT
- `change_note` `VARCHAR(255)` NULL
- `changed_at` `TIMESTAMPTZ` NOT NULL DEFAULT `NOW()`
- Constraints:
  - `from_status IS NULL OR from_status <> to_status`
  - trigger-enforced valid workflow transitions

#### Explicitly Deferred for Later
- [ ] `auth_account` (deferred; not implemented in this phase)

#### Strict Migration Rules
- [x] Never edit already-applied migration files.
- [x] Add only new numbered migrations.
- [x] Use expand -> migrate -> contract.
- [x] Add nullable new columns first.
- [x] Backfill data before adding NOT NULL constraints.
- [x] Keep old and new columns in dual-write period.
- [x] Remove legacy columns only after reconciliation and release-cycle proof.

#### Step-by-Step Tasks
- [x] 6.1 Add new identity tables (`person`, `citizen_profile`, `staff_profile`, `role`, `person_role`).
- [x] 6.2 Seed base roles (`CITIZEN`, `WORKER`, optionally `ADMIN`).
- [x] 6.3 Add nullable FK columns in existing tables:
  - `citizen_request.created_by_person_id`
  - `citizen_request.assigned_to_person_id`
  - `request_comment.author_person_id`
  - `request_status_history.changed_by_person_id`
- [x] 6.4 Backfill `person` from existing staff and citizen request data.
- [x] 6.5 Backfill profiles and role mappings.
- [x] 6.6 Backfill new FK columns in request/comment/history.
- [x] 6.7 Add backend dual-write for legacy + new identity references.
- [x] 6.8 Switch backend read-path to person/profile model with safe fallback.
- [x] 6.9 Keep new FK columns nullable in this no-auth cycle; strict NOT NULL hardening deferred to contract cycle.
- [x] 6.10 Keep legacy columns/tables for compatibility in this cycle; contract cleanup deferred.

#### Reconciliation Rules
- [x] Generate SQL reconciliation report artifacts in `database/reports/`:
  - orphan checks
  - null checks for mandatory mappings
  - row count parity checks
- [x] Resolve all anomalies before contract phase.

#### Test Gates
- [x] Gate A: migrations apply on clean clone.
- [x] Gate B: backfill coverage is 100% for mapped rows.
- [x] Gate C: dual-write parity tests pass.
- [x] Gate D: full regression (`check_all`) passes on new read-path.
- [x] Gate E: fresh-clone simulation + backup/restore drill passes.

### Phase 7: Documentation & Submission
- [ ] Update `docs/specification.md` with assumptions, domain model, and migration rationale.
- [ ] Update `docs/architecture.md` with scalable identity design and alternatives.
- [ ] Update `docs/ai-usage.md` with workflow and prompts.
- [ ] Update `README.md` run/reset/test instructions.
- [ ] Final package readiness check.

## Acceptance Criteria
- [ ] Request lifecycle works end-to-end with enforced workflow.
- [ ] Category management works with worker-only modifications.
- [ ] Closed requests remain immutable.
- [ ] Status and comments remain fully auditable.
- [ ] Role behavior works without auth implementation.
- [ ] DB refactor plan is strict, staged, and reversible.
- [ ] Project runs and tests reproducibly on fresh setup.
