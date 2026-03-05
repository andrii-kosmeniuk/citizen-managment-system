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

## Implementation Checklist (Bullet Points)

### Foundation
- [ ] Create project structure (`backend/`, `frontend/`, `database/`, `docs/`, `scripts/`).
- [ ] Define environment config and reproducible startup.
- [ ] Set up PostgreSQL schema and migration process.

### Backend
- [ ] Implement domain models: requests, categories, staff users, comments, status history.
- [ ] Implement REST endpoints for:
  - [ ] Categories (list/create/update/deactivate)
  - [ ] Requests (create/list/detail)
  - [ ] Claim request
  - [ ] Change status
  - [ ] Add comment
- [ ] Enforce workflow and business constraints server-side.
- [ ] Persist status transition history for every status update.

### Frontend
- [ ] Build request list page.
- [ ] Add filters (status/category/priority).
- [ ] Build request detail page.
- [ ] Add status update UI.
- [ ] Add comment UI.
- [ ] Connect frontend to backend REST APIs.

### Testing & Quality
- [ ] Add unit tests for workflow and core business logic.
- [ ] Add integration tests for core API flow.
- [ ] Add basic GUI/e2e tests for key user journey.
- [ ] Document run/test commands.

### Documentation
- [ ] Write `docs/specification.md` with SDD artifacts.
- [ ] Write `docs/architecture.md` with decisions and alternatives.
- [ ] Write `docs/ai-usage.md` describing AI-assisted development process.
- [ ] Keep README up to date with setup/run/test instructions.

## Acceptance Criteria
- [ ] Users can create requests with all required fields.
- [ ] Categories are manageable.
- [ ] Staff can claim requests, update status, and add comments.
- [ ] Closed requests cannot be modified.
- [ ] Status history is recorded and queryable.
- [ ] Dashboard supports list/filter/detail/status/comment operations.
- [ ] Project runs reproducibly and tests are executable.
